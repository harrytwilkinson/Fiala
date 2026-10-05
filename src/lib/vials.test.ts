import { describe, expect, it } from "vitest";
import type { DoseEntry } from "./doseLog";
import { defaultVialFor, doseMg, vialStatus, type Vial } from "./vials";

const vial: Vial = {
  id: "v1",
  peptideId: "bpc-157",
  peptideName: "BPC-157",
  vialMg: 5,
  waterMl: 2,
  mixedOn: "2026-10-01",
  discardAfterDays: 28,
  finished: false,
};

function dose(amount: number, unit: DoseEntry["unit"], takenAt: string, vialId = "v1"): DoseEntry {
  return { id: takenAt, peptideId: "bpc-157", peptideName: "BPC-157", amount, unit, takenAt, vialId };
}

describe("doseMg", () => {
  it("converts each unit to mg", () => {
    expect(doseMg({ amount: 250, unit: "mcg" }, vial)).toBeCloseTo(0.25);
    expect(doseMg({ amount: 0.5, unit: "mg" }, vial)).toBeCloseTo(0.5);
    // 2.5 mg/mL, 10 units = 0.1 mL = 0.25 mg
    expect(doseMg({ amount: 10, unit: "units" }, vial)).toBeCloseTo(0.25);
  });
});

describe("vialStatus", () => {
  it("tracks remaining peptide and doses left from logged doses", () => {
    const entries = [dose(10, "units", "2026-10-03T08:00:00Z"), dose(250, "mcg", "2026-10-02T08:00:00Z"), dose(1, "mg", "2026-10-02T09:00:00Z", "other")];
    const s = vialStatus(vial, entries, "2026-10-05");
    expect(s.dosesLogged).toBe(2);
    expect(s.usedMg).toBeCloseTo(0.5);
    expect(s.remainingMg).toBeCloseTo(4.5);
    expect(s.dosesLeft).toBe(18);
    expect(s.daysSinceMixed).toBe(4);
    expect(s.discardOn).toBe("2026-10-29");
    expect(s.daysUntilDiscard).toBe(24);
    expect(s.expired).toBe(false);
    expect(s.low).toBe(false);
  });

  it("flags expiring, expired, low and empty vials", () => {
    expect(vialStatus(vial, [], "2026-10-27").expiringSoon).toBe(true);
    expect(vialStatus(vial, [], "2026-10-30").expired).toBe(true);

    const nearlyEmpty = [dose(2, "mg", "2026-10-03T08:00:00Z"), dose(2, "mg", "2026-10-02T08:00:00Z")];
    const s = vialStatus(vial, nearlyEmpty, "2026-10-05");
    expect(s.remainingMg).toBeCloseTo(1);
    expect(s.dosesLeft).toBe(0);
    expect(s.low).toBe(true);

    const over = vialStatus(vial, [dose(6, "mg", "2026-10-03T08:00:00Z")], "2026-10-05");
    expect(over.remainingMg).toBe(0);
    expect(over.empty).toBe(true);
    expect(over.low).toBe(false);
  });

  it("has no dose estimate before any dose is logged", () => {
    expect(vialStatus(vial, [], "2026-10-05").dosesLeft).toBeUndefined();
  });
});

describe("defaultVialFor", () => {
  it("picks the oldest active vial of that peptide", () => {
    const newer = { ...vial, id: "v2", mixedOn: "2026-10-04" };
    const finished = { ...vial, id: "v0", mixedOn: "2026-09-01", finished: true };
    expect(defaultVialFor([newer, vial, finished], "BPC-157")?.id).toBe("v1");
    expect(defaultVialFor([newer], "TB-500")).toBeUndefined();
  });
});
