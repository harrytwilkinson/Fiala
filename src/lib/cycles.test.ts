import { describe, expect, it } from "vitest";
import { TITRATION_PRODUCTS, findTitrationProduct } from "../data/titration";
import { findPeptide } from "../data/peptides";
import { cycleState, isOnDay, onPeriods, overlapCounts, type Cycle } from "./cycles";
import { moveToStep, titrationStatus, type TitrationPlan } from "./titration";

const cycle: Cycle = { id: "c1", peptideId: "bpc-157", peptideName: "BPC-157", startDate: "2026-11-02", weeksOn: 4, weeksOff: 2, repeats: 2 };

describe("cycles", () => {
  it("lays out on-blocks with breaks", () => {
    expect(onPeriods(cycle)).toEqual([
      { start: "2026-11-02", end: "2026-11-30" },
      { start: "2026-12-14", end: "2027-01-11" },
    ]);
    expect(isOnDay(cycle, "2026-11-29")).toBe(true);
    expect(isOnDay(cycle, "2026-11-30")).toBe(false);
    expect(isOnDay(cycle, "2026-12-14")).toBe(true);
  });

  it("reports where it stands", () => {
    expect(cycleState(cycle, "2026-10-30")).toEqual({ state: "upcoming", until: "2026-11-02" });
    expect(cycleState(cycle, "2026-11-10")).toEqual({ state: "on", until: "2026-11-30" });
    expect(cycleState(cycle, "2026-12-01")).toEqual({ state: "off", until: "2026-12-14" });
    expect(cycleState(cycle, "2027-02-01")).toEqual({ state: "done", until: "2027-01-11" });
  });

  it("counts overlaps", () => {
    const other = { ...cycle, id: "c2", startDate: "2026-11-23", repeats: 1 };
    expect(overlapCounts([cycle, other], "2026-11-22", 3)).toEqual([1, 2, 2]);
  });
});

describe("titration", () => {
  const product = findTitrationProduct("wegovy")!;
  const plan: TitrationPlan = { id: "t1", productId: "wegovy", stepIndex: 0, stepStartedOn: "2026-10-01", history: [] };

  it("gives the earliest next step the label allows", () => {
    expect(titrationStatus(plan, product, "2026-10-20")).toEqual({ weeksOnStep: 2, earliestNext: "2026-10-29", nextAllowed: false, isLast: false });
    expect(titrationStatus(plan, product, "2026-10-29").nextAllowed).toBe(true);
  });

  it("has no next step at maintenance", () => {
    expect(titrationStatus({ ...plan, stepIndex: 4 }, product, "2026-12-01").isLast).toBe(true);
  });

  it("keeps history when moving", () => {
    const moved = moveToStep(plan, 1, "2026-10-30");
    expect(moved).toMatchObject({ stepIndex: 1, stepStartedOn: "2026-10-30", history: [{ stepIndex: 0, startedOn: "2026-10-01" }] });
  });

  it("only uses library peptides and rising steps", () => {
    for (const p of TITRATION_PRODUCTS) {
      expect(findPeptide(p.peptideId), p.id).toBeDefined();
      for (let i = 1; i < p.steps.length; i++) expect(p.steps[i].mg).toBeGreaterThan(p.steps[i - 1].mg);
      expect(p.steps[p.steps.length - 1].minWeeks).toBeUndefined();
    }
  });
});
