import { useSyncExternalStore } from "react";
import { CURRENCIES, type Currency } from "./insights";

const KEY = "fiala:currency:v1";
const listeners = new Set<() => void>();

function read(): Currency {
  try {
    const v = localStorage.getItem(KEY);
    return CURRENCIES.includes(v as Currency) ? (v as Currency) : "GBP";
  } catch {
    return "GBP";
  }
}

let currency = read();

export function useCurrency(): Currency {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => currency,
  );
}

export function setCurrency(next: Currency) {
  currency = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // Storage blocked: lasts for this session.
  }
  listeners.forEach((l) => l());
}
