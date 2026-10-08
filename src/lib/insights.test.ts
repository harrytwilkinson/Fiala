import { describe, expect, it } from "vitest";
import type { DoseEntry } from "./doseLog";
import { adherence, doseChanges, spend } from "./insights";
import type { Schedule } from "./schedules";
import type { Vial } from "./vials";

const dose = (id: string, takenAt: string, amount = 0.5, extra: Partial<DoseEntry> = {}): DoseEntry => ({
  id,
  peptideId: "semaglutide",
  peptideName: "Semaglutide",
  amount,
  unit: "mg",
  takenAt,
  ...extra,
});

describe("adherence", () => {
  // Every Monday from Mon 7 Sep 2026.
  const weekly: Schedule = { id: "s", peptideId: "semaglutide", peptideName: "Semaglutide", amount: 0.5, unit: "mg", frequency: { kind: "weekly", days: [1] }, time: "08:00", startDate: "2026-09-07", active: true };

  it("counts due days, doses logged, misses and the current streak", () => {
    const entries = [dose("d4", "2026-10-05T09:00:00"), dose("d3", "2026-09-28T09:00:00"), dose("d1", "2026-09-07T09:00:00")];
    const a = adherence(weekly, entries, "2026-09-07", "2026-10-05", "2026-10-06");
    expect(a.due).toBe(5); // 7, 14, 21, 28 Sep and 5 Oct
    expect(a.taken).toBe(3);
    expect(a.rate).toBeCloseTo(0.6);
    expect(a.streak).toBe(2);
    expect(a.missed).toEqual(["2026-09-21", "2026-09-14"]);
  });

  it("doesn't count today as missed before it's logged", () => {
    const a = adherence(weekly, [], "2026-10-05", "2026-10-05", "2026-10-05");
    expect(a.due).toBe(0);
    expect(a.rate).toBeNull();
  });
});

describe("dose changes", () => {
  it("finds each change and the side effects in the next 3 days", () => {
    const entries = [dose("c", "2026-10-05T09:00:00Z", 1), dose("b", "2026-09-28T09:00:00Z", 0.5), dose("a", "2026-09-21T09:00:00Z", 0.5)];
    const symptoms = [
      { id: "x", at: "2026-10-06T09:00:00Z", symptom: "Nausea", severity: 2 as const },
      { id: "y", at: "2026-10-10T09:00:00Z", symptom: "Headache", severity: 1 as const },
    ];
    const changes = doseChanges(entries, symptoms);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ peptideName: "Semaglutide", from: "0.5 mg", to: "1 mg" });
    expect(changes[0].after.map((s) => s.symptom)).toEqual(["Nausea"]);
  });
});

describe("spend", () => {
  const vial = (id: string, mixedOn: string, cost?: number): Vial => ({ id, peptideId: null, peptideName: "BPC-157", vialMg: 10, waterMl: 2, mixedOn, discardAfterDays: 28, finished: false, cost });

  it("totals by month and works out cost per dose", () => {
    const vials = [vial("v1", "2026-09-03", 40), vial("v2", "2026-10-01", 50), vial("v3", "2026-10-02")];
    const entries = [dose("a", "2026-09-04T09:00:00Z", 500, { unit: "mcg", vialId: "v1", peptideName: "BPC-157" }), dose("b", "2026-09-05T09:00:00Z", 1, { vialId: "v1", peptideName: "BPC-157" })];
    const s = spend(vials, entries);
    expect(s.total).toBe(90);
    expect(s.byMonth).toEqual([
      { month: "2026-09", total: 40 },
      { month: "2026-10", total: 50 },
    ]);
    // 0.5 mg and 1 mg from a £40, 10 mg vial = £2 and £4, so £3 on average.
    expect(s.perDose).toEqual([{ peptideName: "BPC-157", cost: 3, doses: 2 }]);
    expect(spend(vials, entries, "2026-10-01").total).toBe(50);
  });
});
