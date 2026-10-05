import { useCallback, useEffect, useState } from "react";

// Dose history is kept on-device only (localStorage). Nothing leaves the
// browser, which matters for health data. A sync backend can replace this
// module later without touching the UI.

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
}

const STORAGE_KEY = "peptide-compass:doses:v1";

function read(): DoseEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(entries: DoseEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage full or blocked (private mode); the in-memory list still works.
  }
}

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useDoseLog() {
  const [entries, setEntries] = useState<DoseEntry[]>(read);

  useEffect(() => write(entries), [entries]);

  // Keep multiple tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setEntries(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const add = useCallback((entry: Omit<DoseEntry, "id">) => {
    setEntries((prev) => sortByDate([{ ...entry, id: newId() }, ...prev]));
  }, []);

  const remove = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { entries, add, remove };
}

export function sortByDate(entries: DoseEntry[]): DoseEntry[] {
  return [...entries].sort((a, b) => b.takenAt.localeCompare(a.takenAt));
}

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
