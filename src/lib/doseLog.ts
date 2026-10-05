import { createCollection } from "./store";

// Dose history is kept on-device only (localStorage). Nothing leaves the
// browser, which matters for health data. A sync backend can replace the
// collection later without touching the UI.

export type DoseUnit = "mcg" | "mg" | "units";

export const INJECTION_SITES = [
  "Abdomen – left",
  "Abdomen – right",
  "Thigh – left",
  "Thigh – right",
  "Upper arm – left",
  "Upper arm – right",
  "Glute – left",
  "Glute – right",
  "Other",
] as const;

export interface DoseEntry {
  id: string;
  /** Library id, or null for a custom compound. */
  peptideId: string | null;
  peptideName: string;
  amount: number;
  unit: DoseUnit;
  site?: string;
  /** ISO timestamp of when the dose was taken. */
  takenAt: string;
  notes?: string;
  /** Vial the dose was drawn from, for inventory tracking. */
  vialId?: string;
  /** Schedule this dose fulfils, for the Today view. */
  scheduleId?: string;
}

export function sortByDate(entries: DoseEntry[]): DoseEntry[] {
  return [...entries].sort((a, b) => b.takenAt.localeCompare(a.takenAt));
}

export const doses = createCollection<DoseEntry>("fiala:doses:v1", sortByDate, "peptide-compass:doses:v1");

export const useDoseLog = () => doses.use();

/** Most recently used site for a peptide, so the UI can suggest rotating. */
export function lastSiteFor(entries: DoseEntry[], peptideName: string): string | undefined {
  return entries.find((e) => e.peptideName === peptideName && e.site)?.site;
}

export function toCsv(entries: DoseEntry[]): string {
  const header = ["taken_at", "peptide", "amount", "unit", "site", "notes"];
  const esc = (v: string | number | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = entries.map((e) => [e.takenAt, e.peptideName, e.amount, e.unit, e.site, e.notes].map(esc).join(","));
  return [header.join(","), ...rows].join("\n");
}
