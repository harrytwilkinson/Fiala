import { describe, expect, it } from "vitest";
import type { DoseEntry } from "./doseLog";
import { describeFrequency, isDueOn, takenOn, toIcs, type Schedule } from "./schedules";

const base: Schedule = {
  id: "s1",
  peptideId: "bpc-157",
  peptideName: "BPC-157",
  amount: 250,
  unit: "mcg",
  frequency: { kind: "weekly", days: [1, 4] }, // Mon, Thu
  time: "08:30",
  startDate: "2026-10-05", // a Monday
  active: true,
};

describe("isDueOn", () => {
  it("handles weekly schedules", () => {
    expect(isDueOn(base, "2026-10-05")).toBe(true); // Mon
    expect(isDueOn(base, "2026-10-06")).toBe(false); // Tue
    expect(isDueOn(base, "2026-10-08")).toBe(true); // Thu
  });

  it("handles every-N-days schedules", () => {
    const s: Schedule = { ...base, frequency: { kind: "interval", everyDays: 3 } };
    expect(isDueOn(s, "2026-10-05")).toBe(true);
    expect(isDueOn(s, "2026-10-06")).toBe(false);
    expect(isDueOn(s, "2026-10-08")).toBe(true);
    // across a month boundary and the DST change in many zones
    expect(isDueOn(s, "2026-11-01")).toBe(true); // 27 days later
  });

  it("respects start, end and paused", () => {
    expect(isDueOn(base, "2026-09-28")).toBe(false); // Monday before start
    expect(isDueOn({ ...base, endDate: "2026-10-07" }, "2026-10-08")).toBe(false);
    expect(isDueOn({ ...base, endDate: "2026-10-08" }, "2026-10-08")).toBe(true);
    expect(isDueOn({ ...base, active: false }, "2026-10-05")).toBe(false);
  });
});

describe("takenOn", () => {
  it("finds a dose logged against the schedule on that local day", () => {
    const local = new Date(2026, 9, 5, 9, 0).toISOString();
    const entries: DoseEntry[] = [{ id: "d1", peptideId: "bpc-157", peptideName: "BPC-157", amount: 250, unit: "mcg", takenAt: local, scheduleId: "s1" }];
    expect(takenOn(base, entries, "2026-10-05")?.id).toBe("d1");
    expect(takenOn(base, entries, "2026-10-08")).toBeUndefined();
  });
});

describe("describeFrequency", () => {
  it("summarises frequencies", () => {
    expect(describeFrequency({ kind: "weekly", days: [4, 1] })).toBe("Mon, Thu");
    expect(describeFrequency({ kind: "weekly", days: [1, 2, 3, 4, 5] })).toBe("Weekdays");
    expect(describeFrequency({ kind: "weekly", days: [0, 1, 2, 3, 4, 5, 6] })).toBe("Every day");
    expect(describeFrequency({ kind: "interval", everyDays: 1 })).toBe("Every day");
    expect(describeFrequency({ kind: "interval", everyDays: 3 })).toBe("Every 3 days");
  });
});

describe("toIcs", () => {
  it("produces a recurring event with a reminder", () => {
    const ics = toIcs({ ...base, endDate: "2026-12-31" }, new Date("2026-10-05T12:00:00Z"));
    expect(ics).toContain("BEGIN:VCALENDAR\r\n");
    expect(ics).toContain("DTSTART:20261005T083000\r\n");
    expect(ics).toContain("RRULE:FREQ=WEEKLY;BYDAY=MO,TH;UNTIL=20261231T235959\r\n");
    expect(ics).toContain("SUMMARY:BPC-157 – 250 mcg\r\n");
    expect(ics).toContain("BEGIN:VALARM");
    expect(ics).toContain("DTSTAMP:20261005T120000Z");
  });

  it("uses a daily interval rule and escapes and folds long text", () => {
    const ics = toIcs({ ...base, frequency: { kind: "interval", everyDays: 2 }, notes: "Rotate sites; take with water, ".repeat(5) });
    expect(ics).toContain("RRULE:FREQ=DAILY;INTERVAL=2\r\n");
    expect(ics).toContain("\\;");
    expect(ics).toContain("\\,");
    for (const line of ics.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
});
