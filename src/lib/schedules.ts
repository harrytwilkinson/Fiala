import { daysBetween, localDateKey } from "./dates";
import type { DoseEntry, DoseUnit } from "./doseLog";
import { createCollection } from "./store";

export type Frequency =
  | { kind: "weekly"; /** 0 = Sunday … 6 = Saturday */ days: number[] }
  | { kind: "interval"; everyDays: number };

export interface Schedule {
  id: string;
  peptideId: string | null;
  peptideName: string;
  amount: number;
  unit: DoseUnit;
  frequency: Frequency;
  /** "HH:MM", local time. */
  time: string;
  /** Local date the schedule starts ("YYYY-MM-DD"); interval schedules count from here. */
  startDate: string;
  /** Optional last day, inclusive. */
  endDate?: string;
  active: boolean;
  notes?: string;
}

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ICS_DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

export const schedules = createCollection<Schedule>("peptide-compass:schedules:v1", (items) =>
  [...items].sort((a, b) => Number(b.active) - Number(a.active) || a.time.localeCompare(b.time)),
);

export const useSchedules = () => schedules.use();

export function isDueOn(schedule: Schedule, dateKey: string): boolean {
  if (!schedule.active) return false;
  const sinceStart = daysBetween(schedule.startDate, dateKey);
  if (sinceStart < 0) return false;
  if (schedule.endDate && daysBetween(dateKey, schedule.endDate) < 0) return false;

  const { frequency } = schedule;
  if (frequency.kind === "weekly") {
    const [y, m, d] = dateKey.split("-").map(Number);
    return frequency.days.includes(new Date(y, m - 1, d).getDay());
  }
  return frequency.everyDays > 0 && sinceStart % frequency.everyDays === 0;
}

export function takenOn(schedule: Schedule, entries: DoseEntry[], dateKey: string): DoseEntry | undefined {
  return entries.find((e) => e.scheduleId === schedule.id && localDateKey(new Date(e.takenAt)) === dateKey);
}

export function describeFrequency(f: Frequency): string {
  if (f.kind === "interval") {
    if (f.everyDays === 1) return "Every day";
    return `Every ${f.everyDays} days`;
  }
  if (f.days.length === 7) return "Every day";
  if (f.days.length === 0) return "No days selected";
  const sorted = [...f.days].sort();
  if (sorted.join() === "1,2,3,4,5") return "Weekdays";
  return sorted.map((d) => WEEKDAYS[d]).join(", ");
}

export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/**
 * iCalendar file for a schedule. Importing it into the phone's calendar gives
 * real, recurring reminders that fire even when the app is closed — no server
 * or push notifications needed.
 */
export function toIcs(schedule: Schedule, now = new Date()): string {
  const [hh, mm] = schedule.time.split(":");
  const date = schedule.startDate.replace(/-/g, "");
  // Floating local time (no Z / TZID): fires at the same wall-clock time wherever the user is.
  const dtStart = `${date}T${hh}${mm}00`;
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const f = schedule.frequency;
  let rrule = f.kind === "weekly" ? `FREQ=WEEKLY;BYDAY=${[...f.days].sort().map((d) => ICS_DAYS[d]).join(",")}` : `FREQ=DAILY;INTERVAL=${f.everyDays}`;
  if (schedule.endDate) rrule += `;UNTIL=${schedule.endDate.replace(/-/g, "")}T235959`;

  const summary = `${schedule.peptideName} – ${schedule.amount} ${schedule.unit}`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Peptide Compass//Dose schedule//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${schedule.id}@peptide-compass`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${dtStart}`,
    "DURATION:PT5M",
    `RRULE:${rrule}`,
    `SUMMARY:${escapeIcs(summary)}`,
    `DESCRIPTION:${escapeIcs(`Scheduled dose from Peptide Compass.${schedule.notes ? ` ${schedule.notes}` : ""}`)}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcs(summary)}`,
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}

/** RFC 5545: lines longer than 75 octets are folded with CRLF + space. */
function foldIcsLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let size = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (size + n > (parts.length ? 74 : 75)) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += ch;
    size += n;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}
