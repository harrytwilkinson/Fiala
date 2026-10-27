import { describe, expect, it } from "vitest";
import { findPeptide } from "../data/peptides";
import { HALF_LIFE_HOURS, levelAt, levelCurve, windowDays } from "./levels";

const H = 3_600_000;

describe("levelAt", () => {
  it("is zero before the first dose and rises after it", () => {
    const doses = [{ atMs: 0, mg: 1 }];
    expect(levelAt(-H, doses, 168)).toBe(0);
    expect(levelAt(24 * H, doses, 168)).toBeGreaterThan(0.5);
  });

  it("halves over one half-life once absorbed", () => {
    const doses = [{ atMs: 0, mg: 1 }];
    const a = levelAt(7 * 24 * H, doses, 168);
    const b = levelAt(14 * 24 * H, doses, 168);
    expect(b / a).toBeCloseTo(0.5, 1);
  });

  it("builds up with repeated weekly doses", () => {
    const weekly = [0, 1, 2, 3, 4].map((w) => ({ atMs: w * 168 * H, mg: 1 }));
    const afterFirst = levelAt(24 * H, weekly.slice(0, 1), 168);
    const afterFifth = levelAt(4 * 168 * H + 24 * H, weekly, 168);
    expect(afterFifth).toBeGreaterThan(afterFirst * 1.5);
  });
});

describe("levelCurve", () => {
  it("normalises to the highest point and marks now", () => {
    const c = levelCurve([{ atMs: 0, mg: 0.5 }], 168, 3 * 24 * H);
    expect(Math.max(...c.past.map((p) => p[1]), ...c.future.map((p) => p[1]))).toBeCloseTo(1, 5);
    expect(c.nowFraction).toBeGreaterThan(0.8);
    expect(windowDays(168)).toBe(35);
    expect(windowDays(0.5)).toBe(2);
  });
});

describe("half-life table", () => {
  it("only names library peptides", () => {
    for (const id of Object.keys(HALF_LIFE_HOURS)) expect(findPeptide(id), id).toBeDefined();
  });
});
