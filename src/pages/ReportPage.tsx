import { useState } from "react";
import { PlusGate } from "../components/PlusGate";
import { WeightChart } from "../components/WeightChart";
import { formatLength, formatWeight, formatWeightChange, useBodyUnits, useMeasurements, weightSeries } from "../lib/body";
import { addDays, formatDateKey, localDateKey } from "../lib/dates";
import { useDoseLog, type DoseEntry } from "../lib/doseLog";
import { adherence } from "../lib/insights";
import { isNative } from "../lib/platform";
import { href } from "../lib/router";
import { describeFrequency, formatTime, useSchedules } from "../lib/schedules";
import { SEVERITY_LABEL, summarise, useSymptoms } from "../lib/symptoms";

const PERIODS = [
  { days: 30, label: "30 days" },
  { days: 90, label: "3 months" },
  { days: 182, label: "6 months" },
  { days: 365, label: "12 months" },
];

export function ReportPage() {
  return (
    <div className="page">
      <a className="back no-print" href={href("plus")}>
        ← Fiala Plus
      </a>
      <h1 className="no-print">Clinician report</h1>
      <PlusGate feature="The clinician report">
        <Report />
      </PlusGate>
    </div>
  );
}

/** Most common dose for a peptide, e.g. "0.5 mg". */
function usualDose(list: DoseEntry[]): string {
  const counts = new Map<string, number>();
  for (const e of list) counts.set(`${e.amount} ${e.unit}`, (counts.get(`${e.amount} ${e.unit}`) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

function Report() {
  const [days, setDays] = useState(90);
  const [name, setName] = useState("");
  const allDoses = useDoseLog();
  const schedules = useSchedules();
  const symptoms = useSymptoms();
  const measurements = useMeasurements();
  const units = useBodyUnits();

  const today = localDateKey();
  const from = addDays(today, -(days - 1));
  const fromIso = new Date(`${from}T00:00:00`).toISOString();
  const doses = allDoses.filter((e) => e.takenAt >= fromIso);
  const byPeptide = new Map<string, DoseEntry[]>();
  for (const e of doses) byPeptide.set(e.peptideName, [...(byPeptide.get(e.peptideName) ?? []), e]);
  const sideEffects = summarise(symptoms, fromIso);
  const symptomList = symptoms.filter((s) => s.at >= fromIso);
  const weights = weightSeries(measurements).filter((p) => p.date >= from);
  const waist = measurements.filter((m) => m.waistCm && m.date >= from).sort((a, b) => a.date.localeCompare(b.date));
  const activeSchedules = schedules.filter((s) => s.active);

  return (
    <>
      <section className="card form no-print">
        <div className="chips" role="group" aria-label="Report period">
          {PERIODS.map((p) => (
            <button type="button" key={p.days} className={days === p.days ? "chip active" : "chip"} aria-pressed={days === p.days} onClick={() => setDays(p.days)}>
              {p.label}
            </button>
          ))}
        </div>
        <label>
          <span>Name on report (optional)</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Leave blank to keep it anonymous" />
        </label>
        {isNative ? (
          <p className="muted small">To save a PDF, open Fiala in your phone's browser at getfiala.com, then use this page there.</p>
        ) : (
          <button type="button" className="button" onClick={() => window.print()}>
            Print or save as PDF
          </button>
        )}
        <small className="hint">In the print screen, choose "Save as PDF" (or Share › Save to Files on iPhone).</small>
      </section>

      <article className="report">
        <header className="report-head">
          <div>
            <h2>Fiala report{name.trim() ? `: ${name.trim()}` : ""}</h2>
            <p className="muted small">
              {formatDateKey(from, { day: "numeric", month: "short", year: "numeric" })} to {formatDateKey(today, { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
          <p className="muted small">Generated {new Date().toLocaleDateString(undefined, { dateStyle: "medium" })}</p>
        </header>

        <section>
          <h3>Summary</h3>
          <dl className="stat-row">
            <div>
              <dt>Doses logged</dt>
              <dd>{doses.length}</dd>
            </div>
            <div>
              <dt>Compounds</dt>
              <dd>{byPeptide.size}</dd>
            </div>
            <div>
              <dt>Side effects noted</dt>
              <dd>{symptomList.length}</dd>
            </div>
          </dl>
        </section>

        <section>
          <h3>Compounds taken</h3>
          {byPeptide.size === 0 ? (
            <p className="muted small">No doses logged in this period.</p>
          ) : (
            <table className="blend-table">
              <thead>
                <tr>
                  <th scope="col">Compound</th>
                  <th scope="col">Doses</th>
                  <th scope="col">Usual dose</th>
                  <th scope="col">First – last</th>
                </tr>
              </thead>
              <tbody>
                {[...byPeptide].map(([n, list]) => (
                  <tr key={n}>
                    <th scope="row">{n}</th>
                    <td>{list.length}</td>
                    <td>{usualDose(list)}</td>
                    <td className="muted">
                      {new Date(list[list.length - 1].takenAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })} –{" "}
                      {new Date(list[0].takenAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {activeSchedules.length > 0 && (
          <section>
            <h3>Schedules and adherence</h3>
            <table className="blend-table">
              <thead>
                <tr>
                  <th scope="col">Schedule</th>
                  <th scope="col">When</th>
                  <th scope="col">Logged</th>
                </tr>
              </thead>
              <tbody>
                {activeSchedules.map((s) => {
                  const a = adherence(s, allDoses, from > s.startDate ? from : s.startDate, today, today);
                  return (
                    <tr key={s.id}>
                      <th scope="row">
                        {s.peptideName} {s.amount} {s.unit}
                      </th>
                      <td className="muted">
                        {describeFrequency(s.frequency)}, {formatTime(s.time)}
                      </td>
                      <td>{a.due === 0 ? "—" : `${a.taken} of ${a.due} (${Math.round((a.rate ?? 0) * 100)}%)`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}

        <section>
          <h3>Side effects</h3>
          {sideEffects.length === 0 ? (
            <p className="muted small">None noted in this period.</p>
          ) : (
            <table className="blend-table">
              <thead>
                <tr>
                  <th scope="col">Side effect</th>
                  <th scope="col">Times</th>
                  <th scope="col">Worst</th>
                  <th scope="col">Last</th>
                </tr>
              </thead>
              <tbody>
                {sideEffects.map((s) => (
                  <tr key={s.symptom}>
                    <th scope="row">{s.symptom}</th>
                    <td>{s.count}</td>
                    <td>{SEVERITY_LABEL[s.worst]}</td>
                    <td className="muted">{new Date(s.lastAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {(weights.length > 0 || waist.length > 0) && (
          <section>
            <h3>Body</h3>
            {weights.length > 0 && (
              <p className="small">
                Weight {formatWeight(weights[0].kg, units.weight)} → {formatWeight(weights[weights.length - 1].kg, units.weight)} (
                {formatWeightChange(weights[weights.length - 1].kg - weights[0].kg, units.weight)}) over {weights.length} readings.
              </p>
            )}
            {weights.length >= 2 && <WeightChart points={weights} unit={units.weight} />}
            {waist.length > 0 && (
              <p className="small">
                Waist {formatLength(waist[0].waistCm!, units.length)} → {formatLength(waist[waist.length - 1].waistCm!, units.length)}.
              </p>
            )}
          </section>
        )}

        <section>
          <h3>Dose log</h3>
          {doses.length === 0 ? (
            <p className="muted small">No doses logged in this period.</p>
          ) : (
            <table className="blend-table report-log">
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Compound</th>
                  <th scope="col">Dose</th>
                  <th scope="col">Site</th>
                </tr>
              </thead>
              <tbody>
                {doses.map((e) => (
                  <tr key={e.id}>
                    <td>{when(e.takenAt)}</td>
                    <td>{e.peptideName}</td>
                    <td>
                      {e.amount} {e.unit}
                    </td>
                    <td className="muted">
                      {e.site ?? ""}
                      {e.notes ? ` · ${e.notes}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <footer className="muted small report-foot">
          Recorded by the patient in Fiala (getfiala.com). This is a personal log, not a medical record, and has not been
          checked by a clinician.
        </footer>
      </article>
    </>
  );
}
