import { describe, expect, it } from "vitest";
import { formatLength, formatWeight, formatWeightChange, inRange, kgToLb, lbToKg, weightIn, weightSeries, weightSummary } from "./body";
import { siteLastUsed, type DoseEntry } from "./doseLog";
import { summarise, type SymptomEntry } from "./symptoms";

describe("body measurements", () => {
  it("converts and formats weights, including stone and pounds", () => {
    expect(formatWeight(82.44, "kg")).toBe("82.4 kg");
    expect(formatWeight(lbToKg(181.7), "lb")).toBe("181.7 lb");
    expect(formatWeight(lbToKg(14 * 12 + 4), "st")).toBe("12 st 4 lb");
    expect(formatWeight(lbToKg(14 * 13 - 0.01), "st")).toBe("13 st 0 lb"); // rounding never shows "14 lb"
    expect(weightIn(lbToKg(140), "st")).toBeCloseTo(10);
    expect(kgToLb(lbToKg(200))).toBeCloseTo(200);
    expect(formatWeightChange(-3.21, "kg")).toBe("−3.2 kg");
    expect(formatWeightChange(lbToKg(2), "st")).toBe("+2 lb");
    expect(formatWeightChange(0, "kg")).toBe("±0 kg");
    expect(formatLength(91.44, "in")).toBe("36 in");
  });

  it("builds one reading per day, oldest first, and summarises change", () => {
    const series = weightSeries([
      { id: "c", date: "2026-10-01", weightKg: 80 },
      { id: "a", date: "2026-08-01", weightKg: 86 },
      { id: "w", date: "2026-09-01", waistCm: 95 },
      { id: "b", date: "2026-09-02", weightKg: 83 },
    ]);
    expect(series).toEqual([
      { date: "2026-08-01", kg: 86 },
      { date: "2026-09-02", kg: 83 },
      { date: "2026-10-01", kg: 80 },
    ]);
    const s = weightSummary(series)!;
    expect(s.latest.kg).toBe(80);
    expect(s.sinceStart).toBe(-6);
    expect(s.last4Weeks).toBe(-3); // vs 2 Sep, the latest reading at least 28 days earlier
    expect(weightSummary([])).toBeNull();
    expect(inRange(series, "1m", "2026-10-05").map((p) => p.date)).toEqual(["2026-10-01"]);
    expect(inRange(series, "all", "2026-10-05")).toHaveLength(3);
  });
});

describe("injection sites", () => {
  it("knows how many days ago each site was last used", () => {
    const now = new Date("2026-10-10T12:00:00Z");
    const d = (takenAt: string, site?: string) => ({ id: takenAt, peptideId: null, peptideName: "X", amount: 1, unit: "mg", takenAt, site }) as DoseEntry;
    const used = siteLastUsed([d("2026-10-09T08:00:00Z", "Abdomen – left"), d("2026-10-08T08:00:00Z"), d("2026-10-03T08:00:00Z", "Abdomen – left"), d("2026-10-01T08:00:00Z", "Thigh – right")], now);
    expect(used.get("Abdomen – left")).toBe(1);
    expect(used.get("Thigh – right")).toBe(9);
    expect(used.has("Glute – left")).toBe(false);
  });
});

describe("side-effect journal", () => {
  it("summarises recent symptoms by frequency and worst severity", () => {
    const e = (id: string, at: string, symptom: string, severity: 1 | 2 | 3): SymptomEntry => ({ id, at, symptom, severity });
    const out = summarise(
      [e("1", "2026-10-09T08:00:00Z", "Nausea", 1), e("2", "2026-10-08T08:00:00Z", "Nausea", 3), e("3", "2026-10-07T08:00:00Z", "Headache", 2), e("4", "2026-08-01T08:00:00Z", "Headache", 3)],
      "2026-09-10T00:00:00Z",
    );
    expect(out).toEqual([
      { symptom: "Nausea", count: 2, worst: 3, lastAt: "2026-10-09T08:00:00Z" },
      { symptom: "Headache", count: 1, worst: 2, lastAt: "2026-10-07T08:00:00Z" },
    ]);
  });
});
