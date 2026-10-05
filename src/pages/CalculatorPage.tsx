import { useState } from "react";
import { SyringeVisual } from "../components/SyringeVisual";
import { PEPTIDES, findPeptide } from "../data/peptides";
import {
  SYRINGES,
  calculate,
  fmt,
  toMg,
  validate,
  waterForTargetUnits,
  type MassUnit,
} from "../lib/reconstitution";
import { href } from "../lib/router";

const WATER_PRESETS = [1, 2, 3, 5];

interface Props {
  initialPeptideId?: string;
}

export function CalculatorPage({ initialPeptideId }: Props) {
  const [peptideId, setPeptideId] = useState(initialPeptideId && findPeptide(initialPeptideId) ? initialPeptideId : "");
  const [vialMg, setVialMg] = useState("5");
  const [waterMl, setWaterMl] = useState("2");
  const [dose, setDose] = useState("250");
  const [doseUnit, setDoseUnit] = useState<MassUnit>("mcg");
  const [syringeId, setSyringeId] = useState(SYRINGES[2].id);
  const [targetUnits, setTargetUnits] = useState("10");

  const syringe = SYRINGES.find((s) => s.id === syringeId) ?? SYRINGES[2];
  const input = {
    vialMg: parseFloat(vialMg),
    waterMl: parseFloat(waterMl),
    doseMg: toMg(parseFloat(dose), doseUnit),
    syringe,
  };
  const errors = validate(input);
  const result = errors.length ? null : calculate(input);
  const errorFor = (f: string) => errors.find((e) => e.field === f)?.message;

  const target = parseFloat(targetUnits);
  const suggestedWater =
    Number.isFinite(input.vialMg) && input.vialMg > 0 && input.doseMg > 0 && target > 0
      ? waterForTargetUnits(input.vialMg, input.doseMg, target)
      : NaN;

  const peptide = peptideId ? findPeptide(peptideId) : undefined;
  const logHref = result
    ? href("tracker", {
        peptide: peptide?.id,
        amount: dose,
        unit: doseUnit,
      })
    : undefined;

  return (
    <div className="page">
      <h1>Reconstitution calculator</h1>
      <p className="muted">
        Work out how much bacteriostatic water to add to a freeze-dried peptide vial, and how far to draw an
        insulin (U-100) syringe for your dose.
      </p>

      <section className="card form">
        <label>
          <span>Peptide (optional)</span>
          <select value={peptideId} onChange={(e) => setPeptideId(e.target.value)}>
            <option value="">— Not specified —</option>
            {PEPTIDES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>1. Peptide in the vial</span>
          <div className="input-suffix">
            <input inputMode="decimal" value={vialMg} onChange={(e) => setVialMg(e.target.value)} aria-invalid={!!errorFor("vialMg")} />
            <em>mg</em>
          </div>
          <small className="hint">The amount printed on the vial label, e.g. 5 mg or 10 mg.</small>
          {errorFor("vialMg") && <small className="error">{errorFor("vialMg")}</small>}
        </label>

        <label>
          <span>2. Bacteriostatic water added</span>
          <div className="input-suffix">
            <input inputMode="decimal" value={waterMl} onChange={(e) => setWaterMl(e.target.value)} aria-invalid={!!errorFor("waterMl")} />
            <em>mL</em>
          </div>
          <div className="chips">
            {WATER_PRESETS.map((w) => (
              <button type="button" key={w} className={parseFloat(waterMl) === w ? "chip active" : "chip"} onClick={() => setWaterMl(String(w))}>
                {w} mL
              </button>
            ))}
          </div>
          {errorFor("waterMl") && <small className="error">{errorFor("waterMl")}</small>}
        </label>

        <label>
          <span>3. Dose per injection</span>
          <div className="input-suffix">
            <input inputMode="decimal" value={dose} onChange={(e) => setDose(e.target.value)} aria-invalid={!!errorFor("doseMg")} />
            <div className="segmented" role="group" aria-label="Dose unit">
              {(["mcg", "mg"] as const).map((u) => (
                <button type="button" key={u} className={doseUnit === u ? "active" : ""} onClick={() => setDoseUnit(u)}>
                  {u}
                </button>
              ))}
            </div>
          </div>
          <small className="hint">1 mg = 1,000 mcg.</small>
          {errorFor("doseMg") && <small className="error">{errorFor("doseMg")}</small>}
        </label>

        <label>
          <span>4. Syringe size (U-100 insulin)</span>
          <select value={syringeId} onChange={(e) => setSyringeId(e.target.value)}>
            {SYRINGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      {result && (
        <section className="card result" aria-live="polite">
          <p className="result-label">Draw the syringe to</p>
          <p className="result-big">
            {fmt(result.doseUnitsRounded, 1)} <span>units</span>
          </p>
          <p className="muted small">
            = {fmt(result.doseVolumeMl, 3)} mL
            {result.doseUnitsRounded !== result.doseUnits && <> (exact: {fmt(result.doseUnits)} units)</>}
          </p>

          <SyringeVisual syringe={syringe} units={result.doseUnitsRounded} />

          <dl className="stats">
            <div>
              <dt>Concentration</dt>
              <dd>
                {fmt(result.concentrationMgPerMl, 3)} mg/mL
                <br />
                <span className="muted small">{fmt(result.mcgPerUnit)} mcg per unit</span>
              </dd>
            </div>
            <div>
              <dt>Doses per vial</dt>
              <dd>{fmt(Math.floor(result.dosesPerVial + 1e-9), 0)}</dd>
            </div>
          </dl>

          {result.warnings.length > 0 && (
            <ul className="warnings">
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}

          {logHref && (
            <a className="button" href={logHref}>
              Log this dose
            </a>
          )}
        </section>
      )}

      <section className="card">
        <h2>Prefer a round number on the syringe?</h2>
        <p className="muted small">Pick how many units you'd like each dose to be, and we'll tell you how much water to add.</p>
        <div className="inline-form">
          <div className="input-suffix">
            <input inputMode="decimal" value={targetUnits} onChange={(e) => setTargetUnits(e.target.value)} aria-label="Target units per dose" />
            <em>units</em>
          </div>
          <span>→</span>
          <strong>{Number.isFinite(suggestedWater) ? `${fmt(suggestedWater)} mL water` : "—"}</strong>
        </div>
        {Number.isFinite(suggestedWater) && (
          <button type="button" className="button secondary" onClick={() => setWaterMl(String(Math.round(suggestedWater * 100) / 100))}>
            Use {fmt(suggestedWater)} mL
          </button>
        )}
      </section>

      <section className="card">
        <h2>How the math works</h2>
        <ol className="steps">
          <li>
            <strong>Concentration</strong> = peptide in vial ÷ water added. 5 mg ÷ 2 mL = 2.5 mg/mL.
          </li>
          <li>
            <strong>Volume per dose</strong> = dose ÷ concentration. 0.25 mg ÷ 2.5 mg/mL = 0.1 mL.
          </li>
          <li>
            <strong>Syringe units</strong> = volume × 100 on a U-100 syringe. 0.1 mL = 10 units.
          </li>
        </ol>
        <p className="muted small">
          Adding more water doesn't change the dose, only how much liquid holds it. More water makes small doses
          easier to measure but means larger injection volumes.
        </p>
      </section>

      <section className="card tips">
        <h2>Mixing tips</h2>
        <ul>
          <li>Wipe vial tops with an alcohol swab and let them dry.</li>
          <li>Run the water slowly down the inside wall of the vial rather than spraying it onto the powder.</li>
          <li>Swirl or roll gently until dissolved. Don't shake, as it can damage the peptide.</li>
          <li>Label the vial with the date and concentration, and store it as directed.</li>
          <li>Never share needles or reuse syringes.</li>
        </ul>
      </section>
    </div>
  );
}
