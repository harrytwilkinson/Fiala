import { useState, type FormEvent } from "react";
import { TrackerNav } from "../components/TrackerNav";
import { localDateTimeValue } from "../lib/dates";
import { useDoseLog } from "../lib/doseLog";
import { href } from "../lib/router";
import { COMMON_SYMPTOMS, SEVERITY_LABEL, summarise, symptoms, useSymptoms, type Severity } from "../lib/symptoms";

const OTHER = "__other__";
const RECENT_DAYS = 14;

export function SymptomsPage() {
  const list = useSymptoms();
  const entries = useDoseLog();
  const [choice, setChoice] = useState("");
  const [custom, setCustom] = useState("");
  const [severity, setSeverity] = useState<Severity>(1);
  const [at, setAt] = useState(localDateTimeValue());
  const [relatedTo, setRelatedTo] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const since = new Date(Date.now() - RECENT_DAYS * 86_400_000).toISOString();
  const recentPeptides = [...new Set(entries.filter((e) => e.takenAt >= since).map((e) => e.peptideName))];
  const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const summary = summarise(list, monthAgo);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const symptom = choice === OTHER ? custom.trim() : choice;
    if (!symptom) return setError("Choose what you noticed, or describe it under Other.");
    symptoms.add({ at: new Date(at).toISOString(), symptom, severity, relatedTo: relatedTo || undefined, notes: notes.trim() || undefined });
    setError("");
    setChoice("");
    setCustom("");
    setSeverity(1);
    setNotes("");
    setAt(localDateTimeValue());
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="page">
      <h1>Tracker</h1>
      <TrackerNav current="tracker/symptoms" />
      <p className="muted small">Note side effects as they happen to spot patterns and show your doctor. This is a journal, not a diagnosis.</p>

      <form className="card form" onSubmit={submit}>
        <div>
          <span className="field-label">What did you notice?</span>
          <div className="chips">
            {[...COMMON_SYMPTOMS, OTHER].map((s) => (
              <button type="button" key={s} className={choice === s ? "chip active" : "chip"} aria-pressed={choice === s} onClick={() => setChoice(choice === s ? "" : s)}>
                {s === OTHER ? "Other…" : s}
              </button>
            ))}
          </div>
        </div>
        {choice === OTHER && (
          <label>
            <span>Describe it</span>
            <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="e.g. itchy skin" />
          </label>
        )}

        <div>
          <span className="field-label">How bad?</span>
          <div className="segmented wide-buttons" role="group" aria-label="Severity">
            {([1, 2, 3] as const).map((s) => (
              <button type="button" key={s} className={severity === s ? "active" : ""} aria-pressed={severity === s} onClick={() => setSeverity(s)}>
                {SEVERITY_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
        {severity === 3 && (
          <p className="alert danger" role="alert">
            If it's severe, getting worse or you're worried, contact a doctor or pharmacist now. In an emergency, call your
            local emergency number.
          </p>
        )}

        <label>
          <span>When</span>
          <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
        </label>

        {recentPeptides.length > 0 && (
          <label>
            <span>Might be related to (optional)</span>
            <select value={relatedTo} onChange={(e) => setRelatedTo(e.target.value)}>
              <option value="">Not sure</option>
              {recentPeptides.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <small className="hint">Peptides you've logged in the last {RECENT_DAYS} days.</small>
          </label>
        )}

        <label>
          <span>Notes (optional)</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. after a dose increase" />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="button" type="submit">
          {saved ? "Saved ✓" : "Save"}
        </button>
      </form>

      {summary.length > 0 && (
        <section className="card">
          <h2>Last 30 days</h2>
          <table className="blend-table">
            <thead>
              <tr>
                <th scope="col">Side effect</th>
                <th scope="col">Times</th>
                <th scope="col">Worst</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((s) => (
                <tr key={s.symptom}>
                  <th scope="row">{s.symptom}</th>
                  <td>{s.count}</td>
                  <td className={s.worst === 3 ? "severity-3" : undefined}>{SEVERITY_LABEL[s.worst]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <h2>History</h2>
      <p className="muted small">
        Saved only on this device. <a href={href("backup")}>Back it up</a> so you don't lose it.
      </p>
      {list.length === 0 && <p className="muted">Nothing noted yet.</p>}
      <ul className="list">
        {list.map((s) => (
          <li key={s.id} className="card history-item">
            <div className="row">
              <strong>{s.symptom}</strong>
              <span className={s.severity === 3 ? "severity-3" : "muted"}>{SEVERITY_LABEL[s.severity]}</span>
            </div>
            <div className="muted small">
              {new Date(s.at).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
              {s.relatedTo && <> · {s.relatedTo}</>}
            </div>
            {s.notes && <p className="small">{s.notes}</p>}
            <button
              type="button"
              className="link-button"
              onClick={() => {
                if (confirm(`Delete this ${s.symptom} note?`)) symptoms.remove(s.id);
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
