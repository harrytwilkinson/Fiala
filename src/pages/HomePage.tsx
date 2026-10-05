import { useDoseLog } from "../lib/doseLog";
import { href } from "../lib/router";

export function HomePage() {
  const { entries } = useDoseLog();
  const last = entries[0];

  return (
    <div className="page">
      <h1>Peptide Compass</h1>
      <p className="lead">Learn about peptides, mix them accurately, and keep track of every dose.</p>

      <div className="tiles">
        <a className="card tile" href={href("library")}>
          <span className="tile-icon" aria-hidden>📚</span>
          <strong>Library</strong>
          <span className="muted small">What each peptide does and what the evidence says</span>
        </a>
        <a className="card tile" href={href("calculator")}>
          <span className="tile-icon" aria-hidden>🧮</span>
          <strong>Calculator</strong>
          <span className="muted small">Bacteriostatic water and syringe units</span>
        </a>
        <a className="card tile" href={href("tracker")}>
          <span className="tile-icon" aria-hidden>📈</span>
          <strong>Tracker</strong>
          <span className="muted small">Log doses, injection sites and notes</span>
        </a>
      </div>

      {last && (
        <section className="card">
          <h2>Last dose</h2>
          <p>
            <strong>{last.peptideName}</strong>: {last.amount} {last.unit}
            <br />
            <span className="muted small">{new Date(last.takenAt).toLocaleString()}</span>
          </p>
        </section>
      )}

      <section className="card disclaimer">
        <h2>Important</h2>
        <p className="small">
          Peptide Compass is for education and personal record-keeping only and is not medical advice. Many peptides
          sold online are not approved for human use and may be impure or mislabeled. Always talk to a qualified
          healthcare professional before using any peptide, and double-check every calculation before you inject.
        </p>
      </section>
    </div>
  );
}
