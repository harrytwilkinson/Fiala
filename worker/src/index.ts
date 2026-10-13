// Fiala Plus unlock service (Cloudflare Worker).
//
// GET /buy starts a Stripe Checkout for the Fiala Plus product (its default
// price, so the price is set in Stripe) and redirects the buyer there.
// After someone pays, Stripe sends them back to Fiala with a
// checkout session id. The app asks this worker to "claim" it: the worker checks
// with Stripe that the session is paid and is for Fiala Plus, then returns a
// signed unlock code the app can verify offline. It stores nothing.

import { signClaim } from "../../src/lib/plusToken.ts";

export interface Env {
  /** Stripe restricted key: Checkout Sessions write, Products and Prices read. */
  STRIPE_SECRET_KEY: string;
  /** Long random secret the Ed25519 signing key is derived from. */
  PLUS_SIGNING_SECRET: string;
  /** Stripe product id for Fiala Plus (prod_…); set in wrangler.toml. */
  STRIPE_PRODUCT_ID: string;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS } });

const APP_PLUS = "https://getfiala.com/#/plus";

const errorPage = (status: number, message: string) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fiala Plus</title>` +
      `<body style="font-family:system-ui,sans-serif;max-width:32rem;margin:3rem auto;padding:0 1rem;line-height:1.5">` +
      `<h1>Checkout isn't available right now</h1><p>${message}</p><p><a href="${APP_PLUS}">Back to Fiala</a></p>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );

/** Creates a Checkout session for Fiala Plus and redirects to it. */
async function buy(env: Env, fetchImpl: typeof fetch): Promise<Response> {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRODUCT_ID) return errorPage(503, "Fiala Plus isn't on sale yet. Please try again later.");
  const auth = { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` };
  const productRes = await fetchImpl(`https://api.stripe.com/v1/products/${encodeURIComponent(env.STRIPE_PRODUCT_ID)}`, { headers: auth });
  const product = productRes.ok ? ((await productRes.json()) as { default_price?: string | { id?: string } | null }) : null;
  const price = typeof product?.default_price === "string" ? product.default_price : product?.default_price?.id;
  if (!price) return errorPage(502, "We couldn't reach the payment service. Please try again in a minute.");

  const form = new URLSearchParams({
    mode: "payment",
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
    success_url: `${APP_PLUS}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: APP_PLUS,
  });
  const res = await fetchImpl("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  const session = res.ok ? ((await res.json()) as { url?: string }) : null;
  if (!session?.url) return errorPage(502, "We couldn't reach the payment service. Please try again in a minute.");
  return new Response(null, { status: 303, headers: { Location: session.url, "Cache-Control": "no-store" } });
}

const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;

interface CheckoutSession {
  id: string;
  status?: string;
  payment_status?: string;
  customer_details?: { email?: string | null } | null;
  line_items?: { data?: { price?: { product?: string | { id?: string } } | null }[] };
}

export async function handle(request: Request, env: Env, fetchImpl: typeof fetch = fetch): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const url = new URL(request.url);
  if (url.pathname === "/") return json(200, { service: "fiala-plus", ok: true });
  if (url.pathname === "/buy" && request.method === "GET") return buy(env, fetchImpl);
  if (url.pathname !== "/claim" || request.method !== "GET") return json(404, { error: "not_found" });
  if (!env.STRIPE_SECRET_KEY || !env.PLUS_SIGNING_SECRET) return json(503, { error: "not_configured" });

  const sessionId = url.searchParams.get("session_id") ?? "";
  if (!SESSION_ID.test(sessionId)) return json(400, { error: "bad_session" });

  const res = await fetchImpl(`https://api.stripe.com/v1/checkout/sessions/${sessionId}?expand[]=line_items`, {
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
  });
  if (res.status === 404) return json(404, { error: "unknown_session" });
  if (!res.ok) return json(502, { error: "stripe_unavailable" });
  const session = (await res.json()) as CheckoutSession;

  const paid = session.status === "complete" && (session.payment_status === "paid" || session.payment_status === "no_payment_required");
  if (!paid) return json(402, { error: "unpaid" });

  if (env.STRIPE_PRODUCT_ID) {
    const products = (session.line_items?.data ?? []).map((li) => (typeof li.price?.product === "string" ? li.price.product : li.price?.product?.id));
    if (!products.includes(env.STRIPE_PRODUCT_ID)) return json(403, { error: "wrong_product" });
  }

  const email = session.customer_details?.email ?? undefined;
  const code = signClaim({ ref: session.id.slice(-12), email, iat: Math.floor(Date.now() / 1000) }, env.PLUS_SIGNING_SECRET);
  return json(200, { code });
}

export default { fetch: (request: Request, env: Env) => handle(request, env) };
