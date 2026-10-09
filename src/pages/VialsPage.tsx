import { useState, type FormEvent } from "react";
import { useCurrency } from "../lib/currency";
import { formatMoney } from "../lib/insights";
import { PeptideField, choiceId, choiceName, emptyChoice, type PeptideChoice } from "../components/PeptideField";
import { TrackerNav } from "../components/TrackerNav";
import { formatDateKey, localDateKey } from "../lib/dates";
import { useDoseLog } from "../lib/doseLog";
import { fmt } from "../lib/reconstitution";
import { href } from "../lib/router";
import { DEFAULT_DISCARD_DAYS, concentrationMgPerMl, useVials, vialStatus, vials, type Vial, type VialStatus } from "../lib/vials";

export interface VialPrefill {
  peptide?: string;
  vialMg?: string;
  waterMl?: string;
}

export function vialAlert(s: VialStatus): { tone: "danger" | "warn"; text: string } | undefined {
  if (s.expired) return { tone: "danger", text: `Past its discard date (${formatDateKey(s.discardOn)})` };
  if (s.empty) return { tone: "warn", text: "Empty: mark it finished" };
  if (s.expiringSoon) return { tone: "warn", text: s.daysUntilDiscard === 0 ? "Discard date is today" : `Discard in ${s.daysUntilDiscard} day${s.daysUntilDiscard === 1 ? "" : "s"}` };
  if (s.low) return { tone: "warn", text: `Running low: about ${s.dosesLeft} dose${s.dosesLeft === 1 ? "" : "s"} left` };
  return undefined;
}

