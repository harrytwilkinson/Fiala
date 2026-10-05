import { beforeEach, describe, expect, it, vi } from "vitest";

function stubStorage() {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  });
  return data;
}

describe("onboarding flag", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("is incomplete on a fresh device and complete after finishing", async () => {
    const data = stubStorage();
    const m = await import("./onboarding");
    expect(m.hasCompletedOnboarding()).toBe(false);
    m.completeOnboarding(new Date("2026-10-05T10:00:00Z"));
    expect(m.hasCompletedOnboarding()).toBe(true);
    expect(data.get(m.ONBOARDING_KEY)).toBe("2026-10-05T10:00:00.000Z");
  });

  it("does not throw when storage is blocked", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });
    const m = await import("./onboarding");
    expect(m.hasCompletedOnboarding()).toBe(false);
    expect(() => m.completeOnboarding()).not.toThrow();
  });
});
