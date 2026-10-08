import { useSyncExternalStore } from "react";
import { backupFileName, buildBackup, countRecords, mergeData, type BackupData } from "./backup";
import { doses } from "./doseLog";
import { canShareFiles, saveFile, type SaveResult } from "./files";
import { measurements } from "./body";
import { schedules } from "./schedules";
import { symptoms } from "./symptoms";
import { migrateKey } from "./store";
import { vials } from "./vials";

// Browser side of backup/restore: reading and writing the live collections,
// sharing or downloading the file, and remembering when the last backup ran.

const LAST_BACKUP_KEY = "fiala:last-backup";
migrateKey("peptide-compass:last-backup", LAST_BACKUP_KEY);
const listeners = new Set<() => void>();

export function currentData(): BackupData {
  return { doses: doses.get(), vials: vials.get(), schedules: schedules.get(), measurements: measurements.get(), symptoms: symptoms.get() };
}

function getLastBackupAt(): string | null {
  try {
    return localStorage.getItem(LAST_BACKUP_KEY);
  } catch {
    return null;
  }
}

function markBackedUp(now = new Date()) {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, now.toISOString());
  } catch {
    // ignore: only affects the reminder
  }
  listeners.forEach((l) => l());
}

export function useLastBackupAt(): string | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getLastBackupAt,
    () => null,
  );
}

export type ExportResult = SaveResult;

/**
 * Prefer the system share sheet (Save to Files, iCloud Drive, AirDrop, email)
 * where available; otherwise download the file.
 */
export async function exportBackup(preferShare: boolean): Promise<ExportResult> {
  const now = new Date();
  const json = JSON.stringify(buildBackup(currentData(), now), null, 2);
  const result = await saveFile(backupFileName(now), json, "application/json", { preferShare, title: "Fiala backup" });
  if (result !== "cancelled") markBackedUp(now);
  return result;
}

export { canShareFiles };

export function restoreBackup(incoming: BackupData, mode: "merge" | "replace"): number {
  const next = mode === "replace" ? { data: incoming, added: countRecords(incoming) } : mergeData(currentData(), incoming);
  doses.replaceAll(next.data.doses);
  vials.replaceAll(next.data.vials);
  schedules.replaceAll(next.data.schedules);
  measurements.replaceAll(next.data.measurements);
  symptoms.replaceAll(next.data.symptoms);
  return next.added;
}

export type PersistState = "persisted" | "not-persisted" | "unsupported";

/** Ask the browser not to clear this app's storage under pressure. */
export async function requestPersistentStorage(): Promise<PersistState> {
  if (!navigator.storage?.persist) return "unsupported";
  try {
    if (await navigator.storage.persisted()) return "persisted";
    return (await navigator.storage.persist()) ? "persisted" : "not-persisted";
  } catch {
    return "unsupported";
  }
}
