import { useState, type FormEvent } from "react";
import { PEPTIDES, findPeptide } from "../data/peptides";
import { INJECTION_SITES, lastSiteFor, toCsv, useDoseLog, type DoseEntry, type DoseUnit } from "../lib/doseLog";

const CUSTOM = "__custom__";

function localDateTimeValue(d = new Date()): string {
  const offset = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

function groupByDay(entries: DoseEntry[]): [string, DoseEntry[]][] {
  const groups = new Map<string, DoseEntry[]>();
  for (const e of entries) {
    const day = new Date(e.takenAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    groups.set(day, [...(groups.get(day) ?? []), e]);
  }
  return [...groups.entries()];
}

interface Props {
  prefill: { peptide?: string; amount?: string; unit?: string };
}

export function TrackerPage({ prefill }: Props) {
  const { entries, add, remove } = useDoseLog();

  const [peptideId, setPeptideId] = useState(prefill.peptide && findPeptide(prefill.peptide) ? prefill.peptide : "");
  const [customName, setCustomName] = useState("");
  const [amount, setAmount] = useState(prefill.amount ?? "");
  const [unit, setUnit] = useState<DoseUnit>(prefill.unit === "mg" || prefill.unit === "units" ? prefill.unit : "mcg");
  const [site, setSite] = useState("");
  const [takenAt, setTakenAt] = useState(localDateTimeValue());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const peptideName = peptideId === CUSTOM ? customName.trim() : (findPeptide(peptideId)?.name ?? "");
  const previousSite = peptideName ? lastSiteFor(entries, peptideName) : undefined;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!peptideName) return setError("Choose a peptide or enter a name.");
    if (!Number.isFinite(value) || value <= 0) return setError("Enter a dose greater than 0.");
    add({
      peptideId: peptideId === CUSTOM ? null : peptideId,
      peptideName,
      amount: value,
      unit,
      site: site || undefined,
      takenAt: new Date(takenAt).toISOString(),
      notes: notes.trim() || undefined,
    });
    setError("");
    setNotes("");
    setSite("");
    setTakenAt(localDateTimeValue());
  };

  const exportCsv = () => {
    const blob = new Blob([toCsv(entries)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `peptide-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page">
      <h1>Dose tracker</h1>
      <p className="muted">Your log is saved only on this device.</p>

      <form className="card form" onSubmit={submit}>
        <label>
          <span>Peptide</span>
          <select value={peptideId} onChange={(e) => setPeptideId(e.target.value)}>
            <option value="">Choose…</option>
            {PEPTIDES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            <option value={CUSTOM}>Other / custom…</option>
          </select>
        </label>
        {peptideId === CUSTOM && (
          <label>
            <span>Name</span>
            <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. Kisspeptin" />
          </label>
        )}

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

        <label>
          <span>Injection site</span>
          <select value={site} onChange={(e) => setSite(e.target.value)}>
            <option value="">—</option>
            {INJECTION_SITES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {previousSite && <small className="hint">Last time: {previousSite}. Rotating sites helps prevent irritation.</small>}
        </label>

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
          Save dose
        </button>
      </form>

      <div className="row">
        <h2>History</h2>
        {entries.length > 0 && (
          <button type="button" className="button secondary small" onClick={exportCsv}>
            Export CSV
          </button>
        )}
      </div>

      {entries.length === 0 && <p className="muted">No doses logged yet.</p>}
      {groupByDay(entries).map(([day, items]) => (
        <section key={day} className="history-day">
          <h3>{day}</h3>
          <ul className="list">
            {items.map((e) => (
              <li key={e.id} className="card history-item">
                <div className="row">
                  <strong>{e.peptideName}</strong>
                  <span>
                    {e.amount} {e.unit}
                  </span>
                </div>
                <div className="muted small">
                  {new Date(e.takenAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                  {e.site && <> · {e.site}</>}
                </div>
                {e.notes && <p className="small">{e.notes}</p>}
                <button
                  type="button"
                  className="link-button"
                  onClick={() => {
                    if (confirm(`Delete this ${e.peptideName} entry?`)) remove(e.id);
                  }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
