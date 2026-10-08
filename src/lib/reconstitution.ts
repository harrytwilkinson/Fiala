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

// ---------- Blends (several peptides mixed in one vial) ----------

export interface BlendComponent {
  name: string;
  /** Amount of this peptide in the vial, in mg. */
  mg: number;
}

export interface BlendInput {
  components: BlendComponent[];
  waterMl: number;
  /** Index of the component the prescribed dose refers to. */
  basis: number;
  /** Prescribed dose of the basis component, in mg. */
  doseMg: number;
  syringe: Syringe;
}

export interface BlendResult {
  /** The single-peptide result for the basis component (units to draw, warnings…). */
  basis: ReconstitutionResult;
  /** What the rounded draw delivers of every component, in mg. */
  perDraw: { name: string; mg: number; mgPerMl: number }[];
}

export type BlendError = { field: "components" | "waterMl" | "doseMg"; message: string };

export function validateBlend(input: BlendInput): BlendError[] {
  const errors: BlendError[] = [];
  if (input.components.length < 2) errors.push({ field: "components", message: "Add at least two peptides" });
  else if (input.components.some((c) => !c.name.trim() || !Number.isFinite(c.mg) || c.mg <= 0))
    errors.push({ field: "components", message: "Give every peptide a name and an amount greater than 0" });
  if (!Number.isFinite(input.waterMl) || input.waterMl <= 0) errors.push({ field: "waterMl", message: "Water volume must be greater than 0" });
  const basis = input.components[input.basis];
  if (!Number.isFinite(input.doseMg) || input.doseMg <= 0) errors.push({ field: "doseMg", message: "Dose must be greater than 0" });
  else if (basis && Number.isFinite(basis.mg) && input.doseMg > basis.mg)
    errors.push({ field: "doseMg", message: `Dose is larger than the ${basis.name.trim() || "peptide"} in the vial` });
  return errors;
}

/**
 * Units to draw for a prescribed dose of one peptide in a blend, and how much of
 * each other peptide comes with that draw. Every peptide shares the same water,
 * so each one's concentration is its own mg ÷ the water volume.
 */
export function calculateBlend(input: BlendInput): BlendResult {
  const { components, waterMl, basis: i, doseMg, syringe } = input;
  const basis = calculate({ vialMg: components[i].mg, waterMl, doseMg, syringe });
  const drawMl = basis.doseUnitsRounded / UNITS_PER_ML;
  return {
    basis,
    perDraw: components.map((c) => ({ name: c.name.trim(), mgPerMl: c.mg / waterMl, mg: (c.mg / waterMl) * drawMl })),
  };
}
