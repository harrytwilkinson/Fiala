import { afterEach, describe, expect, it, vi } from "vitest";
import { migrateKey } from "./store";

function stubStorage(initial: Record<string, string>) {
  const data = new Map(Object.entries(initial));
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  });
  return data;
}

describe("migrateKey (app rename)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("moves data from the old key to the new one", () => {
    const data = stubStorage({ "peptide-compass:doses:v1": '[{"id":"d1"}]' });
    migrateKey("peptide-compass:doses:v1", "fiala:doses:v1");
    expect(data.get("fiala:doses:v1")).toBe('[{"id":"d1"}]');
    expect(data.has("peptide-compass:doses:v1")).toBe(false);
  });

  it("never overwrites data already under the new key", () => {
    const data = stubStorage({ "peptide-compass:doses:v1": "old", "fiala:doses:v1": "new" });
    migrateKey("peptide-compass:doses:v1", "fiala:doses:v1");
    expect(data.get("fiala:doses:v1")).toBe("new");
  });

  it("does nothing when there's no old data, and survives blocked storage", () => {
    const data = stubStorage({});
    migrateKey("a", "b");
    expect(data.size).toBe(0);
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
    });
    expect(() => migrateKey("a", "b")).not.toThrow();
  });
});
