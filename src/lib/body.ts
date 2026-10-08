import { useSyncExternalStore } from "react";
import { addDays, localDateKey } from "./dates";
import { createCollection } from "./store";

// Body measurements (weight, waist) for tracking progress alongside doses.
// Stored in kg and cm; shown in the user's chosen units.

export interface Measurement {
  id: string;
  /** Local date "YYYY-MM-DD". */
  date: string;
  weightKg?: number;
  waistCm?: number;
  notes?: string;
}

export const measurements = createCollection<Measurement>("fiala:measurements:v1", (items) =>
  [...items].sort((a, b) => b.date.localeCompare(a.date)),
);
export const useMeasurements = () => measurements.use();

// ---------- Units ----------

export type WeightUnit = "kg" | "lb" | "st";
export type LengthUnit = "cm" | "in";
export interface BodyUnits {
  weight: WeightUnit;
  length: LengthUnit;
}

const UNITS_KEY = "fiala:body-units:v1";
const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;
const DEFAULT_UNITS: BodyUnits = { weight: "kg", length: "cm" };

function readUnits(): BodyUnits {
  try {
    const raw = JSON.parse(localStorage.getItem(UNITS_KEY) ?? "null");
    const weight = ["kg", "lb", "st"].includes(raw?.weight) ? raw.weight : DEFAULT_UNITS.weight;
    const length = ["cm", "in"].includes(raw?.length) ? raw.length : DEFAULT_UNITS.length;
    return { weight, length };
  } catch {
    return DEFAULT_UNITS;
  }
}

let units = readUnits();
const listeners = new Set<() => void>();

export function useBodyUnits(): BodyUnits {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => units,
  );
}

export function setBodyUnits(next: Partial<BodyUnits>) {
  units = { ...units, ...next };
  try {
    localStorage.setItem(UNITS_KEY, JSON.stringify(units));
  } catch {
    // Storage blocked: the choice lasts for this session.
  }
  listeners.forEach((l) => l());
}

export const lbToKg = (lb: number) => lb * KG_PER_LB;
export const kgToLb = (kg: number) => kg / KG_PER_LB;
export const inToCm = (inch: number) => inch * CM_PER_IN;
export const cmToIn = (cm: number) => cm / CM_PER_IN;

/** Weight in the chosen unit as a single number (stone as decimal stone), for charts. */
export function weightIn(kg: number, unit: WeightUnit): number {
  return unit === "kg" ? kg : unit === "lb" ? kgToLb(kg) : kgToLb(kg) / 14;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** "82.4 kg", "181.7 lb", "12 st 13.7 lb". */
export function formatWeight(kg: number, unit: WeightUnit): string {
  if (unit === "kg") return `${round1(kg)} kg`;
  const lb = kgToLb(kg);
  if (unit === "lb") return `${round1(lb)} lb`;
  let st = Math.floor(lb / 14);
  let rest = round1(lb - st * 14);
  if (rest >= 14) {
    st += 1;
    rest = round1(rest - 14);
  }
  return `${st} st ${rest} lb`;
}

/** Signed change, e.g. "−3.2 kg" or "+1 lb" (stone changes are shown in lb, as people usually do). */
export function formatWeightChange(kg: number, unit: WeightUnit): string {
  const value = unit === "kg" ? kg : kgToLb(kg);
  const sign = value > 0.05 ? "+" : value < -0.05 ? "−" : "±";
  return `${sign}${round1(Math.abs(value))} ${unit === "kg" ? "kg" : "lb"}`;
}

export function formatLength(cm: number, unit: LengthUnit): string {
  return unit === "cm" ? `${round1(cm)} cm` : `${round1(cmToIn(cm))} in`;
}

// ---------- Summaries ----------

export interface WeightPoint {
  date: string;
  kg: number;
}

/** Weight readings, oldest first; one per day (the latest entry that day wins). */
export function weightSeries(list: Measurement[]): WeightPoint[] {
  const byDay = new Map<string, number>();
  for (const m of [...list].sort((a, b) => a.date.localeCompare(b.date))) if (m.weightKg) byDay.set(m.date, m.weightKg);
  return [...byDay].map(([date, kg]) => ({ date, kg }));
}

export interface WeightSummary {
  latest: WeightPoint;
  sinceStart: number;
  /** Change versus the latest reading at least 28 days before the latest, if any. */
  last4Weeks?: number;
}

export function weightSummary(series: WeightPoint[]): WeightSummary | null {
  if (series.length === 0) return null;
  const latest = series[series.length - 1];
  const cutoff = addDays(latest.date, -28);
  const before = [...series].reverse().find((p) => p.date <= cutoff);
  return { latest, sinceStart: latest.kg - series[0].kg, last4Weeks: before ? latest.kg - before.kg : undefined };
}

export type Range = "1m" | "3m" | "6m" | "all";
export const RANGE_DAYS: Record<Range, number | null> = { "1m": 31, "3m": 92, "6m": 183, all: null };

export function inRange(series: WeightPoint[], range: Range, today = localDateKey()): WeightPoint[] {
  const days = RANGE_DAYS[range];
  if (days === null) return series;
  const from = addDays(today, -days);
  return series.filter((p) => p.date >= from);
}
