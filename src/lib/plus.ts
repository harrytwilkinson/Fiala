import { useSyncExternalStore } from "react";
import { platform } from "./platform";
import { PLUS } from "./site";

// Fiala Plus licence. Bought through Lemon Squeezy, which emails a licence key.
// The key is checked with Lemon Squeezy's licence API when it's entered and
// about once a week after that. Fiala keeps working offline in between, and a
// failed network check never locks someone out: only a definite "invalid" does.

const API = "https://api.lemonsqueezy.com/v1/licenses";
const KEY = "fiala:plus:v1";
const REVALIDATE_MS = 7 * 86_400_000;

export interface PlusLicence {
  key: string;
  instanceId: string;
  activatedAt: string;
  checkedAt: string;
  /** Email the purchase was made with, as Lemon Squeezy reports it (shown to the user only). */
  customerEmail?: string;
}

function read(): PlusLicence | null {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return raw && typeof raw.key === "string" && typeof raw.instanceId === "string" ? raw : null;
  } catch {
    return null;
  }
}

let licence = read();
const listeners = new Set<() => void>();

function save(next: PlusLicence | null) {
  licence = next;
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next));
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
export const plusAvailable = () => PLUS.checkoutUrl !== "";

export class LicenceError extends Error {}

interface LicenceResponse {
  activated?: boolean;
  valid?: boolean;
  error?: string | null;
  license_key?: { status?: string };
  instance?: { id?: string } | null;
  meta?: { store_id?: number; product_id?: number; customer_email?: string };
}

async function call(action: "activate" | "validate" | "deactivate", body: Record<string, string>): Promise<LicenceResponse & { status: number }> {
  const res = await fetch(`${API}/${action}`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  // Lemon Squeezy answers 4xx with a JSON body explaining the problem.
  const json = (await res.json().catch(() => ({}))) as LicenceResponse;
  // Rate limits and server errors aren't answers about the key.
  if (res.status === 429 || res.status >= 500 || (!res.ok && !json.error)) throw new Error(`HTTP ${res.status}`);
  return { ...json, status: res.status };
}

/** True when the key belongs to this store and product (when those are configured). */
export function isFialaPlusKey(meta: LicenceResponse["meta"]): boolean {
  if (PLUS.storeId && meta?.store_id !== PLUS.storeId) return false;
  if (PLUS.productId && meta?.product_id !== PLUS.productId) return false;
  return true;
}

export async function activatePlus(rawKey: string): Promise<void> {
  const key = rawKey.trim();
  if (!/^[A-Za-z0-9-]{8,}$/.test(key)) throw new LicenceError("That doesn't look like a licence key. Copy it from your purchase email.");
  let res: LicenceResponse;
  try {
    res = await call("activate", { license_key: key, instance_name: `Fiala on ${platform}` });
  } catch {
    throw new LicenceError("Couldn't reach the licence server. Check your connection and try again.");
  }
  if (!res.activated || !res.instance?.id) {
    const msg = res.error ?? "";
    if (/limit/i.test(msg)) throw new LicenceError("This key is already in use on the maximum number of devices. Remove it from another device first.");
    throw new LicenceError(msg ? `That key couldn't be activated: ${msg}` : "That key couldn't be activated.");
  }
  if (!isFialaPlusKey(res.meta)) {
    await call("deactivate", { license_key: key, instance_id: res.instance.id }).catch(() => undefined);
    throw new LicenceError("That key is for a different product.");
  }
  const now = new Date().toISOString();
  save({ key, instanceId: res.instance.id, activatedAt: now, checkedAt: now, customerEmail: res.meta?.customer_email });
}

/** Re-check the key about once a week. Network failures keep Plus unlocked. */
export async function revalidatePlus(force = false): Promise<void> {
  const current = licence;
  if (!current) return;
  if (!force && Date.now() - Date.parse(current.checkedAt) < REVALIDATE_MS) return;
  let res: LicenceResponse;
  try {
    res = await call("validate", { license_key: current.key, instance_id: current.instanceId });
  } catch {
    return; // offline or server trouble: try again next time
  }
  // A definite answer from Lemon Squeezy: refunded, disabled, or removed from this device.
  if (res.valid === false) save(null);
  else if (res.valid) save({ ...current, checkedAt: new Date().toISOString() });
}

/** Free up this device's activation so the key can be used elsewhere. */
export async function deactivatePlus(): Promise<void> {
  const current = licence;
  if (!current) return;
  try {
    await call("deactivate", { license_key: current.key, instance_id: current.instanceId });
  } catch {
    throw new LicenceError("Couldn't reach the licence server, so this device is still counted. Try again when you're online.");
  }
  save(null);
}
