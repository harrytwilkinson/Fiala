// Maths for the vial guides: what each syringe mark holds for a given mix, and
// how long a vial lasts at the reader's own dose. No app imports (Node-safe).

import { UNITS_PER_ML } from "./reconstitution.ts";

export interface MixRow {
  waterMl: number;
  mgPerMl: number;
  /** Peptide in one unit (0.01 mL) on a U-100 syringe, in mcg. */
  mcgPerUnit: number;
  /** Peptide in 10 units (0.1 mL), in mg. */
  mgPer10Units: number;
}

export function mixRow(vialMg: number, waterMl: number): MixRow {
  const mgPerMl = vialMg / waterMl;
  return { waterMl, mgPerMl, mcgPerUnit: (mgPerMl * 1000) / UNITS_PER_ML, mgPer10Units: mgPerMl / 10 };
}

export interface Frequency {
  id: string;
  label: string;
  perDay: number;
}

export const FREQUENCIES: Frequency[] = [
  { id: "twice-daily", label: "Twice a day", perDay: 2 },
  { id: "daily", label: "Once a day", perDay: 1 },
  { id: "eod", label: "Every other day", perDay: 1 / 2 },
  { id: "3x-week", label: "3 times a week", perDay: 3 / 7 },
  { id: "2x-week", label: "Twice a week", perDay: 2 / 7 },
  { id: "weekly", label: "Once a week", perDay: 1 / 7 },
];

export interface VialDuration {
  /** Whole doses the vial holds. */
  doses: number;
  /** Days until the last of those doses is used. */
  days: number;
}

export function vialDuration(vialMg: number, doseMg: number, perDay: number): VialDuration | null {
  if (!(vialMg > 0) || !(doseMg > 0) || !(perDay > 0) || doseMg > vialMg) return null;
  const doses = Math.floor(vialMg / doseMg + 1e-9);
  return { doses, days: doses / perDay };
}

/** "3 days", "about 2 weeks", "about 3 months". */
export function describeDays(days: number): string {
  if (days < 1) return "less than a day";
  if (days < 14) {
    const d = Math.floor(days);
    return `${d} day${d === 1 ? "" : "s"}`;
  }
  if (days < 60) return `about ${Math.round(days / 7)} weeks`;
  return `about ${Math.round(days / 30)} months`;
}

/** Mixed peptides are often only good for about four weeks; flag vials that would outlast that. */
export const MIXED_SHELF_DAYS = 28;
