import { useState, type FormEvent } from "react";
import { TrackerNav } from "../components/TrackerNav";
import { WeightChart } from "../components/WeightChart";
import {
  formatLength,
  formatWeight,
  formatWeightChange,
  inRange,
  inToCm,
  lbToKg,
  measurements,
  setBodyUnits,
  useBodyUnits,
  useMeasurements,
  weightSeries,
  weightSummary,
  type Range,
} from "../lib/body";
import { formatDateKey, localDateKey } from "../lib/dates";
import { useDoseLog } from "../lib/doseLog";
import { href } from "../lib/router";

const RANGES: { value: Range; label: string }[] = [
  { value: "1m", label: "1 month" },
  { value: "3m", label: "3 months" },
  { value: "6m", label: "6 months" },
  { value: "all", label: "All" },
];

export function BodyPage() {
  const list = useMeasurements();
  const entries = useDoseLog();
  const units = useBodyUnits();
  const [range, setRange] = useState<Range>("3m");
  const [dosePeptide, setDosePeptide] = useState("");

  const [date, setDate] = useState(localDateKey());
  const [weight, setWeight] = useState("");
  const [pounds, setPounds] = useState(""); // the "lb" part when entering stone + lb
  const [waist, setWaist] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const series = weightSeries(list);
  const shown = inRange(series, range);
  const summary = weightSummary(series);
  const peptideNames = [...new Set(entries.map((e) => e.peptideName))].sort();
  const doseDates = dosePeptide ? entries.filter((e) => e.peptideName === dosePeptide).map((e) => localDateKey(new Date(e.takenAt))) : [];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const w = parseFloat(weight);
    const extraLb = parseFloat(pounds) || 0;
    const wc = parseFloat(waist);
    let weightKg: number | undefined;
    if (weight.trim()) {
      if (!Number.isFinite(w) || w <= 0) return setError("Enter a weight greater than 0.");
      weightKg = units.weight === "kg" ? w : units.weight === "lb" ? lbToKg(w) : lbToKg(w * 14 + extraLb);
    }
    let waistCm: number | undefined;
    if (waist.trim()) {
      if (!Number.isFinite(wc) || wc <= 0) return setError("Enter a waist measurement greater than 0.");
      waistCm = units.length === "cm" ? wc : inToCm(wc);
    }
    if (weightKg === undefined && waistCm === undefined) return setError("Enter a weight, a waist measurement, or both.");
    measurements.add({ date, weightKg, waistCm, notes: notes.trim() || undefined });
    setError("");
    setWeight("");
    setPounds("");
    setWaist("");
    setNotes("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="page">
      <h1>Tracker</h1>
      <TrackerNav current="tracker/body" />

      <div className="row">
        <h2>Weight</h2>
        <div className="segmented" role="group" aria-label="Weight unit">
          {(["kg", "lb", "st"] as const).map((u) => (
            <button type="button" key={u} className={units.weight === u ? "active" : ""} onClick={() => setBodyUnits({ weight: u })}>
              {u === "st" ? "st & lb" : u}
            </button>
          ))}
        </div>
      </div>

      {summary ? (
        <section className="card">
          <dl className="stat-row">
            <div>
              <dt>Latest</dt>
              <dd>{formatWeight(summary.latest.kg, units.weight)}</dd>
            </div>
            <div>
              <dt>Since first entry</dt>
              <dd>{formatWeightChange(summary.sinceStart, units.weight)}</dd>
            </div>
            <div>
              <dt>Last 4 weeks</dt>
              <dd>{summary.last4Weeks === undefined ? "—" : formatWeightChange(summary.last4Weeks, units.weight)}</dd>
            </div>
          </dl>
        </section>
      ) : (
        <p className="muted">Add your weight below to start a chart. Weekly, at the same time of day, works well.</p>
      )}

      {series.length >= 2 && (
        <section className="card">
          <div className="chips" role="group" aria-label="Time range">
            {RANGES.map((r) => (
              <button type="button" key={r.value} className={range === r.value ? "chip active" : "chip"} aria-pressed={range === r.value} onClick={() => setRange(r.value)}>
                {r.label}
              </button>
            ))}
          </div>
          {shown.length >= 2 ? (
            <WeightChart points={shown} unit={units.weight} doseDates={doseDates} doseLabel={dosePeptide} />
          ) : (
            <p className="muted small">Not enough readings in this period. Try a longer range.</p>
          )}
          {peptideNames.length > 0 && (
            <label>
              <span className="small">Show doses of</span>
              <select value={dosePeptide} onChange={(e) => setDosePeptide(e.target.value)}>
                <option value="">None</option>
                {peptideNames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          )}
        </section>
      )}

      <form className="card form" onSubmit={submit}>
        <h2>Add a measurement</h2>
        <label>
          <span>Date</span>
          <input type="date" value={date} max={localDateKey()} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          <span>Weight</span>
          {units.weight === "st" ? (
            <div className="two-col">
              <div className="input-suffix">
                <input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} aria-label="Stone" />
                <em>st</em>
              </div>
              <div className="input-suffix">
                <input inputMode="decimal" value={pounds} onChange={(e) => setPounds(e.target.value)} aria-label="Pounds" />
                <em>lb</em>
              </div>
            </div>
          ) : (
            <div className="input-suffix">
              <input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
              <em>{units.weight}</em>
            </div>
          )}
        </label>
        <label>
          <span>Waist (optional)</span>
          <div className="input-suffix">
            <input inputMode="decimal" value={waist} onChange={(e) => setWaist(e.target.value)} />
            <div className="segmented" role="group" aria-label="Length unit">
              {(["cm", "in"] as const).map((u) => (
                <button type="button" key={u} className={units.length === u ? "active" : ""} onClick={() => setBodyUnits({ length: u })}>
                  {u}
                </button>
              ))}
            </div>
          </div>
          <small className="hint">Measure around your belly button, breathing out normally.</small>
        </label>
        <label>
          <span>Notes (optional)</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. after breakfast" />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="button" type="submit">
          {saved ? "Saved ✓" : "Save measurement"}
        </button>
      </form>

      <h2>History</h2>
      <p className="muted small">
        Saved only on this device. <a href={href("backup")}>Back it up</a> so you don't lose it.
      </p>
      {list.length === 0 && <p className="muted">No measurements yet.</p>}
      <ul className="list">
        {list.map((m) => (
          <li key={m.id} className="card history-item">
            <div className="row">
              <strong>{formatDateKey(m.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</strong>
              <span>
                {[m.weightKg && formatWeight(m.weightKg, units.weight), m.waistCm && `waist ${formatLength(m.waistCm, units.length)}`].filter(Boolean).join(" · ")}
              </span>
            </div>
            {m.notes && <p className="small">{m.notes}</p>}
            <button
              type="button"
              className="link-button"
              onClick={() => {
                if (confirm("Delete this measurement?")) measurements.remove(m.id);
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
