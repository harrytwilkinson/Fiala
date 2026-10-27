import type { DoseEntry } from "./doseLog";
import { doseMg, type Vial } from "./vials";

// Educational estimate of how much of a peptide is in the body over time, from logged doses and a published
// half-life. One-compartment model with first-order absorption from under the skin. It ignores body size,
// kidney function, injection site and everything else that makes real levels differ, so it is shown only as
// a relative curve ("% of the highest point"), never as a concentration.

/** Typical half-lives in hours, matching the library text, for peptides people commonly inject themselves. */
export const HALF_LIFE_HOURS: Record<string, number> = {
  semaglutide: 168,
  tirzepatide: 120,
  retatrutide: 144,
  cagrilintide: 168,
  dulaglutide: 120,
  liraglutide: 13,
  exenatide: 2.4,
  lixisenatide: 3,
  pramlintide: 0.85,
  setmelanotide: 11,
  tesamorelin: 0.5,
  sermorelin: 0.25,
  ipamorelin: 2,
  hexarelin: 1,
  "ghrp-2": 0.5,
  "ghrp-6": 0.33,
  "igf-1-lr3": 25,
  "pt-141": 3,
  "thymosin-alpha-1": 2,
  teriparatide: 1,
  abaloparatide: 1.7,
  somatropin: 3.5,
  somapacitan: 60,
  mecasermin: 6,
  hcg: 30,
  cetrorelix: 30,
  ganirelix: 14.5,
  nafarelin: 3,
  desmopressin: 2.5,
  icatibant: 1.5,
  enfuvirtide: 4,
  zilucoplan: 180,
  pegcetacoplan: 192,
};

const HOUR = 3_600_000;

export interface DosePoint {
  atMs: number;
  mg: number;
}

/** Absorption half-life: slower for long-acting drugs, capped so weekly drugs still peak within a few days. */
export function absorptionHalfLifeHours(halfLifeHours: number): number {
  return Math.min(18, Math.max(0.1, halfLifeHours / 8));
}

/** Amount in the body (in dose-mg) at time t, summing every earlier dose. */
export function levelAt(tMs: number, doses: DosePoint[], halfLifeHours: number): number {
  const ke = Math.LN2 / halfLifeHours;
  const ka = Math.LN2 / absorptionHalfLifeHours(halfLifeHours);
  let total = 0;
  for (const d of doses) {
    if (d.atMs > tMs) continue;
    const h = (tMs - d.atMs) / HOUR;
    total += d.mg * (ka / (ka - ke)) * (Math.exp(-ke * h) - Math.exp(-ka * h));
  }
  return total;
}

/** Logged doses of one peptide as mg, skipping syringe-unit doses that can't be converted without a vial. */
export function dosePoints(entries: DoseEntry[], peptideId: string, vialsById: Map<string, Vial>): { points: DosePoint[]; skipped: number } {
  const points: DosePoint[] = [];
  let skipped = 0;
  for (const e of entries) {
    if (e.peptideId !== peptideId) continue;
    const vial = e.vialId ? vialsById.get(e.vialId) : undefined;
    if (e.unit === "units" && !vial) {
      skipped++;
      continue;
    }
    points.push({ atMs: new Date(e.takenAt).getTime(), mg: doseMg(e, vial ?? { vialMg: 1, waterMl: 1 }) });
  }
  return { points, skipped };
}

export interface LevelCurve {
  fromMs: number;
  nowMs: number;
  toMs: number;
  /** [time, fraction of the highest point in the window] */
  past: [number, number][];
  future: [number, number][];
  nowFraction: number;
}

/** Days of history worth showing: about five half-lives, between 2 days and 8 weeks. */
export function windowDays(halfLifeHours: number): number {
  return Math.min(56, Math.max(2, Math.ceil((halfLifeHours * 5) / 24)));
}

export function levelCurve(doses: DosePoint[], halfLifeHours: number, nowMs = Date.now(), samples = 240): LevelCurve {
  const days = windowDays(halfLifeHours);
  const fromMs = nowMs - days * 24 * HOUR;
  const toMs = nowMs + Math.max(0.5, days * 0.25) * 24 * HOUR;
  const step = (toMs - fromMs) / samples;
  const all: [number, number][] = [];
  for (let i = 0; i <= samples; i++) {
    const t = fromMs + i * step;
    all.push([t, levelAt(t, doses, halfLifeHours)]);
  }
  const nowLevel = levelAt(nowMs, doses, halfLifeHours);
  const peak = Math.max(nowLevel, ...all.map((p) => p[1]));
  const norm = (v: number) => (peak > 0 ? v / peak : 0);
  return {
    fromMs,
    nowMs,
    toMs,
    past: [...all.filter((p) => p[0] <= nowMs), [nowMs, nowLevel] as [number, number]].map(([t, v]) => [t, norm(v)]),
    future: [[nowMs, nowLevel] as [number, number], ...all.filter((p) => p[0] > nowMs)].map(([t, v]) => [t, norm(v)]),
    nowFraction: norm(nowLevel),
  };
}
