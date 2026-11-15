import { addDays } from "./dates";
import type { DoseEntry } from "./doseLog";
import { isDueOn, takenOn, type Schedule } from "./schedules";

const LOOK_BACK_DAYS = 366;

/** Share of a day's scheduled doses that were logged; null when nothing was scheduled. */
function dayProgress(schedules: Schedule[], entries: DoseEntry[], day: string): number | null {
  const due = schedules.filter((s) => isDueOn(s, day));
  if (due.length === 0) return null;
  return due.filter((s) => takenOn(s, entries, day)).length / due.length;
}

/** Days in a row on which every scheduled dose was logged. An unfinished today doesn't break the run; days with nothing scheduled are skipped. */
export function doseStreak(schedules: Schedule[], entries: DoseEntry[], today: string): number {
  let streak = 0;
  for (let i = 0; i < LOOK_BACK_DAYS; i++) {
    const progress = dayProgress(schedules, entries, addDays(today, -i));
    if (progress === null) continue;
    if (progress === 1) streak++;
    else if (i > 0) break;
  }
  return streak;
}

/** Monday-to-Sunday progress for the week containing `today`; null for days still to come and days with nothing scheduled. */
export function weekProgress(schedules: Schedule[], entries: DoseEntry[], today: string): { days: (number | null)[]; todayIndex: number } {
  const [y, m, d] = today.split("-").map(Number);
  const todayIndex = (new Date(y, m - 1, d).getDay() + 6) % 7;
  return {
    todayIndex,
    days: Array.from({ length: 7 }, (_, i) => (i > todayIndex ? null : dayProgress(schedules, entries, addDays(today, i - todayIndex)))),
  };
}
