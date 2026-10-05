import { describe, expect, it } from "vitest";
import type { DoseEntry } from "./doseLog";
import { planReminders, reminderId } from "./reminders";
import type { Schedule } from "./schedules";

const weekly: Schedule = {
  id: "s1",
  peptideId: "bpc-157",
  peptideName: "BPC-157",
  amount: 250,
  unit: "mcg",
  frequency: { kind: "weekly", days: [1, 4] }, // Mon, Thu
  time: "08:30",
  startDate: "2026-10-05", // Monday
  active: true,
};

const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);

describe("planReminders", () => {
  it("plans upcoming doses at the scheduled local time", () => {
    const plan = planReminders([weekly], [], at(2026, 10, 5, 7, 0), 7);
    expect(plan.map((r) => [r.at.getDate(), r.at.getHours(), r.at.getMinutes()])).toEqual([
      [5, 8, 30],
      [8, 8, 30],
      [12, 8, 30],
    ]);
    expect(plan[0].body).toBe("BPC-157 · 250 mcg");
  });

  it("skips times that have already passed today", () => {
    const plan = planReminders([weekly], [], at(2026, 10, 5, 9, 0), 7);
    expect(plan[0].at.getDate()).toBe(8);
  });

  it("skips today's reminder once the dose is logged", () => {
    const taken: DoseEntry = { id: "d", peptideId: "bpc-157", peptideName: "BPC-157", amount: 250, unit: "mcg", takenAt: at(2026, 10, 5, 7, 45).toISOString(), scheduleId: "s1" };
    const plan = planReminders([weekly], [taken], at(2026, 10, 5, 7, 50), 7);
    expect(plan[0].at.getDate()).toBe(8);
  });

  it("ignores paused and ended schedules and respects interval schedules", () => {
    const paused = { ...weekly, id: "p", active: false };
    const ended = { ...weekly, id: "e", endDate: "2026-10-01" };
    const every3 = { ...weekly, id: "i", frequency: { kind: "interval" as const, everyDays: 3 } };
    const plan = planReminders([paused, ended, every3], [], at(2026, 10, 5, 0, 0), 9);
    expect(plan.every((r) => r.scheduleId === "i")).toBe(true);
    expect(plan.map((r) => r.at.getDate())).toEqual([5, 8, 11, 14]);
  });

  it("stays under the pending-notification limit, keeping the soonest", () => {
    const daily = (id: string, time: string): Schedule => ({ ...weekly, id, time, frequency: { kind: "interval", everyDays: 1 } });
    const plan = planReminders([daily("a", "08:00"), daily("b", "12:00"), daily("c", "20:00")], [], at(2026, 10, 5, 0, 0), 30, 60);
    expect(plan).toHaveLength(60);
    for (let i = 1; i < plan.length; i++) expect(plan[i].at.getTime()).toBeGreaterThanOrEqual(plan[i - 1].at.getTime());
  });

  it("uses stable, unique, positive ids", () => {
    expect(reminderId("s1", "2026-10-05")).toBe(reminderId("s1", "2026-10-05"));
    const plan = planReminders([weekly, { ...weekly, id: "s2" }], [], at(2026, 10, 5, 0, 0), 14);
    const ids = plan.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toBeGreaterThan(0);
      expect(id).toBeLessThanOrEqual(0x7fffffff);
    }
  });
});
