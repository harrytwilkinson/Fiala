import { useSyncExternalStore } from "react";

// Remembers whether this device has completed the first-run walkthrough.
// Bump the version to show an updated walkthrough to everyone again.

export const ONBOARDING_KEY = "peptide-compass:onboarded:v1";

const listeners = new Set<() => void>();
let forcedOpen = false;

function storageGet(): string | null {
  try {
    return localStorage.getItem(ONBOARDING_KEY);
  } catch {
    return null;
  }
}

export function hasCompletedOnboarding(): boolean {
  return storageGet() !== null;
}

export function completeOnboarding(now = new Date()) {
  try {
    localStorage.setItem(ONBOARDING_KEY, now.toISOString());
  } catch {
    // Storage blocked: the walkthrough will show again next visit, which is harmless.
  }
  forcedOpen = false;
  listeners.forEach((l) => l());
}

/** Re-open the walkthrough on demand (e.g. "How it works" on the home screen). */
export function replayOnboarding() {
  forcedOpen = true;
  listeners.forEach((l) => l());
}

function snapshot(): boolean {
  return forcedOpen || !hasCompletedOnboarding();
}

export function useOnboardingOpen(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    snapshot,
    () => false,
  );
}
