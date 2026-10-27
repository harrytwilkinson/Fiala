import { addDays, daysBetween, localDateKey } from "./dates";
import { createCollection } from "./store";

// Planned cycles: weeks on, weeks off, repeated. A plan only; doses are still logged as usual.

export interface Cycle {
  id: string;
  peptideId: string | null;
  peptideName: string;
  /** Local date the first "on" block starts. */
  startDate: string;
  weeksOn: number;
  weeksOff: number;
  /** How many on-blocks in total (at least 1). */
  repeats: number;
  notes?: string;
}

export const cycles = createCollection<Cycle>("fiala:cycles:v1", (items) => [...items].sort((a, b) => a.startDate.localeCompare(b.startDate)));
export const useCycles = () => cycles.use();

export interface Period {
  /** First day on, inclusive. */
  start: string;
  /** First day off again, exclusive. */
  end: string;
}

export function onPeriods(c: Cycle): Period[] {
  const length = (c.weeksOn + c.weeksOff) * 7;
  return Array.from({ length: Math.max(1, c.repeats) }, (_, k) => {
    const start = addDays(c.startDate, k * length);
    return { start, end: addDays(start, c.weeksOn * 7) };
  });
}

export function isOnDay(c: Cycle, day: string): boolean {
  return onPeriods(c).some((p) => daysBetween(p.start, day) >= 0 && daysBetween(day, p.end) > 0);
}

export type CycleState = { state: "upcoming" | "on" | "off"; until: string } | { state: "done"; until: string };

/** Where a cycle stands today and the day that changes. */
export function cycleState(c: Cycle, today = localDateKey()): CycleState {
  const periods = onPeriods(c);
  for (const p of periods) {
    if (daysBetween(today, p.start) > 0) return { state: periods[0] === p ? "upcoming" : "off", until: p.start };
    if (daysBetween(today, p.end) > 0) return { state: "on", until: p.end };
  }
  return { state: "done", until: periods[periods.length - 1].end };
}

/** Number of cycles on for each day in [from, from + days). */
export function overlapCounts(all: Cycle[], from: string, days: number): number[] {
  return Array.from({ length: days }, (_, i) => {
    const day = addDays(from, i);
    return all.filter((c) => isOnDay(c, day)).length;
  });
}
