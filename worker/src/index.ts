// Fiala Plus unlock service (Cloudflare Worker).
//
// After someone pays on Stripe Checkout, Stripe sends them back to Fiala with a
// checkout session id. The app asks this worker to "claim" it: the worker checks
// with Stripe that the session is paid and is for Fiala Plus, then returns a
// signed unlock code the app can verify offline. It stores nothing.

import { signClaim } from "../../src/lib/plusToken.ts";

export interface Env {
  /** Stripe restricted key with read access to Checkout Sessions. */
  STRIPE_SECRET_KEY: string;
  /** Long random secret the Ed25519 signing key is derived from. */
  PLUS_SIGNING_SECRET: string;
  /** Stripe product id for Fiala Plus (prod_…). Optional, but recommended. */
  STRIPE_PRODUCT_ID?: string;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS } });

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
