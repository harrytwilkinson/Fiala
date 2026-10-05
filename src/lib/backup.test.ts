import { describe, expect, it } from "vitest";
import { BackupError, backupFileName, backupIsDue, buildBackup, mergeData, parseBackup, type BackupData } from "./backup";

const data: BackupData = {
  doses: [{ id: "d1", peptideId: "bpc-157", peptideName: "BPC-157", amount: 250, unit: "mcg", takenAt: "2026-10-05T08:00:00.000Z", vialId: "v1", site: "Abdomen – left" }],
  vials: [{ id: "v1", peptideId: "bpc-157", peptideName: "BPC-157", vialMg: 5, waterMl: 2, mixedOn: "2026-10-01", discardAfterDays: 28, finished: false }],
  schedules: [
    { id: "s1", peptideId: null, peptideName: "Custom", amount: 1, unit: "mg", frequency: { kind: "weekly", days: [1, 4] }, time: "08:30", startDate: "2026-10-05", active: true },
    { id: "s2", peptideId: "tb-500", peptideName: "TB-500", amount: 2, unit: "mg", frequency: { kind: "interval", everyDays: 3 }, time: "20:00", startDate: "2026-10-05", endDate: "2026-12-31", active: false },
  ],
};

describe("backup round trip", () => {
  it("restores exactly what was exported", () => {
    const file = buildBackup(data, new Date("2026-10-05T12:00:00Z"));
    const parsed = parseBackup(JSON.stringify(file));
    expect(parsed.data).toEqual(data);
    expect(parsed.skipped).toBe(0);
    expect(parsed.exportedAt).toBe("2026-10-05T12:00:00.000Z");
  });

  it("names files by local date", () => {
    expect(backupFileName(new Date(2026, 9, 5, 23, 30))).toBe("peptide-compass-backup-2026-10-05.json");
  });
});

describe("parseBackup validation", () => {
  it("rejects files that aren't backups", () => {
    expect(() => parseBackup("not json")).toThrow(BackupError);
    expect(() => parseBackup(JSON.stringify({ hello: "world" }))).toThrow(/isn't a Peptide Compass backup/);
    expect(() => parseBackup(JSON.stringify([1, 2]))).toThrow(BackupError);
  });

  it("rejects backups from a newer app version", () => {
    const file = { ...buildBackup(data), version: 99 };
    expect(() => parseBackup(JSON.stringify(file))).toThrow(/newer version/);
  });

  it("skips malformed records and keeps the good ones", () => {
    const file = buildBackup(data);
    const tampered = JSON.parse(JSON.stringify(file));
    tampered.data.doses.push({ id: "bad", peptideName: "X", amount: -1, unit: "mcg", takenAt: "2026-10-05" });
    tampered.data.doses.push({ id: "bad2", peptideId: null, peptideName: "X", amount: 1, unit: "ml", takenAt: "2026-10-05" });
    tampered.data.vials.push({ id: "bad3", peptideId: null, peptideName: "X", vialMg: 5, waterMl: 2, mixedOn: "5 Oct", discardAfterDays: 28, finished: false });
    tampered.data.schedules.push({ ...data.schedules[0], id: "bad4", frequency: { kind: "weekly", days: [] } });
    tampered.data.schedules.push({ ...data.schedules[0], id: "bad5", time: "8am" });
    tampered.data.schedules.push("nonsense");
    const parsed = parseBackup(JSON.stringify(tampered));
    expect(parsed.skipped).toBe(6);
    expect(parsed.data).toEqual(data);
  });

  it("treats missing lists as empty", () => {
    const parsed = parseBackup(JSON.stringify({ app: "peptide-compass", version: 1, data: { doses: data.doses } }));
    expect(parsed.data.vials).toEqual([]);
    expect(parsed.data.schedules).toEqual([]);
  });
});

describe("mergeData", () => {
  it("adds only records that aren't already present", () => {
    const current: BackupData = { doses: [{ ...data.doses[0], amount: 999 }], vials: [], schedules: [] };
    const { data: merged, added } = mergeData(current, data);
    expect(added).toBe(3); // the vial and both schedules; d1 already exists
    expect(merged.doses).toHaveLength(1);
    expect(merged.doses[0].amount).toBe(999); // existing record wins
    expect(merged.vials).toHaveLength(1);
    expect(merged.schedules).toHaveLength(2);
  });
});

describe("backupIsDue", () => {
  it("nudges when there is data and no recent backup", () => {
    expect(backupIsDue(null, false, "2026-10-05")).toBe(false);
    expect(backupIsDue(null, true, "2026-10-05")).toBe(true);
    expect(backupIsDue("2026-09-20T10:00:00Z", true, "2026-10-05")).toBe(false);
    expect(backupIsDue("2026-09-01T10:00:00Z", true, "2026-10-05")).toBe(true);
    expect(backupIsDue("garbage", true, "2026-10-05")).toBe(true);
  });
});
