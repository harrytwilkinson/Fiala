// Pure math for reconstituting a lyophilized (freeze-dried) peptide vial with
// bacteriostatic water and drawing a dose into a U-100 insulin syringe.
//
// U-100 means 100 units per 1 mL, so 1 unit = 0.01 mL regardless of the
// syringe's total capacity.

export const UNITS_PER_ML = 100;

export type MassUnit = "mcg" | "mg";

export interface Syringe {
  id: string;
  label: string;
  capacityMl: number;
  /** Smallest graduation printed on the barrel, in units. */
  tickUnits: number;
}

export const SYRINGES: Syringe[] = [
  { id: "u100-0.3", label: "0.3 mL (30 units)", capacityMl: 0.3, tickUnits: 0.5 },
  { id: "u100-0.5", label: "0.5 mL (50 units)", capacityMl: 0.5, tickUnits: 1 },
  { id: "u100-1.0", label: "1.0 mL (100 units)", capacityMl: 1, tickUnits: 2 },
];

export function toMg(amount: number, unit: MassUnit): number {
  return unit === "mcg" ? amount / 1000 : amount;
}

export interface ReconstitutionInput {
  /** Peptide in the vial, in mg (as printed on the label). */
  vialMg: number;
  /** Bacteriostatic water added to the vial, in mL. */
  waterMl: number;
  /** Desired dose, in mg. */
  doseMg: number;
  syringe: Syringe;
}

export interface ReconstitutionResult {
  concentrationMgPerMl: number;
  /** mcg of peptide in each syringe unit (0.01 mL). */
  mcgPerUnit: number;
  doseVolumeMl: number;
  /** Exact units to draw; may fall between graduations. */
  doseUnits: number;
  /** doseUnits rounded to the nearest graduation on the chosen syringe. */
  doseUnitsRounded: number;
  /** Actual dose delivered if the rounded mark is drawn, in mg. */
  roundedDoseMg: number;
  dosesPerVial: number;
  warnings: string[];
}

export type ValidationError = { field: keyof Omit<ReconstitutionInput, "syringe">; message: string };

export function validate(input: ReconstitutionInput): ValidationError[] {
  const errors: ValidationError[] = [];
  const positive = (field: ValidationError["field"], label: string) => {
    const v = input[field];
    if (!Number.isFinite(v) || v <= 0) errors.push({ field, message: `${label} must be greater than 0` });
  };
  positive("vialMg", "Vial amount");
  positive("waterMl", "Water volume");
  positive("doseMg", "Dose");
  if (errors.length === 0 && input.doseMg > input.vialMg) {
    errors.push({ field: "doseMg", message: "Dose is larger than the total amount in the vial" });
  }
  return errors;
}

export function roundToTick(units: number, tickUnits: number): number {
  return Math.round(units / tickUnits) * tickUnits;
}

export function calculate(input: ReconstitutionInput): ReconstitutionResult {
  const { vialMg, waterMl, doseMg, syringe } = input;

  const concentrationMgPerMl = vialMg / waterMl;
  const doseVolumeMl = doseMg / concentrationMgPerMl;
  const doseUnits = doseVolumeMl * UNITS_PER_ML;
  const doseUnitsRounded = roundToTick(doseUnits, syringe.tickUnits);
  const roundedDoseMg = (doseUnitsRounded / UNITS_PER_ML) * concentrationMgPerMl;
  const capacityUnits = syringe.capacityMl * UNITS_PER_ML;

  const warnings: string[] = [];
  if (doseUnits > capacityUnits) {
    warnings.push(
      `This dose (${fmt(doseUnits)} units) is more than the syringe holds (${capacityUnits} units). Use a larger syringe or less water.`,
    );
  }
  if (doseUnits < 2) {
    warnings.push(
      "Volumes under ~2 units are hard to measure accurately. Consider adding more water to the vial so each dose is a larger, easier-to-read volume.",
    );
  }
  if (doseUnitsRounded > 0 && Math.abs(doseUnitsRounded - doseUnits) / doseUnits > 0.05) {
    warnings.push(
      `The exact volume falls between syringe markings. Drawing to ${fmt(doseUnitsRounded)} units delivers ${fmt(roundedDoseMg * 1000)} mcg instead of ${fmt(doseMg * 1000)} mcg.`,
    );
  }
  if (waterMl > 10) {
    warnings.push("That is an unusually large water volume — double-check the vial size.");
  }

  return {
    concentrationMgPerMl,
    mcgPerUnit: (concentrationMgPerMl * 1000) / UNITS_PER_ML,
    doseVolumeMl,
    doseUnits,
    doseUnitsRounded,
    roundedDoseMg,
    dosesPerVial: vialMg / doseMg,
    warnings,
  };
}

/**
 * Reverse helper: how much water to add so that `doseMg` lands exactly on
 * `targetUnits` on a U-100 syringe.
 */
export function waterForTargetUnits(vialMg: number, doseMg: number, targetUnits: number): number {
  return (targetUnits / UNITS_PER_ML) * (vialMg / doseMg);
}

export function fmt(n: number, maxDecimals = 2): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: maxDecimals });
}
