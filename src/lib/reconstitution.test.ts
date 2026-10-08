import { describe, expect, it } from "vitest";
import { SYRINGES, calculate, calculateBlend, roundToTick, toMg, validate, validateBlend, waterForTargetUnits } from "./reconstitution";

const [syr30, syr50, syr100] = SYRINGES;

describe("calculate", () => {
  it("handles the classic 5 mg vial + 2 mL water, 250 mcg dose", () => {
    const r = calculate({ vialMg: 5, waterMl: 2, doseMg: 0.25, syringe: syr100 });
    expect(r.concentrationMgPerMl).toBeCloseTo(2.5);
    expect(r.mcgPerUnit).toBeCloseTo(25);
    expect(r.doseVolumeMl).toBeCloseTo(0.1);
    expect(r.doseUnits).toBeCloseTo(10);
    expect(r.doseUnitsRounded).toBe(10);
    expect(r.dosesPerVial).toBeCloseTo(20);
    expect(r.warnings).toEqual([]);
  });

  it("handles 10 mg vial + 1 mL water, 2.5 mg dose", () => {
    const r = calculate({ vialMg: 10, waterMl: 1, doseMg: 2.5, syringe: syr50 });
    expect(r.doseUnits).toBeCloseTo(25);
    expect(r.dosesPerVial).toBeCloseTo(4);
  });

  it("warns when the dose exceeds syringe capacity", () => {
    const r = calculate({ vialMg: 5, waterMl: 5, doseMg: 0.5, syringe: syr30 });
    expect(r.doseUnits).toBeCloseTo(50);
    expect(r.warnings.some((w) => w.includes("more than the syringe holds"))).toBe(true);
  });

  it("warns when the volume is too small to measure", () => {
    const r = calculate({ vialMg: 10, waterMl: 1, doseMg: 0.1, syringe: syr100 });
    expect(r.doseUnits).toBeCloseTo(1);
    expect(r.warnings.some((w) => w.includes("hard to measure"))).toBe(true);
  });

  it("rounds to the syringe graduation and reports the real dose", () => {
    // 5 mg / 2.2 mL, 0.25 mg => 11 units; 1 mL syringe ticks every 2 units
    const r = calculate({ vialMg: 5, waterMl: 2.2, doseMg: 0.25, syringe: syr100 });
    expect(r.doseUnits).toBeCloseTo(11);
    expect(r.doseUnitsRounded % 2).toBe(0);
    expect(r.roundedDoseMg).not.toBeCloseTo(0.25, 3);
  });
});

describe("validate", () => {
  it("rejects zero, negative and NaN inputs", () => {
    const errors = validate({ vialMg: 0, waterMl: -1, doseMg: NaN, syringe: syr100 });
    expect(errors.map((e) => e.field).sort()).toEqual(["doseMg", "vialMg", "waterMl"]);
  });

  it("rejects a dose larger than the vial", () => {
    const errors = validate({ vialMg: 5, waterMl: 2, doseMg: 6, syringe: syr100 });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("doseMg");
  });
});

describe("helpers", () => {
  it("converts mcg to mg", () => {
    expect(toMg(250, "mcg")).toBe(0.25);
    expect(toMg(2, "mg")).toBe(2);
  });

  it("rounds to ticks", () => {
    expect(roundToTick(11, 2)).toBe(12);
    expect(roundToTick(10.6, 0.5)).toBe(10.5);
  });

  it("computes water needed to land on a target unit mark", () => {
    // 5 mg vial, 250 mcg dose, want 10 units per dose -> 2 mL
    expect(waterForTargetUnits(5, 0.25, 10)).toBeCloseTo(2);
  });
});

describe("blends", () => {
  const syringe = SYRINGES[2];
  const glow = [
    { name: "GHK-Cu", mg: 50 },
    { name: "BPC-157", mg: 10 },
    { name: "TB-500", mg: 10 },
  ];

  it("works out the draw from one peptide's dose and what else comes with it", () => {
    // 3 mL water: BPC-157 is 3.33 mg/mL, so 0.5 mg is 0.15 mL = 15 units.
    const r = calculateBlend({ components: glow, waterMl: 3, basis: 1, doseMg: 0.5, syringe });
    expect(r.basis.doseUnits).toBeCloseTo(15);
    expect(r.basis.doseUnitsRounded).toBe(16); // 1 mL syringe has 2-unit marks
    const [ghk, bpc, tb] = r.perDraw;
    expect(bpc.mg).toBeCloseTo((10 / 3) * 0.16);
    expect(tb.mg).toBeCloseTo(bpc.mg);
    expect(ghk.mg).toBeCloseTo(bpc.mg * 5);
  });

  it("validates the blend", () => {
    expect(validateBlend({ components: glow, waterMl: 3, basis: 1, doseMg: 0.5, syringe })).toEqual([]);
    expect(validateBlend({ components: [glow[0]], waterMl: 3, basis: 0, doseMg: 1, syringe })[0].field).toBe("components");
    expect(validateBlend({ components: [...glow, { name: "", mg: 5 }], waterMl: 3, basis: 0, doseMg: 1, syringe })[0].field).toBe("components");
    expect(validateBlend({ components: glow, waterMl: 0, basis: 0, doseMg: 1, syringe })[0].field).toBe("waterMl");
    expect(validateBlend({ components: glow, waterMl: 3, basis: 1, doseMg: 20, syringe })[0].message).toContain("BPC-157");
  });
});
