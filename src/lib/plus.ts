import { useSyncExternalStore } from "react";
import { verifyCode, type PlusClaim } from "./plusToken";
import { PLUS } from "./site";

// Fiala Plus unlock. Bought on Stripe Checkout, which sends the buyer back to
// #/plus?session_id=… . The app swaps that for a signed unlock code from the
// Fiala unlock service (worker/), then keeps Plus unlocked offline for good:
// the code is checked on the device against the public key built into the app.

/** Ed25519 public key for unlock codes, injected at build time (see scripts/plus-public-key.ts). */
export const PLUS_PUBLIC_KEY: string = import.meta.env.VITE_PLUS_PUBLIC_KEY ?? "";
export const CLAIM_URL = "https://plus.getfiala.com/claim";
const KEY = "fiala:plus:v2";

export interface PlusLicence {
  code: string;
  claim: PlusClaim;
  unlockedAt: string;
}

function read(): PlusLicence | null {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    const claim = raw && typeof raw.code === "string" ? verifyCode(raw.code, PLUS_PUBLIC_KEY) : null;
    return claim ? { code: raw.code, claim, unlockedAt: String(raw.unlockedAt ?? "") } : null;
  } catch {
    return null;
  }
}

let licence = read();
const listeners = new Set<() => void>();

function save(next: PlusLicence | null) {
  licence = next;
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify({ code: next.code, unlockedAt: next.unlockedAt }));
    else localStorage.removeItem(KEY);
  } catch {
    // Storage blocked: the unlock lasts for this session.
  }
  listeners.forEach((l) => l());
}

export function usePlus(): PlusLicence | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => licence,
  );
}

export const hasPlus = () => licence !== null;
/** Plus can be bought only once checkout and the public key are both set up. */
export const plusAvailable = () => PLUS.checkoutUrl !== "" && PLUS_PUBLIC_KEY !== "";

export class LicenceError extends Error {}

/** Unlock with a code (pasted, or returned by the unlock service). */
export function unlockWithCode(code: string): PlusLicence {
  const claim = verifyCode(code, PLUS_PUBLIC_KEY);
  if (!claim) throw new LicenceError("That unlock code isn't valid. Copy the whole code, starting with FIALA1.");
  const next = { code: code.trim().replace(/\s+/g, ""), claim, unlockedAt: new Date().toISOString() };
  save(next);
  return next;
}

const CLAIM_ERRORS: Record<string, string> = {
  unpaid: "That payment hasn't completed yet. If you've just paid, wait a moment and try again.",
  unknown_session: "We couldn't find that purchase. If you were charged, email support@getfiala.com.",
  wrong_product: "That purchase isn't for Fiala Plus.",
  bad_session: "That link isn't a valid purchase link.",
};

/** Turn a Stripe Checkout session id (from the post-payment redirect) into an unlock. */
export async function claimPurchase(sessionId: string, fetchImpl: typeof fetch = fetch): Promise<PlusLicence> {
  let res: Response;
  try {
    res = await fetchImpl(`${CLAIM_URL}?session_id=${encodeURIComponent(sessionId)}`);
  } catch {
    throw new LicenceError("Couldn't reach the unlock service. Check your connection and try again; you won't be charged twice.");
  }
  const body = (await res.json().catch(() => ({}))) as { code?: string; error?: string };
  if (res.ok && body.code) return unlockWithCode(body.code);
  throw new LicenceError(CLAIM_ERRORS[body.error ?? ""] ?? "Something went wrong unlocking Plus. Please try again, or email support@getfiala.com.");
}

/** Forget the unlock on this device (the code still works elsewhere). */
export const removePlus = () => save(null);
