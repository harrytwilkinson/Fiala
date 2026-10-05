// Date helpers that work in the user's local time zone. Calendar-day logic
// (schedules, vial age) must not drift when a dose is logged late at night.

/** "YYYY-MM-DD" for the local calendar day of `d`. */
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse "YYYY-MM-DD" as local midnight. */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Whole calendar days from `a` to `b` (b - a), ignoring time of day and DST shifts. */
export function daysBetween(a: string, b: string): number {
  const ua = Date.UTC(...ymd(a));
  const ub = Date.UTC(...ymd(b));
  return Math.round((ub - ua) / 86_400_000);
}

export function addDays(key: string, days: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + days);
  return localDateKey(d);
}

function ymd(key: string): [number, number, number] {
  const [y, m, d] = key.split("-").map(Number);
  return [y, m - 1, d];
}

export function formatDateKey(key: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }): string {
  return parseDateKey(key).toLocaleDateString(undefined, opts);
}

/** Value for <input type="datetime-local"> in local time. */
export function localDateTimeValue(d = new Date()): string {
  const offset = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}
