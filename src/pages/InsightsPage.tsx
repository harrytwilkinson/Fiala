import { PlusGate } from "../components/PlusGate";
import { addDays, formatDateKey, localDateKey } from "../lib/dates";
import { useDoseLog } from "../lib/doseLog";
import { adherence, doseChanges, dosesByPeptide } from "../lib/insights";
import { href } from "../lib/router";
import { describeFrequency, useSchedules } from "../lib/schedules";
import { SEVERITY_LABEL, useSymptoms } from "../lib/symptoms";

const PERIOD_DAYS = 30;

export function InsightsPage() {
  return (
    <div className="page">
      <a className="back" href={href("plus")}>
        ← Fiala Plus
      </a>
      <h1>Insights</h1>
      <PlusGate feature="Insights">
        <Insights />
      </PlusGate>
    </div>
  );
}

function Insights() {
  const entries = useDoseLog();
  const schedules = useSchedules().filter((s) => s.active);
  const symptoms = useSymptoms();
  const today = localDateKey();
  const from = addDays(today, -(PERIOD_DAYS - 1));
  const fromIso = new Date(`${from}T00:00:00`).toISOString();
  const doses = dosesByPeptide(entries, fromIso);
  const changes = doseChanges(entries, symptoms).slice(0, 10);

  return (
    <>
      <p className="muted small">Based on the last {PERIOD_DAYS} days unless stated.</p>

      <section className="card">
        <h2>Sticking to your schedules</h2>
        {schedules.length === 0 ? (
          <p className="muted small">
            No active schedules. <a href={href("tracker/schedules")}>Set one up</a> to see how consistently you keep to it.
          </p>
        ) : (
          <ul className="list">
            {schedules.map((s) => {
              const a = adherence(s, entries, from > s.startDate ? from : s.startDate, today, today);
              const pct = a.rate === null ? null : Math.round(a.rate * 100);
              return (
                <li key={s.id} className="adherence">
                  <div className="row">
                    <strong>
                      {s.peptideName} · {s.amount} {s.unit}
                    </strong>
                    <span>{pct === null ? "—" : `${pct}%`}</span>
                  </div>
                  <div className="meter" role="img" aria-label={pct === null ? "Nothing due yet" : `${a.taken} of ${a.due} due doses logged`}>
                    <div className="meter-fill" style={{ width: `${pct ?? 0}%` }} />
                  </div>
                  <div className="muted small">
                    {describeFrequency(s.frequency)} · {a.taken} of {a.due} logged · streak {a.streak}
                    {a.missed.length > 0 && <> · missed {a.missed.slice(0, 4).map((d) => formatDateKey(d)).join(", ")}{a.missed.length > 4 ? "…" : ""}</>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Side effects after dose changes</h2>
        <p className="muted small">Side effects you noted in the 3 days after each change in dose. A pattern here is worth mentioning to your clinician.</p>
        {changes.length === 0 ? (
          <p className="muted small">No dose changes logged yet.</p>
        ) : (
          <ul className="list">
            {changes.map((c) => (
              <li key={`${c.peptideName}-${c.at}`}>
                <strong>{c.peptideName}</strong>: {c.from} → {c.to}{" "}
                <span className="muted small">{new Date(c.at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
                <div className="small">
                  {c.after.length === 0 ? (
                    <span className="muted">No side effects noted in the next 3 days.</span>
                  ) : (
                    c.after.map((s) => (
                      <span key={s.id} className={`badge ${s.severity === 3 ? "badge-severe" : ""}`}>
                        {s.symptom} · {SEVERITY_LABEL[s.severity]}
                      </span>
                    ))
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Doses logged</h2>
        {doses.length === 0 ? (
          <p className="muted small">No doses in the last {PERIOD_DAYS} days.</p>
        ) : (
          <table className="blend-table">
            <thead>
              <tr>
                <th scope="col">Peptide</th>
                <th scope="col">Doses</th>
                <th scope="col">Last</th>
              </tr>
            </thead>
            <tbody>
              {doses.map((d) => (
                <tr key={d.peptideName}>
                  <th scope="row">{d.peptideName}</th>
                  <td>{d.count}</td>
                  <td className="muted">{new Date(d.last).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="muted small">
          For weight trends see <a href={href("tracker/body")}>Body</a>.
        </p>
      </section>
    </>
  );
}
