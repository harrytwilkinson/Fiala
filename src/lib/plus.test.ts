import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handle } from "../../worker/src/index";
import { publicKeyFor, signClaim, verifyCode } from "./plusToken";

const SECRET = "test-signing-secret-that-is-long-enough-123";
const PUBLIC = publicKeyFor(SECRET);

describe("unlock codes", () => {
  it("verify when signed with the matching key, and carry the claim", () => {
    const code = signClaim({ ref: "abc123", email: "a@b.c", iat: 1_800_000_000 }, SECRET);
    expect(code.startsWith("FIALA1.")).toBe(true);
    expect(verifyCode(code, PUBLIC)).toEqual({ ref: "abc123", email: "a@b.c", iat: 1_800_000_000 });
    expect(verifyCode(`  ${code.slice(0, 40)}\n${code.slice(40)} `, PUBLIC)).not.toBeNull(); // pasted with line breaks
  });

  it("reject forged, tampered or malformed codes", () => {
    const code = signClaim({ ref: "abc123", iat: 1 }, SECRET);
    expect(verifyCode(signClaim({ ref: "abc123", iat: 1 }, "some-other-secret-that-is-long-enough"), PUBLIC)).toBeNull();
    const [, body, sig] = code.split(".");
    const forgedBody = btoa(JSON.stringify({ ref: "zzz", iat: 1 })).replace(/=+$/, "");
    expect(verifyCode(`FIALA1.${forgedBody}.${sig}`, PUBLIC)).toBeNull();
    expect(verifyCode(`FIALA1.${body}`, PUBLIC)).toBeNull();
    expect(verifyCode("hello", PUBLIC)).toBeNull();
    expect(verifyCode(code, "")).toBeNull();
  });
});

describe("unlock service (worker)", () => {
  const env = { STRIPE_SECRET_KEY: "rk_test_x", PLUS_SIGNING_SECRET: SECRET, STRIPE_PRODUCT_ID: "prod_plus" };
  const session = (over: object = {}) => ({
    id: "cs_test_a1b2c3d4e5f6g7h8i9",
    status: "complete",
    payment_status: "paid",
    customer_details: { email: "buyer@example.com" },
    line_items: { data: [{ price: { product: "prod_plus" } }] },
    ...over,
  });
  const stripe = (status: number, body: object) => vi.fn(async () => new Response(JSON.stringify(body), { status }));
  const claim = (id: string, fetchImpl: typeof fetch, e = env) => handle(new Request(`https://plus.getfiala.com/claim?session_id=${id}`), e, fetchImpl);

  it("returns a verifiable code for a paid Fiala Plus session", async () => {
    const fetchImpl = stripe(200, session());
    const res = await claim("cs_test_a1b2c3d4e5f6g7h8i9", fetchImpl);
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    const { code } = (await res.json()) as { code: string };
    expect(verifyCode(code, PUBLIC)).toMatchObject({ ref: "d4e5f6g7h8i9", email: "buyer@example.com" });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.stripe.com/v1/checkout/sessions/cs_test_a1b2c3d4e5f6g7h8i9?expand[]=line_items");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer rk_test_x");
  });

  it("refuses unpaid, unknown, other-product and malformed sessions", async () => {
    const statusOf = async (id: string, f: typeof fetch) => (await claim(id, f)).status;
    expect(await statusOf("cs_test_a1b2c3d4e5f6g7h8i9", stripe(200, session({ payment_status: "unpaid", status: "open" })))).toBe(402);
    expect(await statusOf("cs_test_a1b2c3d4e5f6g7h8i9", stripe(404, { error: {} }))).toBe(404);
    expect(await statusOf("cs_test_a1b2c3d4e5f6g7h8i9", stripe(200, session({ line_items: { data: [{ price: { product: "prod_other" } }] } })))).toBe(403);
    expect(await statusOf("cs_test_a1b2c3d4e5f6g7h8i9", stripe(500, {}))).toBe(502);
    const never = vi.fn();
    expect(await statusOf("../../v1/customers", never as unknown as typeof fetch)).toBe(400);
    expect(never).not.toHaveBeenCalled();
  });

  it("answers CORS preflight and reports missing configuration", async () => {
    expect((await handle(new Request("https://plus.getfiala.com/claim", { method: "OPTIONS" }), env)).status).toBe(204);
    expect((await claim("cs_test_a1b2c3d4e5f6g7h8i9", stripe(200, session()), { ...env, STRIPE_SECRET_KEY: "" })).status).toBe(503);
  });
});

describe("app unlock", () => {
  beforeEach(() => {
    const data = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("unlocks from a purchase, survives a reload, and can be removed", async () => {
    vi.stubEnv("VITE_PLUS_PUBLIC_KEY", PUBLIC);
    vi.resetModules();
    const plus = await import("./plus");
    const code = signClaim({ ref: "r", email: "x@y.z", iat: 1 }, SECRET);
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ code }), { status: 200 }));
    await plus.claimPurchase("cs_test_123", fetchImpl);
    expect(plus.hasPlus()).toBe(true);
    expect(String((fetchImpl.mock.calls[0] as unknown[])[0])).toBe("https://plus.getfiala.com/claim?session_id=cs_test_123");

    vi.resetModules();
    const reloaded = await import("./plus");
    expect(reloaded.hasPlus()).toBe(true); // read back from storage and re-verified

    reloaded.removePlus();
    expect(reloaded.hasPlus()).toBe(false);
  });

  it("explains failures and rejects bad codes", async () => {
    vi.stubEnv("VITE_PLUS_PUBLIC_KEY", PUBLIC);
    vi.resetModules();
    const plus = await import("./plus");
    await expect(plus.claimPurchase("cs_test_1", vi.fn(async () => new Response(JSON.stringify({ error: "unpaid" }), { status: 402 })))).rejects.toThrow(/hasn't completed/);
    await expect(plus.claimPurchase("cs_test_1", vi.fn(async () => Promise.reject(new TypeError("offline"))))).rejects.toThrow(/Couldn't reach/);
    expect(() => plus.unlockWithCode("FIALA1.nope.nope")).toThrow(plus.LicenceError);
    expect(plus.hasPlus()).toBe(false);
  });
});
