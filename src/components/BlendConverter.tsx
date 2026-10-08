import { useState } from "react";
import { BLEND_LABEL_NOTE, STACKS, componentName, findStack } from "../data/stacks";
import { SYRINGES, calculateBlend, fmt, toMg, validateBlend, type MassUnit } from "../lib/reconstitution";
import { href } from "../lib/router";
import { SyringeVisual } from "./SyringeVisual";

const WATER_PRESETS = [2, 3, 5];
const PRESETS = STACKS.filter((s) => s.exampleVial);

interface Row {
  name: string;
  mg: string;
}

function rowsFor(stackId?: string): Row[] {
  const stack = stackId ? findStack(stackId) : undefined;
  if (stack?.exampleVial) return stack.exampleVial.contents.map((c) => ({ name: componentName(c.peptideId), mg: String(c.mg) }));
  return [
    { name: "", mg: "" },
    { name: "", mg: "" },
  ];
}

/** "250 mcg" below 1 mg, "2.5 mg" from 1 mg up. */
function amount(mg: number): string {
  return mg < 1 ? `${fmt(mg * 1000, 1)} mcg` : `${fmt(mg, 3)} mg`;
}

// Converter for vials holding several peptides (e.g. GLOW). Like the single-peptide
// converter it never suggests a dose: the user enters the prescribed dose of one
// peptide, and it shows the units to draw and what else that draw contains.
export function BlendConverter({ initialStack }: { initialStack?: string }) {
  const [stackId, setStackId] = useState(initialStack && findStack(initialStack)?.exampleVial ? initialStack : "");
  const [rows, setRows] = useState<Row[]>(() => rowsFor(stackId));
  const [waterMl, setWaterMl] = useState("3");
  const [basis, setBasis] = useState(0);
  const [dose, setDose] = useState("");
  const [doseUnit, setDoseUnit] = useState<MassUnit>("mcg");
  const [syringeId, setSyringeId] = useState(SYRINGES[2].id);

  const syringe = SYRINGES.find((s) => s.id === syringeId) ?? SYRINGES[2];
  const input = {
    components: rows.map((r) => ({ name: r.name, mg: parseFloat(r.mg) })),
    waterMl: parseFloat(waterMl),
    basis: Math.min(basis, rows.length - 1),
    doseMg: toMg(parseFloat(dose), doseUnit),
    syringe,
  };
  // Don't nag about the dose until one has been typed.
  const errors = validateBlend(input).filter((e) => dose.trim() || e.field !== "doseMg");
  const result = dose.trim() && errors.length === 0 ? calculateBlend(input) : null;
  const errorFor = (f: string) => errors.find((e) => e.field === f)?.message;
  const stack = stackId ? findStack(stackId) : undefined;

  const usePreset = (id: string) => {
    setStackId(id);
    setRows(rowsFor(id));
    setBasis(0);
  };
  const updateRow = (i: number, patch: Partial<Row>) => {
    setStackId("");
    setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  };
  const removeRow = (i: number) => {
    setStackId("");
    setRows(rows.filter((_, j) => j !== i));
    if (basis >= i && basis > 0) setBasis(basis - 1);
  };

  return (
    <>
      <p className="muted small">
        For a vial that holds more than one peptide, such as GLOW. Enter each peptide's amount from the label, then the
        prescribed dose of one of them.
      </p>

      <section className="card form">
        <div>
          <span className="field-label">Start from a common blend (optional)</span>
          <div className="chips">
            {PRESETS.map((s) => (
              <button type="button" key={s.id} className={stackId === s.id ? "chip active" : "chip"} onClick={() => usePreset(s.id)}>
                {s.name}
              </button>
            ))}
          </div>
          {stack && <small className="hint">Example label amounts. {BLEND_LABEL_NOTE}</small>}
        </div>

        <fieldset className="blend-rows">
          <legend>1. What's in the vial</legend>
          {rows.map((r, i) => (
            <div className="blend-row" key={i}>
              <input value={r.name} onChange={(e) => updateRow(i, { name: e.target.value })} placeholder={`Peptide ${i + 1}`} aria-label={`Peptide ${i + 1} name`} />
              <div className="input-suffix">
                <input inputMode="decimal" value={r.mg} onChange={(e) => updateRow(i, { mg: e.target.value })} aria-label={`${r.name || `Peptide ${i + 1}`} amount in mg`} />
                <em>mg</em>
              </div>
              {rows.length > 2 && (
                <button type="button" className="link-button" onClick={() => removeRow(i)} aria-label={`Remove ${r.name || `peptide ${i + 1}`}`}>
                  ✕
                </button>
              )}
            </div>
          ))}
          <button type="button" className="button secondary small" onClick={() => setRows([...rows, { name: "", mg: "" }])}>
            + Add peptide
          </button>
          {errorFor("components") && <small className="error">{errorFor("components")}</small>}
        </fieldset>

        <label>
          <span>2. Bacteriostatic water added</span>
          <div className="input-suffix">
            <input inputMode="decimal" value={waterMl} onChange={(e) => setWaterMl(e.target.value)} />
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
          <span>3. Prescribed dose of</span>
          <select value={input.basis} onChange={(e) => setBasis(Number(e.target.value))}>
            {rows.map((r, i) => (
              <option key={i} value={i}>
                {r.name.trim() || `Peptide ${i + 1}`}
              </option>
            ))}
          </select>
          <div className="input-suffix">
            <input inputMode="decimal" value={dose} onChange={(e) => setDose(e.target.value)} placeholder="Dose" aria-label="Prescribed dose" />
            <div className="segmented" role="group" aria-label="Dose unit">
              {(["mcg", "mg"] as const).map((u) => (
                <button type="button" key={u} className={doseUnit === u ? "active" : ""} onClick={() => setDoseUnit(u)}>
                  {u}
                </button>
              ))}
            </div>
          </div>
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
            {fmt(result.basis.doseUnitsRounded, 1)} <span>units</span>
          </p>
          <p className="muted small">
            = {fmt(result.basis.doseVolumeMl, 3)} mL
            {result.basis.doseUnitsRounded !== result.basis.doseUnits && <> (exact: {fmt(result.basis.doseUnits)} units)</>}
          </p>

          <SyringeVisual syringe={syringe} units={result.basis.doseUnitsRounded} />

          <h3>This draw contains</h3>
          <table className="blend-table">
            <thead>
              <tr>
                <th scope="col">Peptide</th>
                <th scope="col">Amount</th>
                <th scope="col">Per unit</th>
              </tr>
            </thead>
            <tbody>
              {result.perDraw.map((c, i) => (
                <tr key={i} className={i === input.basis ? "basis" : undefined}>
                  <th scope="row">{c.name}</th>
                  <td>{amount(c.mg)}</td>
                  <td className="muted">{fmt((c.mgPerMl * 1000) / 100, 1)} mcg</td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="stats">
            <div>
              <dt>Draws per vial</dt>
              <dd>{fmt(Math.floor(result.basis.dosesPerVial + 1e-9), 0)}</dd>
            </div>
          </dl>

          {result.basis.warnings.length > 0 && (
            <ul className="warnings">
              {result.basis.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}

          <p className="muted small">
            Every draw contains all the peptides in the vial, in the same ratio. Double-check the result, and confirm with
            your pharmacist or clinician if you're unsure.
          </p>

          <div className="actions">
            <a
              className="button"
              href={href("tracker", { peptide: stack ? `stack:${stack.id}` : undefined, amount: fmt(result.basis.doseUnitsRounded, 1), unit: "units" })}
            >
              Log this dose
            </a>
          </div>
        </section>
      )}

      <section className="card">
        <h2>How blends work</h2>
        <p className="small">
          All the peptides share the same water, so each one's concentration is its own amount ÷ the water. For GLOW (50 mg
          GHK-Cu, 10 mg BPC-157, 10 mg TB-500) in 3 mL, BPC-157 is 3.33 mg/mL. A 0.5 mg BPC-157 dose is 0.15 mL (15 units),
          and that same draw also contains 0.5 mg of TB-500 and 2.5 mg of GHK-Cu.
        </p>
      </section>
    </>
  );
}
