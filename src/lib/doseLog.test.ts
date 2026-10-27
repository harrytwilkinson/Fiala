import { describe, expect, it } from "vitest";
import { suggestSite } from "./doseLog";

describe("suggestSite", () => {
  it("waits for some site history", () => {
    expect(suggestSite(new Map())).toBeUndefined();
  });

  it("prefers sites never used, in list order", () => {
    expect(suggestSite(new Map([["Abdomen – left", 1]]))).toBe("Abdomen – right");
  });

  it("otherwise picks the site rested longest", () => {
    const all = new Map([
      ["Abdomen – left", 1],
      ["Abdomen – right", 4],
      ["Thigh – left", 9],
      ["Thigh – right", 2],
      ["Upper arm – left", 3],
      ["Upper arm – right", 5],
      ["Glute – left", 6],
      ["Glute – right", 0],
    ]);
    expect(suggestSite(all)).toBe("Thigh – left");
  });
});
