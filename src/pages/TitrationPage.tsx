import { useState, type FormEvent } from "react";
import { PlusGate } from "../components/PlusGate";
import { TITRATION_PRODUCTS, findTitrationProduct, type TitrationProduct } from "../data/titration";
import { formatDateKey, localDateKey } from "../lib/dates";
import { href } from "../lib/router";
import { moveToStep, titrationStatus, titrations, useTitrations, type TitrationPlan } from "../lib/titration";

export function TitrationPage() {
  return (
    <div className="page">
      <a className="back" href={href("plus")}>
        ← Fiala Plus
      </a>
      <h1>Dose steps</h1>
      <PlusGate feature="Dose steps">
        <Titration />
      </PlusGate>
    </div>
  );
}

const fmtMg = (mg: number) => `${mg} mg`;

function Titration() {
  const plans = useTitrations();
  const [adding, setAdding] = useState(plans.length === 0);
  return (
    <>
      <p className="notice small">
        Shows where you are on your product's official label schedule. It never tells you to change dose: only move to a
        new step when your prescriber has told you to. Many people stay on a step longer or keep a lower dose.
      </p>
      {plans.map((plan) => {
        const product = findTitrationProduct(plan.productId);
        return product ? <PlanCard key={plan.id} plan={plan} product={product} /> : null;
      })}
      {adding ? (
        <PlanForm onDone={() => setAdding(false)} />
      ) : (
        <button type="button" className="button" onClick={() => setAdding(true)}>
          Track another product
        </button>
      )}
    </>
  );
}

function PlanCard({ plan, product }: { plan: TitrationPlan; product: TitrationProduct }) {
  const today = localDateKey();
  const status = titrationStatus(plan, product, today);
  const [confirming, setConfirming] = useState(false);
  const unit = product.frequency === "weekly" ? "a week" : "a day";

  return (
    <section className="card titration">
      <div className="row">
        <h2>{product.brand}</h2>
        <span className="muted small">
          {fmtMg(product.steps[plan.stepIndex].mg)} {unit}
        </span>
      </div>

      <ol className="steps-ladder">
        {product.steps.map((step, i) => (
          <li key={i} className={i < plan.stepIndex ? "past" : i === plan.stepIndex ? "current" : ""}>
            <span className="step-dot" aria-hidden />
            <span className="mono">{fmtMg(step.mg)}</span>
            <span className="muted small">
              {i === plan.stepIndex
                ? `You're here · week ${status.weeksOnStep + 1}`
                : step.minWeeks
                  ? `At least ${step.minWeeks} week${step.minWeeks === 1 ? "" : "s"}`
                  : "Top of the label schedule"}
            </span>
          </li>
        ))}
      </ol>

      <p className="small">
        {status.isLast
          ? "You're on the last step of the label schedule."
          : status.nextAllowed
            ? `The label allows the next step from ${formatDateKey(status.earliestNext!)}, if your prescriber decides to move you on.`
            : `The earliest the label allows the next step is ${formatDateKey(status.earliestNext!, { weekday: "short", month: "short", day: "numeric" })}.`}
      </p>
      <p className="muted small">{product.note}</p>

      {confirming ? (
        <div className="notice small titration-confirm">
          <p>Only change step if your prescriber has told you to.</p>
          <div className="actions">
            {!status.isLast && (
              <button
                type="button"
                className="button small"
                onClick={() => {
                  titrations.update(plan.id, moveToStep(plan, plan.stepIndex + 1, today));
                  setConfirming(false);
                }}
              >
                Moved up to {fmtMg(product.steps[plan.stepIndex + 1].mg)}
              </button>
            )}
            {plan.stepIndex > 0 && (
              <button
                type="button"
                className="button secondary small"
                onClick={() => {
                  titrations.update(plan.id, moveToStep(plan, plan.stepIndex - 1, today));
                  setConfirming(false);
                }}
              >
                Moved down to {fmtMg(product.steps[plan.stepIndex - 1].mg)}
              </button>
            )}
            <button type="button" className="link-button neutral" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="actions">
          <button type="button" className="button secondary small" onClick={() => setConfirming(true)}>
            My prescriber changed my dose
          </button>
          <button
            type="button"
            className="link-button"
            onClick={() => {
              if (confirm(`Stop tracking ${product.brand} dose steps?`)) titrations.remove(plan.id);
            }}
          >
            Remove
          </button>
        </div>
      )}

      {plan.history.length > 0 && (
        <details className="small">
          <summary>Step history</summary>
          <ul>
            {[...plan.history].reverse().map((h) => (
              <li key={`${h.startedOn}-${h.stepIndex}`}>
                {fmtMg(product.steps[h.stepIndex]?.mg ?? 0)} from {formatDateKey(h.startedOn, { day: "numeric", month: "short", year: "numeric" })}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function PlanForm({ onDone }: { onDone: () => void }) {
  const [productId, setProductId] = useState(TITRATION_PRODUCTS[0].id);
  const product = findTitrationProduct(productId)!;
  const [stepIndex, setStepIndex] = useState("0");
  const [startedOn, setStartedOn] = useState(localDateKey());

  const submit = (e: FormEvent) => {
    e.preventDefault();
    titrations.add({ productId, stepIndex: Number(stepIndex), stepStartedOn: startedOn, history: [] });
    onDone();
  };

  return (
    <form className="card form" onSubmit={submit}>
      <h2>Track dose steps</h2>
      <label>
        <span>Your prescribed product</span>
        <select
          value={productId}
          onChange={(e) => {
            setProductId(e.target.value);
            setStepIndex("0");
          }}
        >
          {TITRATION_PRODUCTS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.brand}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Your current dose</span>
        <select value={stepIndex} onChange={(e) => setStepIndex(e.target.value)}>
          {product.steps.map((s, i) => (
            <option key={i} value={i}>
              {fmtMg(s.mg)} {product.frequency === "weekly" ? "weekly" : "daily"}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>When you started this dose</span>
        <input type="date" value={startedOn} max={localDateKey()} onChange={(e) => setStartedOn(e.target.value)} />
      </label>
      <div className="actions">
        <button type="submit" className="button">
          Start tracking
        </button>
        <button type="button" className="button secondary" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}
