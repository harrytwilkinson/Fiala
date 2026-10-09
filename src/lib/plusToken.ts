// Fiala Plus unlock codes: a small payload signed with Ed25519.
//
// The signing key is derived from a long secret (PLUS_SIGNING_SECRET) that only
// the unlock service knows; the app ships just the public key, so it can check a
// code offline but can't make one. Shared by the app and worker/ (no app imports).

import * as ed from "@noble/ed25519";
import { sha256 } from "@noble/hashes/sha256";
import { sha512 } from "@noble/hashes/sha512";

ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

const PREFIX = "FIALA1.";

export interface PlusClaim {
  /** End of the Stripe Checkout session id, so support can match a code to a payment. */
  ref: string;
  /** Buyer's email, if Stripe has one (shown to the user only). */
  email?: string;
  /** Issued at, seconds since 1970. */
  iat: number;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function unb64url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
export const fromHex = (h: string) => Uint8Array.from(h.match(/../g) ?? [], (x) => parseInt(x, 16));

/** The Ed25519 private key (32-byte seed) for a signing secret. */
export const privateKeyFor = (secret: string) => sha256(enc.encode(secret));
export const publicKeyFor = (secret: string) => toHex(ed.getPublicKey(privateKeyFor(secret)));

export function signClaim(claim: PlusClaim, secret: string): string {
  const body = enc.encode(JSON.stringify(claim));
  return `${PREFIX}${b64url(body)}.${b64url(ed.sign(body, privateKeyFor(secret)))}`;
}

/** The claim inside a valid code, or null if the code is malformed or not signed by Fiala. */
export function verifyCode(code: string, publicKeyHex: string): PlusClaim | null {
  const trimmed = code.trim().replace(/\s+/g, "");
  if (!publicKeyHex || !trimmed.startsWith(PREFIX)) return null;
  const [body, sig] = trimmed.slice(PREFIX.length).split(".");
  if (!body || !sig) return null;
  try {
    const bytes = unb64url(body);
    if (!ed.verify(unb64url(sig), bytes, fromHex(publicKeyHex))) return null;
    const claim = JSON.parse(dec.decode(bytes));
    return typeof claim?.ref === "string" && typeof claim?.iat === "number" ? claim : null;
  } catch {
    return null;
  }
}