export function VialsPage({ prefill }: { prefill: VialPrefill }) {
  const allVials = useVials();
  const entries = useDoseLog();
  const [showForm, setShowForm] = useState(!!(prefill.peptide || prefill.vialMg) || allVials.length === 0);
  const [showFinished, setShowFinished] = useState(false);

  const active = allVials.filter((v) => !v.finished);
  const finished = allVials.filter((v) => v.finished);

  return (
    <div className="page">
      <h1>Tracker</h1>
      <TrackerNav current="tracker/vials" />
      <p className="muted small">
        Keep track of each mixed vial: how much is left (worked out from the doses you log against it) and when to
        throw it away.
      </p>

      {showForm ? (
        <VialForm prefill={prefill} onDone={() => setShowForm(false)} canCancel={allVials.length > 0} />
      ) : (
        <button type="button" className="button" onClick={() => setShowForm(true)}>
          + Add a mixed vial
        </button>
      )}

      {active.length > 0 && <h2>Active vials</h2>}
      <ul className="list">
        {active.map((v) => (
          <VialCard key={v.id} vial={v} status={vialStatus(v, entries)} />
        ))}
      </ul>

      {finished.length > 0 && (
        <button type="button" className="link-button neutral" onClick={() => setShowFinished((s) => !s)}>
          {showFinished ? "Hide" : "Show"} finished vials ({finished.length})
        </button>
      )}
      {showFinished && (
        <ul className="list">
          {finished.map((v) => (
            <VialCard key={v.id} vial={v} status={vialStatus(v, entries)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function VialCard({ vial, status }: { vial: Vial; status: VialStatus }) {
  const currency = useCurrency();
  const alert = vial.finished ? undefined : vialAlert(status);
  const pct = Math.round(status.remainingFraction * 100);
  return (
    <li className={`card vial-card${vial.finished ? " finished" : ""}`}>
      <div className="row">
        <strong>{vial.peptideName}</strong>
        <span className="muted small">
          {vial.vialMg} mg + {vial.waterMl} mL
        </span>
      </div>

      <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Peptide remaining">
        <div className={`meter-fill${status.low || status.empty ? " low" : ""}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="row small">
        <span>
          <strong>{fmt(status.remainingMg, 3)} mg</strong> left of {vial.vialMg} mg
        </span>
        {status.dosesLeft !== undefined && <span className="muted">≈ {status.dosesLeft} doses</span>}
      </div>

      <dl className="vial-facts small">
        <div>
          <dt>Strength</dt>
          <dd>{fmt(concentrationMgPerMl(vial), 3)} mg/mL</dd>
        </div>
        <div>
          <dt>Mixed</dt>
          <dd>
            {formatDateKey(vial.mixedOn)} ({status.daysSinceMixed === 0 ? "today" : `${status.daysSinceMixed} day${status.daysSinceMixed === 1 ? "" : "s"} ago`})
          </dd>
        </div>
        <div>
          <dt>Discard by</dt>
          <dd>{formatDateKey(status.discardOn)}</dd>
        </div>
        <div>
          <dt>Doses logged</dt>
          <dd>{status.dosesLogged}</dd>
        </div>
      </dl>

      {alert && <p className={`alert ${alert.tone}`}>{alert.text}</p>}
      {vial.notes && <p className="small">{vial.notes}</p>}
      {vial.cost && <p className="muted small">Cost: {formatMoney(vial.cost, currency)}</p>}

      <div className="actions">
        {!vial.finished && (
          <a className="button small" href={href("tracker", { peptide: vial.peptideId ?? undefined })}>
            Log dose
          </a>
        )}
        <button type="button" className="button secondary small" onClick={() => vials.update(vial.id, { finished: !vial.finished })}>
          {vial.finished ? "Reactivate" : "Mark finished"}
        </button>
        <button
          type="button"
          className="link-button"
          onClick={() => {
            if (confirm(`Delete this ${vial.peptideName} vial? Logged doses are kept.`)) vials.remove(vial.id);
          }}
        >
          Delete
        </button>
      </div>
    </li>
  );
}

function VialForm({ prefill, onDone, canCancel }: { prefill: VialPrefill; onDone: () => void; canCancel: boolean }) {
  const [peptide, setPeptide] = useState<PeptideChoice>(emptyChoice(prefill.peptide));
  const [vialMg, setVialMg] = useState(prefill.vialMg ?? "");
  const [waterMl, setWaterMl] = useState(prefill.waterMl ?? "");
  const [mixedOn, setMixedOn] = useState(localDateKey());
  const [discardAfterDays, setDiscardAfterDays] = useState(String(DEFAULT_DISCARD_DAYS));
  const [notes, setNotes] = useState("");
  const [cost, setCost] = useState("");
  const currency = useCurrency();
  const [error, setError] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const name = choiceName(peptide);
    const mg = parseFloat(vialMg);
    const ml = parseFloat(waterMl);
    const days = parseInt(discardAfterDays, 10);
    if (!name) return setError("Choose a peptide or enter a name.");
    if (!(mg > 0)) return setError("Enter the amount of peptide in the vial.");
    if (!(ml > 0)) return setError("Enter how much water you added.");
    if (!(days > 0)) return setError("Enter how many days to keep the vial after mixing.");
    if (!mixedOn) return setError("Enter the date you mixed the vial.");
    const price = cost.trim() ? parseFloat(cost) : undefined;
    if (price !== undefined && !(price > 0)) return setError("Enter a cost greater than 0, or leave it blank.");
    vials.add({ peptideId: choiceId(peptide), peptideName: name, vialMg: mg, waterMl: ml, mixedOn, discardAfterDays: days, finished: false, notes: notes.trim() || undefined, cost: price });
    onDone();
  };

  return (
    <form className="card form" onSubmit={submit}>
      <h2>New mixed vial</h2>
      <PeptideField value={peptide} onChange={setPeptide} />
      <div className="two-col">
        <label>
          <span>Peptide in vial</span>
          <div className="input-suffix">
            <input inputMode="decimal" value={vialMg} onChange={(e) => setVialMg(e.target.value)} />
            <em>mg</em>
          </div>
        </label>
        <label>
          <span>Water added</span>
          <div className="input-suffix">
            <input inputMode="decimal" value={waterMl} onChange={(e) => setWaterMl(e.target.value)} />
            <em>mL</em>
          </div>
        </label>
      </div>
      <div className="two-col">
        <label>
          <span>Mixed on</span>
          <input type="date" value={mixedOn} max={localDateKey()} onChange={(e) => setMixedOn(e.target.value)} />
        </label>
        <label>
          <span>Discard after</span>
          <div className="input-suffix">
            <input inputMode="numeric" value={discardAfterDays} onChange={(e) => setDiscardAfterDays(e.target.value)} />
            <em>days</em>
          </div>
        </label>
      </div>
      <small className="hint">
        Many suppliers suggest using a mixed vial within about 4 weeks when refrigerated. Follow the guidance for your
        product.
      </small>
      <label>
        <span>Cost (optional)</span>
        <div className="input-suffix">
          <input inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} />
          <em>{currency}</em>
        </div>
        <small className="hint">What you paid for this vial. Fiala Plus turns this into spend and cost-per-dose insights.</small>
      </label>
      <label>
        <span>Notes</span>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Batch number, supplier, etc." />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button className="button" type="submit">
          Save vial
        </button>
        {canCancel && (
          <button type="button" className="button secondary" onClick={onDone}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
