import { useState, type FormEvent } from "react";
import { PeptideField, choiceId, choiceName, emptyChoice, type PeptideChoice } from "../components/PeptideField";
import { Head } from "../components/Calibre";
import { Icon } from "../components/Icon";
import { LogTape } from "../components/LogTape";
import { TrackerNav } from "../components/TrackerNav";
import { addDays, formatDateKey, localDateKey, localDateTimeValue } from "../lib/dates";
import { doses, lastSiteFor, siteLastUsed, toCsv, useDoseLog, type DoseEntry, type DoseUnit } from "../lib/doseLog";
import { SiteMap } from "../components/SiteMap";
import { saveFile } from "../lib/files";
import { href } from "../lib/router";
import { schedules, useSchedules } from "../lib/schedules";
import { doseStreak } from "../lib/streak";
import { defaultVialFor, useVials } from "../lib/vials";
import { tapFeedback } from "../lib/haptics";

const NO_VIAL = "";

function groupByDay(entries: DoseEntry[]): [string, DoseEntry[]][] {
  const groups = new Map<string, DoseEntry[]>();
  for (const e of entries) {
    const day = new Date(e.takenAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    groups.set(day, [...(groups.get(day) ?? []), e]);
  }
  return [...groups.entries()];
}

export interface TrackerPrefill {
  peptide?: string;
  amount?: string;
  unit?: string;
  schedule?: string;
}

export function TrackerPage({ prefill }: { prefill: TrackerPrefill }) {
  const entries = useDoseLog();
  const allVials = useVials();
  const schedule = prefill.schedule ? schedules.get().find((s) => s.id === prefill.schedule) : undefined;

  const [peptide, setPeptide] = useState<PeptideChoice>(() => {
    if (schedule && !schedule.peptideId) return { selected: "__custom__", customName: schedule.peptideName };
    return emptyChoice(schedule?.peptideId ?? prefill.peptide);
  });
  const [amount, setAmount] = useState(schedule ? String(schedule.amount) : (prefill.amount ?? ""));
  const [unit, setUnit] = useState<DoseUnit>(() => {
    const u = schedule?.unit ?? prefill.unit;
    return u === "mg" || u === "units" ? u : "mcg";
  });
  const [site, setSite] = useState("");
  const [takenAt, setTakenAt] = useState(localDateTimeValue());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const peptideName = choiceName(peptide);
  const previousSite = peptideName ? lastSiteFor(entries, peptideName) : undefined;
  const vialOptions = allVials.filter((v) => !v.finished && v.peptideName === peptideName);
  // undefined = follow the default for the chosen peptide; "" = explicitly no vial
  const [vialChoice, setVialChoice] = useState<string | undefined>(undefined);
  const vialId = vialChoice ?? defaultVialFor(allVials, peptideName)?.id ?? NO_VIAL;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!peptideName) return setError("Choose a peptide or enter a name.");
    if (!Number.isFinite(value) || value <= 0) return setError("Enter a dose greater than 0.");
    if (unit === "units" && !vialId) return setError("To log in syringe units, pick the vial it came from so the dose can be worked out.");
    doses.add({
      peptideId: choiceId(peptide),
      peptideName,
      amount: value,
      unit,
      site: site || undefined,
      takenAt: new Date(takenAt).toISOString(),
      notes: notes.trim() || undefined,
      vialId: vialId || undefined,
      scheduleId: schedule && schedule.peptideName === peptideName ? schedule.id : undefined,
    });
    tapFeedback("success");
    setError("");
    setNotes("");
    setSite("");
    setTakenAt(localDateTimeValue());
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const today = localDateKey();
  const weekStart = addDays(today, -6);
  const weekCount = entries.filter((e) => localDateKey(new Date(e.takenAt)) >= weekStart).length;
  const streak = doseStreak(useSchedules(), entries, today);
  const sinceLast = entries[0] ? (Date.now() - new Date(entries[0].takenAt).getTime()) / 3_600_000 : undefined;
  const lastAgo = sinceLast === undefined ? "nothing logged yet" : sinceLast < 1 ? "last dose under 1 h ago" : sinceLast < 48 ? `last dose ${Math.round(sinceLast)} h ago` : `last dose ${Math.round(sinceLast / 24)} d ago`;

  const vialLabel = (id?: string) => {
    const v = id && allVials.find((x) => x.id === id);
    return v ? `${v.vialMg} mg vial mixed ${formatDateKey(v.mixedOn)}` : undefined;
  };

  return (
    <div className="page">
      <Head label="Tracker" title="Dose log">
        <div className="cal-count">
          <b>{entries.length}</b>
          <span className="cal-label">logged</span>
        </div>
      </Head>
      <TrackerNav current="tracker" />

      <section className="readout tape-panel">
        <div className="readout-row">
          <span className="cal-label">Last four weeks</span>
          <span className="cal-label b">{lastAgo}</span>
        </div>
        <LogTape entries={entries} />
        <dl className="stats three flat">
          <div>
            <dt>This week</dt>
            <dd>
              {weekCount}
              <i>doses</i>
            </dd>
          </div>
          <div>
            <dt>Streak</dt>
            <dd>
              {streak}
              <i>{streak === 1 ? "day" : "days"}</i>
            </dd>
          </div>
          <div>
            <dt>Active vials</dt>
            <dd>{allVials.filter((v) => !v.finished).length}</dd>
          </div>
        </dl>
      </section>

      {schedule && (
        <p className="notice">
          Logging today's scheduled dose of <strong>{schedule.peptideName}</strong>.
        </p>
      )}

      <div className="cal-sec-h log-h">
        <h2>Log a dose</h2>
        <i aria-hidden />
      </div>
      <form className="card form" onSubmit={submit}>
        <PeptideField
          value={peptide}
          onChange={(v) => {
            setPeptide(v);
            setVialChoice(undefined);
          }}
        />

        <label>
          <span>Dose</span>
          <div className="input-suffix">
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <div className="segmented" role="group" aria-label="Dose unit">
              {(["mcg", "mg", "units"] as const).map((u) => (
                <button type="button" key={u} className={unit === u ? "active" : ""} onClick={() => setUnit(u)}>
                  {u}
                </button>
              ))}
            </div>
          </div>
        </label>

        {peptideName && (
          <label>
            <span>From vial</span>
            <select value={vialId} onChange={(e) => setVialChoice(e.target.value)}>
              <option value={NO_VIAL}>Not tracked</option>
              {vialOptions.map((v) => (
                <option key={v.id} value={v.id}>
                  {vialLabel(v.id)}
                </option>
              ))}
            </select>
            {vialOptions.length === 0 && (
              <small className="hint">
                No active {peptideName} vials. <a href={href("tracker/vials", { peptide: choiceId(peptide) ?? undefined })}>Add one</a> to track how much is left.
              </small>
            )}
          </label>
        )}

        <div>
          <span className="field-label">Injection site</span>
          <SiteMap value={site} onChange={setSite} lastUsed={siteLastUsed(entries)} />
          {previousSite && <small className="hint">Last {peptideName} dose: {previousSite}. Rotating sites helps prevent irritation.</small>}
        </div>

        <label>
          <span>When</span>
          <input type="datetime-local" value={takenAt} onChange={(e) => setTakenAt(e.target.value)} />
        </label>

        <label>
          <span>Notes</span>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How you felt, side effects, etc." />
        </label>

        {error && <p className="error">{error}</p>}
        <button className="button" type="submit">
          {saved ? "Saved ✓" : "Save dose"}
        </button>
      </form>

      <div className="cal-sec-h log-h">
        <h2>History</h2>
        <i aria-hidden />
        {entries.length > 0 && (
          <button type="button" className="pusher" onClick={() => saveFile(`fiala-dose-log-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(entries), "text/csv", { title: "Fiala dose log" })}>
            Export CSV
          </button>
        )}
      </div>
      <p className="cal-fine">
        Your log is saved only on this device. <a href={href("backup")}>Back it up</a> so you don't lose it.
      </p>

      {entries.length === 0 && <p className="cal-empty">No doses logged yet.</p>}
      {groupByDay(entries).map(([day, items]) => (
        <section key={day} className="history-day">
          <h3>{day}</h3>
          <ul className="dose-list">
            {items.map((e) => (
              <li key={e.id} className="log-row">
                <span className="log-time">{new Date(e.takenAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>
                <span className="dose-main">
                  <strong>{e.peptideName}</strong>
                  <span>{[e.site, vialLabel(e.vialId)].filter(Boolean).join(" · ") || "No site recorded"}</span>
                  {e.notes && <em>{e.notes}</em>}
                </span>
                <b className="log-amt">
                  {e.amount}
                  <i>{e.unit}</i>
                </b>
                <button
                  type="button"
                  className="log-del"
                  aria-label={`Delete this ${e.peptideName} entry`}
                  onClick={() => {
                    if (confirm(`Delete this ${e.peptideName} entry?`)) doses.remove(e.id);
                  }}
                >
                  <Icon name="minus" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
