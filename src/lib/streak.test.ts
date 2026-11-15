import { describe, expect, it } from "vitest";
import type { DoseEntry } from "./doseLog";
import type { Schedule } from "./schedules";
import { doseStreak, weekProgress } from "./streak";

const daily: Schedule = { id: "s", peptideId: null, peptideName: "Test", amount: 1, unit: "mg", frequency: { kind: "interval", everyDays: 1 }, time: "08:00", startDate: "2026-01-01", active: true };
const taken = (day: number): DoseEntry => ({ id: `e${day}`, peptideId: null, peptideName: "Test", amount: 1, unit: "mg", takenAt: new Date(2026, 0, day, 12).toISOString(), scheduleId: "s" });

describe("doseStreak", () => {
  it("counts back from yesterday when today isn't done yet", () => {
    expect(doseStreak([daily], [taken(9), taken(8), taken(7)], "2026-01-10")).toBe(3);
  });
  it("includes today once it is logged", () => {
    expect(doseStreak([daily], [taken(10), taken(9)], "2026-01-10")).toBe(2);
  });
  it("stops at the first missed day", () => {
    expect(doseStreak([daily], [taken(9), taken(7), taken(6)], "2026-01-10")).toBe(1);
  });
  it("is zero with no schedules", () => {
    expect(doseStreak([], [taken(9)], "2026-01-10")).toBe(0);
  });
});

describe("weekProgress", () => {
  it("runs Monday to Sunday and leaves future days empty", () => {
    // 2026-01-07 is a Wednesday.
    const week = weekProgress([daily], [taken(5), taken(7)], "2026-01-07");
    expect(week.todayIndex).toBe(2);
    expect(week.days).toEqual([1, 0, 1, null, null, null, null]);
  });
});
