import { useSyncExternalStore } from "react";
import { backupFileName, buildBackup, mergeData, type BackupData } from "./backup";
import { doses, downloadFile } from "./doseLog";
import { schedules } from "./schedules";
import { vials } from "./vials";

// Browser side of backup/restore: reading and writing the live collections,
// sharing or downloading the file, and remembering when the last backup ran.

const LAST_BACKUP_KEY = "peptide-compass:last-backup";
const listeners = new Set<() => void>();

export function currentData(): BackupData {
  return { doses: doses.get(), vials: vials.get(), schedules: schedules.get() };
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

export type ExportResult = "shared" | "downloaded" | "cancelled";

/**
 * Prefer the system share sheet (Save to Files, iCloud Drive, AirDrop, email)
 * where the browser supports sharing files; otherwise download the file.
 */
export async function exportBackup(preferShare: boolean): Promise<ExportResult> {
  const now = new Date();
  const json = JSON.stringify(buildBackup(currentData(), now), null, 2);
  const name = backupFileName(now);

  if (preferShare && canShareFiles()) {
    const file = new File([json], name, { type: "application/json" });
    try {
      await navigator.share({ files: [file], title: "Peptide Compass backup" });
      markBackedUp(now);
      return "shared";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
      // Share failed for another reason: fall back to a download.
    }
  }
  downloadFile(name, json, "application/json");
  markBackedUp(now);
  return "downloaded";
}

export function canShareFiles(): boolean {
  try {
    const probe = new File(["{}"], "probe.json", { type: "application/json" });
    return typeof navigator.canShare === "function" && navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

export function restoreBackup(incoming: BackupData, mode: "merge" | "replace"): number {
  const next = mode === "replace" ? { data: incoming, added: incoming.doses.length + incoming.vials.length + incoming.schedules.length } : mergeData(currentData(), incoming);
  doses.replaceAll(next.data.doses);
  vials.replaceAll(next.data.vials);
  schedules.replaceAll(next.data.schedules);
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
