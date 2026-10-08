// Fiala Plus analysis: adherence, dose changes and side effects, and spend.
// Pure functions over the user's own data; nothing leaves the device.

import { addDays, localDateKey } from "./dates";
import type { DoseEntry } from "./doseLog";
import { isDueOn, type Schedule } from "./schedules";
import type { SymptomEntry } from "./symptoms";
import { doseMg, type Vial } from "./vials";

// ---------- Adherence ----------

export interface Adherence {
  due: number;
  taken: number;
  /** 0–1, or null when nothing was due. */
  rate: number | null;
  /** Due days in a row taken, counting back from the most recent due day. */
  streak: number;
  /** Due days in the period with no dose logged, newest first. */
  missed: string[];
}

const dayOf = (iso: string) => localDateKey(new Date(iso));

/** A due day counts as taken if any dose of that schedule's peptide was logged that day. */
function takenDay(s: Schedule, entries: DoseEntry[], day: string): boolean {
  return entries.some((e) => (e.scheduleId === s.id || e.peptideName === s.peptideName) && dayOf(e.takenAt) === day);
}

export function adherence(s: Schedule, entries: DoseEntry[], from: string, to: string, today = localDateKey()): Adherence {
  const days: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) if (isDueOn(s, d)) days.push(d);
  // Today only counts once it's been logged, so a dose later today isn't a "miss".
  const counted = days.filter((d) => d < today || takenDay(s, entries, d));
  const taken = counted.filter((d) => takenDay(s, entries, d));
  let streak = 0;
  for (const d of [...counted].reverse()) {
    if (!takenDay(s, entries, d)) break;
    streak++;
  }
  return {
    due: counted.length,
    taken: taken.length,
    rate: counted.length ? taken.length / counted.length : null,
    streak,
    missed: counted.filter((d) => !takenDay(s, entries, d)).reverse(),
  };
}

// ---------- Dose changes and side effects ----------

export interface DoseChange {
  peptideName: string;
  at: string;
  from: string;
  to: string;
  /** Side effects noted in the following window. */
  after: SymptomEntry[];
}

const label = (e: DoseEntry) => `${e.amount} ${e.unit}`;

/** Each time a peptide's logged dose changed, and the side effects noted in the next `hours`. */
export function doseChanges(entries: DoseEntry[], symptoms: SymptomEntry[], hours = 72): DoseChange[] {
  const byPeptide = new Map<string, DoseEntry[]>();
  for (const e of [...entries].sort((a, b) => a.takenAt.localeCompare(b.takenAt))) {
    byPeptide.set(e.peptideName, [...(byPeptide.get(e.peptideName) ?? []), e]);
  }
  const out: DoseChange[] = [];
  for (const [name, list] of byPeptide) {
    for (let i = 1; i < list.length; i++) {
      if (label(list[i]) === label(list[i - 1])) continue;
      const start = Date.parse(list[i].takenAt);
      const end = start + hours * 3_600_000;
      out.push({
        peptideName: name,
        at: list[i].takenAt,
        from: label(list[i - 1]),
        to: label(list[i]),
        after: symptoms.filter((s) => Date.parse(s.at) >= start && Date.parse(s.at) <= end).sort((a, b) => a.at.localeCompare(b.at)),
      });
    }
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

/** Doses per peptide in a period, newest first. */
export function dosesByPeptide(entries: DoseEntry[], fromIso: string): { peptideName: string; count: number; last: string }[] {
  const map = new Map<string, { peptideName: string; count: number; last: string }>();
  for (const e of entries) {
    if (e.takenAt < fromIso) continue;
    const m = map.get(e.peptideName);
    if (m) {
      m.count++;
      if (e.takenAt > m.last) m.last = e.takenAt;
    } else map.set(e.peptideName, { peptideName: e.peptideName, count: 1, last: e.takenAt });
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

// ---------- Spend ----------

export interface Spend {
  total: number;
  byMonth: { month: string; total: number }[];
  /** Average cost of one logged dose, per peptide, from vials with a cost. */
  perDose: { peptideName: string; cost: number; doses: number }[];
}

/** Spend from vials with a cost, counted in the month each vial was mixed. */
export function spend(vials: Vial[], entries: DoseEntry[], fromDate = "0000-01-01"): Spend {
  const costed = vials.filter((v) => v.cost && v.cost > 0 && v.mixedOn >= fromDate);
  const months = new Map<string, number>();
  for (const v of costed) months.set(v.mixedOn.slice(0, 7), (months.get(v.mixedOn.slice(0, 7)) ?? 0) + v.cost!);
  const per = new Map<string, { total: number; doses: number }>();
  for (const v of costed) {
    const own = entries.filter((e) => e.vialId === v.id);
    if (own.length === 0) continue;
    const p = per.get(v.peptideName) ?? { total: 0, doses: 0 };
    for (const e of own) {
      p.total += (v.cost! * doseMg(e, v)) / v.vialMg;
      p.doses++;
    }
    per.set(v.peptideName, p);
  }
  return {
    total: costed.reduce((sum, v) => sum + v.cost!, 0),
    byMonth: [...months].map(([month, total]) => ({ month, total })).sort((a, b) => a.month.localeCompare(b.month)),
    perDose: [...per].map(([peptideName, p]) => ({ peptideName, cost: p.total / p.doses, doses: p.doses })).sort((a, b) => b.cost - a.cost),
  };
}

export const CURRENCIES = ["GBP", "EUR", "USD", "AUD", "CAD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export function formatMoney(amount: number, currency: Currency): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
}
