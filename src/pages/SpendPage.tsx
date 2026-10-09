import { PlusGate } from "../components/PlusGate";
import { setCurrency, useCurrency } from "../lib/currency";
import { addDays, localDateKey } from "../lib/dates";
import { useDoseLog } from "../lib/doseLog";
import { CURRENCIES, formatMoney, spend, type Currency } from "../lib/insights";
import { href } from "../lib/router";
import { useVials } from "../lib/vials";

export function SpendPage() {
  return (
    <div className="page">
      <a className="back" href={href("plus")}>
        ← Fiala Plus
      </a>
      <h1>Spend</h1>
      <PlusGate feature="Spend tracking">
        <Spend />
      </PlusGate>
    </div>
  );
}

const monthLabel = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString(undefined, { month: "short", year: "2-digit" });

function Spend() {
  const vials = useVials();
  const entries = useDoseLog();
  const currency = useCurrency();
  const today = localDateKey();
  const all = spend(vials, entries);
  const year = spend(vials, entries, addDays(today, -365));
  const thisMonth = all.byMonth.find((m) => m.month === today.slice(0, 7))?.total ?? 0;
  const last12 = year.byMonth.slice(-12);
  const max = Math.max(...last12.map((m) => m.total), 1);
  const money = (n: number) => formatMoney(n, currency);

  return (
    <>
      <div className="row">
        <p className="muted small">From the cost you enter when saving a vial, counted in the month it was mixed.</p>
        <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} aria-label="Currency">
          {CURRENCIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      {all.total === 0 ? (
        <section className="card">
          <p>No costs yet.</p>
          <p className="muted small">
            Add a cost when you <a href={href("tracker/vials")}>save a mixed vial</a>, and your spend will appear here.
          </p>
        </section>
      ) : (
        <>
          <section className="card">
            <dl className="stat-row">
              <div>
                <dt>This month</dt>
                <dd>{money(thisMonth)}</dd>
              </div>
              <div>
                <dt>Last 12 months</dt>
                <dd>{money(year.total)}</dd>
              </div>
              <div>
                <dt>All time</dt>
                <dd>{money(all.total)}</dd>
              </div>
            </dl>
          </section>

          {last12.length > 0 && (
            <section className="card">
              <h2>By month</h2>
              <ul className="bars">
                {last12.map((m) => (
                  <li key={m.month}>
                    <span className="bar-label">{monthLabel(m.month)}</span>
                    <span className="bar-track">
                      <span className="bar-fill" style={{ width: `${(m.total / max) * 100}%` }} />
                    </span>
                    <span className="bar-value">{money(m.total)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card">
            <h2>Cost per dose</h2>
            {all.perDose.length === 0 ? (
              <p className="muted small">Log doses from a costed vial to see what each dose costs.</p>
            ) : (
              <table className="blend-table">
                <thead>
                  <tr>
                    <th scope="col">Peptide</th>
                    <th scope="col">Per dose</th>
                    <th scope="col">Doses</th>
                  </tr>
                </thead>
                <tbody>
                  {all.perDose.map((p) => (
                    <tr key={p.peptideName}>
                      <th scope="row">{p.peptideName}</th>
                      <td>{money(p.cost)}</td>
                      <td className="muted">{p.doses}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="muted small">Average from the doses logged against each costed vial.</p>
          </section>
        </>
      )}
    </>
  );
}
