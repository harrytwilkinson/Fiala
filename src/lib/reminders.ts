import { addDays, localDateKey, parseDateKey } from "./dates";
import type { DoseEntry } from "./doseLog";
import { isDueOn, takenOn, type Schedule } from "./schedules";

// Native dose reminders. Rather than relying on each OS's own repeat rules
// (which differ and can't express "every 3 days until a date"), we plan the
// next couple of weeks of individual notifications from the same isDueOn()
// logic the Today screen uses, and re-plan whenever schedules or doses change
// or the app is reopened. iOS allows 64 pending notifications per app, so we
// stay under that.

export const HORIZON_DAYS = 14;
export const MAX_PENDING = 60;

export interface PlannedReminder {
  id: number;
  at: Date;
  scheduleId: string;
  title: string;
  body: string;
}

/** Stable 31-bit positive id so re-planning produces the same ids. */
export function reminderId(scheduleId: string, dateKey: string): number {
  let h = 2166136261;
  for (const ch of `${scheduleId}|${dateKey}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 1) || 1;
}

export function planReminders(schedules: Schedule[], entries: DoseEntry[], now = new Date(), horizonDays = HORIZON_DAYS, limit = MAX_PENDING): PlannedReminder[] {
  const today = localDateKey(now);
  const out: PlannedReminder[] = [];
  for (let i = 0; i <= horizonDays; i++) {
    const day = addDays(today, i);
    for (const s of schedules) {
      if (!isDueOn(s, day)) continue;
      if (i === 0 && takenOn(s, entries, day)) continue;
      const [hh, mm] = s.time.split(":").map(Number);
      const at = parseDateKey(day);
      at.setHours(hh, mm, 0, 0);
      if (at.getTime() <= now.getTime()) continue;
      out.push({
        id: reminderId(s.id, day),
        at,
        scheduleId: s.id,
        title: "Dose reminder",
        body: `${s.peptideName} · ${s.amount} ${s.unit}`,
      });
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, limit);
}
