import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { BackupError, countRecords, parseBackup, type ParsedBackup } from "../lib/backup";
import { canShareFiles, exportBackup, requestPersistentStorage, restoreBackup, useLastBackupAt, type PersistState } from "../lib/backupDevice";
import { useDoseLog } from "../lib/doseLog";
import { href } from "../lib/router";
import { useMeasurements } from "../lib/body";
import { useSchedules } from "../lib/schedules";
import { useSymptoms } from "../lib/symptoms";
import { useVials } from "../lib/vials";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function summary(d: { doses: unknown[]; vials: unknown[]; schedules: unknown[]; measurements: unknown[]; symptoms: unknown[] }) {
  const parts = [plural(d.doses.length, "dose"), plural(d.vials.length, "vial"), plural(d.schedules.length, "schedule")];
  if (d.measurements.length) parts.push(plural(d.measurements.length, "measurement"));
  if (d.symptoms.length) parts.push(plural(d.symptoms.length, "side-effect note"));
  return parts.join(", ");
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function BackupPage() {
  const doses = useDoseLog();
  const vials = useVials();
  const schedules = useSchedules();
  const measurements = useMeasurements();
  const symptomLog = useSymptoms();
  const all = { doses, vials, schedules, measurements, symptoms: symptomLog };
  const lastBackupAt = useLastBackupAt();
  const [shareable] = useState(canShareFiles);
  const [exportMsg, setExportMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<ParsedBackup | null>(null);
  const [restoreMsg, setRestoreMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [persist, setPersist] = useState<PersistState | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const total = countRecords(all);

  useEffect(() => {
    requestPersistentStorage().then(setPersist);
  }, []);

  const doExport = async () => {
    setBusy(true);
    setExportMsg("");
    const result = await exportBackup(shareable);
    setBusy(false);
    if (result === "shared") setExportMsg("Backup saved. Keep it somewhere safe.");
    if (result === "downloaded") setExportMsg("Backup downloaded. Check your Downloads folder, and keep a copy somewhere safe.");
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow choosing the same file again
    if (!file) return;
    setRestoreMsg(null);
    setPending(null);
    try {
      const parsed = parseBackup(await file.text());
      if (countRecords(parsed.data) === 0) {
        setRestoreMsg({ tone: "error", text: "That backup doesn't contain any records." });
        return;
      }
      setPending(parsed);
    } catch (err) {
      setRestoreMsg({ tone: "error", text: err instanceof BackupError ? err.message : "That file couldn't be read." });
    }
  };

  const apply = (mode: "merge" | "replace") => {
    if (!pending) return;
    if (mode === "replace" && total > 0 && !confirm(`Replace everything on this device (${summary(all)}) with this backup? This can't be undone.`)) return;
    const added = restoreBackup(pending.data, mode);
    setPending(null);
    setRestoreMsg({
      tone: "ok",
      text: mode === "replace" ? `Restored ${summary(pending.data)}.` : added > 0 ? `Added ${plural(added, "record")} from the backup.` : "Everything in that backup is already on this device.",
    });
  };

  return (
    <div className="page">
      <a className="back" href={href("")}>
        ← Home
      </a>
      <h1>Backup &amp; restore</h1>
      <p className="muted">
        Your log lives only on this device. Save a backup regularly so you can restore it if you clear your browser,
        lose your phone or switch to a new one.
      </p>

      <section className="card">
        <dl className="stats">
          <div>
            <dt>On this device</dt>
            <dd>{total === 0 ? "Nothing yet" : summary(all)}</dd>
          </div>
          <div>
            <dt>Last backup</dt>
            <dd>{lastBackupAt ? formatWhen(lastBackupAt) : "Never"}</dd>
          </div>
        </dl>
      </section>

      <section className="card form">
        <h2>Back up</h2>
        <p className="muted small">
          {shareable
            ? "Saves one file with all your doses, vials, schedules, measurements and side-effect notes. Choose Save to Files, iCloud Drive or Google Drive, or email it to yourself."
            : "Downloads one file with all your doses, vials, schedules, measurements and side-effect notes. Move it somewhere safe, like cloud storage or an email to yourself."}
        </p>
        <button type="button" className="button" onClick={doExport} disabled={busy || total === 0}>
          {busy ? "Preparing…" : shareable ? "Save backup…" : "Download backup"}
        </button>
        {exportMsg && (
          <p className="notice" role="status">
            {exportMsg}
          </p>
        )}
      </section>

      <section className="card form">
        <h2>Restore</h2>
        <p className="muted small">Open a Fiala backup file. You'll see what's in it before anything changes.</p>
        <input ref={fileInput} type="file" accept="application/json,.json" onChange={onFile} hidden />
        <button type="button" className="button secondary" onClick={() => fileInput.current?.click()}>
          Choose backup file…
        </button>

        {pending && (
          <div className="restore-preview">
            <p>
              <strong>Backup{pending.exportedAt ? ` from ${formatWhen(pending.exportedAt)}` : ""}</strong>
              <br />
              {summary(pending.data)}
            </p>
            {pending.skipped > 0 && (
              <p className="alert warn">
                {plural(pending.skipped, "record")} in this file looked damaged and will be skipped.
              </p>
            )}
            <button type="button" className="button" onClick={() => apply("merge")}>
              Add to what's on this device
            </button>
            <small className="hint">Keeps everything you have now and adds anything from the backup that's missing.</small>
            <button type="button" className="button danger" onClick={() => apply("replace")}>
              Replace everything with this backup
            </button>
            <button type="button" className="link-button neutral" onClick={() => setPending(null)}>
              Cancel
            </button>
          </div>
        )}
        {restoreMsg && (
          <p className={restoreMsg.tone === "ok" ? "notice" : "alert danger"} role="status">
            {restoreMsg.text}
          </p>
        )}
      </section>

      <section className="card">
        <h2>Keeping your data safe</h2>
        <ul className="small">
          <li>
            <strong>Add Fiala to your home screen.</strong> Some browsers, including Safari, may clear data
            for websites you haven't opened in a while. Apps on the home screen are kept.
          </li>
          <li>
            Storage protection:{" "}
            {persist === "persisted" ? (
              <strong>on ✓</strong>
            ) : persist === "not-persisted" ? (
              <>not granted by your browser. Adding the app to your home screen and regular backups are the best protection.</>
            ) : persist === "unsupported" ? (
              <>not available in this browser.</>
            ) : (
              <>checking…</>
            )}
          </li>
          <li>
            Backups contain your health records. Store them somewhere private. See the <a href="privacy.html">privacy policy</a>.
          </li>
        </ul>
      </section>
    </div>
  );
}
