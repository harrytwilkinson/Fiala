import { createCollection } from "./store";

// Side-effect journal: what the user felt, how bad, and when, so patterns can be
// spotted against doses and shared with a clinician.

export const COMMON_SYMPTOMS = [
  "Nausea",
  "Vomiting",
  "Diarrhoea",
  "Constipation",
  "Reduced appetite",
  "Increased hunger",
  "Headache",
  "Fatigue",
  "Dizziness",
  "Injection-site reaction",
  "Flushing",
  "Water retention",
  "Heart racing",
  "Trouble sleeping",
  "Low mood",
] as const;

export type Severity = 1 | 2 | 3;
export const SEVERITY_LABEL: Record<Severity, string> = { 1: "Mild", 2: "Moderate", 3: "Severe" };

export interface SymptomEntry {
  id: string;
  /** ISO timestamp. */
  at: string;
  symptom: string;
  severity: Severity;
  /** Peptide or stack the user thinks it's related to (by name). */
  relatedTo?: string;
  notes?: string;
}

export const symptoms = createCollection<SymptomEntry>("fiala:symptoms:v1", (items) => [...items].sort((a, b) => b.at.localeCompare(a.at)));
export const useSymptoms = () => symptoms.use();

export interface SymptomSummary {
  symptom: string;
  count: number;
  worst: Severity;
  lastAt: string;
}

/** Each symptom logged since `sinceIso`, most frequent first. */
export function summarise(entries: SymptomEntry[], sinceIso: string): SymptomSummary[] {
  const map = new Map<string, SymptomSummary>();
  for (const e of entries) {
    if (e.at < sinceIso) continue;
    const s = map.get(e.symptom);
    if (s) {
      s.count++;
      s.worst = Math.max(s.worst, e.severity) as Severity;
      if (e.at > s.lastAt) s.lastAt = e.at;
    } else map.set(e.symptom, { symptom: e.symptom, count: 1, worst: e.severity, lastAt: e.at });
  }
  return [...map.values()].sort((a, b) => b.count - a.count || b.lastAt.localeCompare(a.lastAt));
}
