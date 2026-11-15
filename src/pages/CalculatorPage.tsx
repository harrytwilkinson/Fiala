import { useState } from "react";
import { BlendConverter } from "../components/BlendConverter";
import { ConverterNav } from "../components/ConverterNav";
import { Head, Sec } from "../components/Calibre";
import { Odometer, Stepper, Thumbwheel } from "../components/Instrument";
import { SyringeVisual } from "../components/SyringeVisual";
import {
  SYRINGES,
  calculate,
  doseForUnits,
  fmt,
  toMg,
  validate,
  waterForTargetUnits,
  type MassUnit,
} from "../lib/reconstitution";
import { href } from "../lib/router";

// A general-purpose unit converter: it never suggests a dose and isn't tied to
// any particular compound. The user enters the dose they've been prescribed.
export function CalculatorPage({ blend }: { blend?: string }) {
  const [mode, setMode] = useState<"single" | "blend">(blend ? "blend" : "single");
  return (
    <div className="page">
      <Head label="Converter" title="Reconstitution">
        <div className="segmented" role="group" aria-label="Vial type">
          <button type="button" className={mode === "single" ? "active" : ""} aria-pressed={mode === "single"} onClick={() => setMode("single")}>
            Single
          </button>
          <button type="button" className={mode === "blend" ? "active" : ""} aria-pressed={mode === "blend"} onClick={() => setMode("blend")} aria-label="Blend: several peptides in one vial">
            Blend
          </button>
        </div>
      </Head>
      <ConverterNav active="converter" />
      {mode === "single" ? (
        <SingleConverter />
      ) : (
        <>
          <p className="cal-fine">Enter the dose your clinician has prescribed. This tool only converts units. It doesn't recommend doses.</p>
          <BlendConverter initialStack={blend} />
        </>
      )}
    </div>
  );
}

function SingleConverter() {
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

  const logHref = result ? href("tracker", { amount: dose, unit: doseUnit }) : undefined;
  const units = result ? fmt(result.doseUnitsRounded, 1) : "0";

  return (
    <>
      <section className="readout" aria-live="polite">
        <div className="readout-row">
          <span className="cal-label">Draw to</span>
          <span className="cal-label b">{result ? `= ${fmt(result.doseVolumeMl, 3)} mL` : "check the numbers below"}</span>
        </div>
        <p className={result ? "result-big" : "result-big off"}>
          <Odometer value={units} label={result ? `${units} units` : "No result yet"} /> <span>units</span>
        </p>
        {result ? (
          <SyringeVisual syringe={syringe} units={result.doseUnitsRounded} onUnitsChange={(u) => setDose(doseForUnits(u, input.vialMg, input.waterMl, doseUnit))} />
        ) : (
          <SyringeVisual syringe={syringe} units={0} />
        )}
        <div className="readout-row">
          <label className="syr-pick">
            <span className="sr-only">Syringe size (U-100 insulin)</span>
            <select value={syringeId} onChange={(e) => setSyringeId(e.target.value)}>
              {SYRINGES.map((s) => (
                <option key={s.id} value={s.id}>
                  U-100 · {s.label}
                </option>
              ))}
            </select>
          </label>
          {result && result.doseUnitsRounded !== result.doseUnits && <span className="cal-label">exact {fmt(result.doseUnits)}</span>}
        </div>
      </section>
      <p className="cal-fine">
        Drag along the scale to see the dose at any mark. Enter the dose your clinician has prescribed: this tool only
        converts units and doesn't recommend doses.
      </p>

      <div className="step-grid">
        <Stepper label="In the vial" unit="mg" value={vialMg} onChange={setVialMg} presets={[1, 2, 5, 10, 15, 20, 30, 50]} invalid={!!errorFor("vialMg")} />
        <Stepper label="Water added" unit="mL" value={waterMl} onChange={setWaterMl} step={0.5} min={0.5} invalid={!!errorFor("waterMl")} />
      </div>
      {(errorFor("vialMg") || errorFor("waterMl")) && <p className="error small">{errorFor("vialMg") ?? errorFor("waterMl")}</p>}

      <div className="dose-set">
        <span className="cal-label">Prescribed dose</span>
        <span className="val">
          <input inputMode="decimal" value={dose} onChange={(e) => setDose(e.target.value)} aria-label={`Prescribed dose per injection (${doseUnit})`} aria-invalid={!!errorFor("doseMg")} />
          <span className="segmented" role="group" aria-label="Dose unit">
            {(["mcg", "mg"] as const).map((u) => (
              <button type="button" key={u} className={doseUnit === u ? "active" : ""} aria-pressed={doseUnit === u} onClick={() => setDoseUnit(u)}>
                {u}
              </button>
            ))}
          </span>
        </span>
      </div>
      <Thumbwheel
        label={`Prescribed dose in ${doseUnit}`}
        value={parseFloat(dose)}
        step={doseUnit === "mcg" ? 10 : 0.05}
        min={doseUnit === "mcg" ? 10 : 0.05}
        onChange={(v) => setDose(String(Math.round(v * 100) / 100))}
      />
      {errorFor("doseMg") && <p className="error small">{errorFor("doseMg")}</p>}

      <dl className="stats three">
        <div>
          <dt>Strength</dt>
          <dd>
            {result ? fmt(result.concentrationMgPerMl, 3) : "–"}
            <i>mg/mL</i>
          </dd>
        </div>
        <div>
          <dt>Per unit</dt>
          <dd>
            {result ? fmt(result.mcgPerUnit) : "–"}
            <i>mcg</i>
          </dd>
        </div>
        <div>
          <dt>Doses / vial</dt>
          <dd>{result ? fmt(Math.floor(result.dosesPerVial + 1e-9), 0) : "–"}</dd>
        </div>
      </dl>

      {result && result.warnings.length > 0 && (
        <ul className="warnings">
          {result.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      <div className="cal-cta">
        {logHref ? (
          <a className="button" href={logHref}>
            Log this dose
          </a>
        ) : (
          <button type="button" className="button" disabled>
            Log this dose
          </button>
        )}
        <a className="button secondary" href={href("tracker/vials", { vialMg, waterMl })}>
          Save vial
        </a>
      </div>
      <p className="cal-fine">Double-check the result, and confirm with your pharmacist or clinician if you're unsure.</p>

      <Sec title="Prefer a round number?">
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
      </Sec>

      <Sec title="How the math works">
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
        <p className="muted small">
          Unfamiliar term? See the <a href={href("glossary")}>glossary</a>.
        </p>
      </Sec>

      <Sec title="Mixing tips">
        <ul className="cal-list">
          <li>Wipe vial tops with an alcohol swab and let them dry.</li>
          <li>Run the water slowly down the inside wall of the vial rather than spraying it onto the powder.</li>
          <li>Swirl or roll gently until dissolved. Don't shake, as it can damage the peptide.</li>
          <li>Label the vial with the date and concentration, and store it as directed.</li>
          <li>Never share needles or reuse syringes.</li>
        </ul>
      </Sec>
    </>
  );
}
