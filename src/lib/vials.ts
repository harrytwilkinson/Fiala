import { addDays, daysBetween, localDateKey } from "./dates";
import type { DoseEntry } from "./doseLog";
import { UNITS_PER_ML } from "./reconstitution";
import { createCollection } from "./store";

// A reconstituted vial. Remaining peptide is derived from the doses logged
// against it, so editing or deleting a dose automatically corrects inventory.

export interface Vial {
  id: string;
  peptideId: string | null;
  peptideName: string;
  vialMg: number;
  waterMl: number;
  /** Local date ("YYYY-MM-DD") the vial was mixed. */
  mixedOn: string;
  /** Days after mixing the user wants to be warned to discard it. */
  discardAfterDays: number;
  finished: boolean;
  notes?: string;
}

export const DEFAULT_DISCARD_DAYS = 28;
export const EXPIRY_WARNING_DAYS = 3;
export const LOW_DOSES_WARNING = 2;

export const vials = createCollection<Vial>(
  "fiala:vials:v1",
  (items) => [...items].sort((a, b) => Number(a.finished) - Number(b.finished) || b.mixedOn.localeCompare(a.mixedOn)),
  "peptide-compass:vials:v1",
);

export const useVials = () => vials.use();

export function concentrationMgPerMl(vial: Pick<Vial, "vialMg" | "waterMl">): number {
  return vial.vialMg / vial.waterMl;
}

/** Peptide mass in a logged dose, using the vial's concentration for syringe units. */
export function doseMg(entry: Pick<DoseEntry, "amount" | "unit">, vial: Pick<Vial, "vialMg" | "waterMl">): number {
  switch (entry.unit) {
    case "mcg":
      return entry.amount / 1000;
    case "mg":
      return entry.amount;
    case "units":
      return (entry.amount / UNITS_PER_ML) * concentrationMgPerMl(vial);
  }
}

export interface VialStatus {
  usedMg: number;
  remainingMg: number;
  remainingFraction: number;
  dosesLogged: number;
  /** Based on the most recent dose from this vial; undefined until one is logged. */
  dosesLeft?: number;
  daysSinceMixed: number;
  discardOn: string;
  daysUntilDiscard: number;
  expired: boolean;
  expiringSoon: boolean;
  low: boolean;
  empty: boolean;
}

export function vialStatus(vial: Vial, entries: DoseEntry[], today = localDateKey()): VialStatus {
  const own = entries.filter((e) => e.vialId === vial.id);
  const usedMg = own.reduce((sum, e) => sum + doseMg(e, vial), 0);
  const remainingMg = Math.max(0, vial.vialMg - usedMg);
  // entries are newest-first, so own[0] is the latest dose
  const lastDoseMg = own[0] ? doseMg(own[0], vial) : undefined;
  const dosesLeft = lastDoseMg ? Math.floor(remainingMg / lastDoseMg + 1e-9) : undefined;
  const discardOn = addDays(vial.mixedOn, vial.discardAfterDays);
  const daysUntilDiscard = daysBetween(today, discardOn);
  const empty = remainingMg <= 1e-9;

  return {
    usedMg,
    remainingMg,
    remainingFraction: vial.vialMg > 0 ? remainingMg / vial.vialMg : 0,
    dosesLogged: own.length,
    dosesLeft,
    daysSinceMixed: daysBetween(vial.mixedOn, today),
    discardOn,
    daysUntilDiscard,
    expired: daysUntilDiscard < 0,
    expiringSoon: daysUntilDiscard >= 0 && daysUntilDiscard <= EXPIRY_WARNING_DAYS,
    low: !empty && dosesLeft !== undefined && dosesLeft <= LOW_DOSES_WARNING,
    empty,
  };
}

/** The active vial a new dose of this peptide should come from: the oldest one, so vials are used up in order. */
export function defaultVialFor(all: Vial[], peptideName: string): Vial | undefined {
  return all
    .filter((v) => !v.finished && v.peptideName === peptideName)
    .sort((a, b) => a.mixedOn.localeCompare(b.mixedOn))[0];
}
