import { daysBetween, localDateKey } from "./dates";
import type { DoseEntry, DoseUnit } from "./doseLog";
import type { Schedule } from "./schedules";
import type { Vial } from "./vials";

// Backup files are plain JSON so they can be saved anywhere (Files, iCloud,
// email) and inspected by a person. Restores validate every record and skip
// anything malformed rather than letting a bad file corrupt the app.

export const BACKUP_APP = "fiala";
/** Backups made before the app was renamed from Peptide Compass. */
const LEGACY_BACKUP_APPS = ["peptide-compass"];
export const BACKUP_VERSION = 1;
export const BACKUP_REMINDER_DAYS = 30;

export interface BackupData {
  doses: DoseEntry[];
  vials: Vial[];
  schedules: Schedule[];
}

export interface BackupFile {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  data: BackupData;
}

export interface ParsedBackup {
  exportedAt?: string;
  data: BackupData;
  /** Records that failed validation and were left out. */
  skipped: number;
}

export class BackupError extends Error {}

export function buildBackup(data: BackupData, now = new Date()): BackupFile {
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), data };
}

export function backupFileName(now = new Date()): string {
  return `fiala-backup-${localDateKey(now)}.json`;
}

export function countRecords(d: BackupData): number {
  return d.doses.length + d.vials.length + d.schedules.length;
}

export function parseBackup(text: string): ParsedBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError("This file isn't a Fiala backup (it couldn't be read as JSON).");
  }
  if (!isObject(raw) || !(raw.app === BACKUP_APP || LEGACY_BACKUP_APPS.includes(raw.app as string)) || !isObject(raw.data)) {
    throw new BackupError("This file isn't a Fiala backup.");
  }
  if (typeof raw.version !== "number" || raw.version > BACKUP_VERSION) {
    throw new BackupError("This backup was made by a newer version of Fiala. Refresh the app to update it, then try again.");
  }

  let skipped = 0;
  const pick = <T>(list: unknown, valid: (x: unknown) => x is T): T[] => {
    if (!Array.isArray(list)) return [];
    const out = list.filter(valid);
    skipped += list.length - out.length;
    return out;
  };

  return {
    exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : undefined,
    data: {
      doses: pick(raw.data.doses, isDose),
      vials: pick(raw.data.vials, isVial),
      schedules: pick(raw.data.schedules, isSchedule),
    },
    skipped,
  };
}

/** Adds incoming records whose id isn't already present; existing records win. */
export function mergeData(current: BackupData, incoming: BackupData): { data: BackupData; added: number } {
  let added = 0;
  const merge = <T extends { id: string }>(a: T[], b: T[]): T[] => {
    const ids = new Set(a.map((x) => x.id));
    const extra = b.filter((x) => !ids.has(x.id));
    added += extra.length;
    return [...a, ...extra];
  };
  return {
    data: {
      doses: merge(current.doses, incoming.doses),
      vials: merge(current.vials, incoming.vials),
      schedules: merge(current.schedules, incoming.schedules),
    },
    added,
  };
}

export function backupIsDue(lastBackupAt: string | null, hasData: boolean, today = localDateKey()): boolean {
  if (!hasData) return false;
  if (!lastBackupAt) return true;
  const last = new Date(lastBackupAt);
  if (Number.isNaN(last.getTime())) return true;
  return daysBetween(localDateKey(last), today) >= BACKUP_REMINDER_DAYS;
}

// --- validation ---------------------------------------------------------

const UNITS: DoseUnit[] = ["mcg", "mg", "units"];
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}
const str = (x: unknown): x is string => typeof x === "string" && x.length > 0;
const optStr = (x: unknown) => x === undefined || typeof x === "string";
const pos = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x) && x > 0;
const peptideId = (x: unknown) => x === null || typeof x === "string";

function isDose(x: unknown): x is DoseEntry {
  return (
    isObject(x) &&
    str(x.id) &&
    peptideId(x.peptideId) &&
    str(x.peptideName) &&
    pos(x.amount) &&
    UNITS.includes(x.unit as DoseUnit) &&
    str(x.takenAt) &&
    !Number.isNaN(Date.parse(x.takenAt)) &&
    optStr(x.site) &&
    optStr(x.notes) &&
    optStr(x.vialId) &&
    optStr(x.scheduleId)
  );
}

function isVial(x: unknown): x is Vial {
  return (
    isObject(x) &&
    str(x.id) &&
    peptideId(x.peptideId) &&
    str(x.peptideName) &&
    pos(x.vialMg) &&
    pos(x.waterMl) &&
    typeof x.mixedOn === "string" &&
    DATE_KEY.test(x.mixedOn) &&
    pos(x.discardAfterDays) &&
    typeof x.finished === "boolean" &&
    optStr(x.notes)
  );
}

function isSchedule(x: unknown): x is Schedule {
  if (!isObject(x) || !isObject(x.frequency)) return false;
  const f = x.frequency;
  const freqOk =
    (f.kind === "weekly" && Array.isArray(f.days) && f.days.length > 0 && f.days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) ||
    (f.kind === "interval" && Number.isInteger(f.everyDays) && (f.everyDays as number) > 0);
  return (
    freqOk &&
    str(x.id) &&
    peptideId(x.peptideId) &&
    str(x.peptideName) &&
    pos(x.amount) &&
    UNITS.includes(x.unit as DoseUnit) &&
    typeof x.time === "string" &&
    TIME.test(x.time) &&
    typeof x.startDate === "string" &&
    DATE_KEY.test(x.startDate) &&
    (x.endDate === undefined || (typeof x.endDate === "string" && DATE_KEY.test(x.endDate))) &&
    typeof x.active === "boolean" &&
    optStr(x.notes)
  );
}
