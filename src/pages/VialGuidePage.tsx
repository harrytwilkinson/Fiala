import { useState } from "react";
import { SyringeVisual } from "../components/SyringeVisual";
import { guidesFor, vialLabel, waterOptions, type VialGuide } from "../data/vialGuides";
import { SYRINGES, calculate, doseForUnits, fmt, toMg, validate, type MassUnit } from "../lib/reconstitution";
import { href } from "../lib/router";
import { FREQUENCIES, MIXED_SHELF_DAYS, describeDays, mixRow, vialDuration } from "../lib/vialGuide";
import { StatusBadge } from "./LibraryPage";

// A converter preset to one peptide and vial size. Like the converter, it never
// suggests a dose: the dose field starts empty and the reader enters their own.
export function VialGuidePage({ guide }: { guide: VialGuide }) {
  const { peptide, vialMg } = guide;
  const waters = waterOptions(vialMg);
  const [waterMl, setWaterMl] = useState(String(waters[1]));
  const [dose, setDose] = useState("");
  const [doseUnit, setDoseUnit] = useState<MassUnit>(vialMg < 1 ? "mcg" : "mg");
  const [syringeId, setSyringeId] = useState(SYRINGES[2].id);
  const [frequencyId, setFrequencyId] = useState("daily");

  const syringe = SYRINGES.find((s) => s.id === syringeId) ?? SYRINGES[2];
  const water = parseFloat(waterMl);
  const doseMg = toMg(parseFloat(dose), doseUnit);
  const hasDose = dose.trim() !== "";
  const input = { vialMg, waterMl: water, doseMg, syringe };
  const errors = validate(input).filter((e) => hasDose || e.field !== "doseMg");
  const waterError = errors.find((e) => e.field === "waterMl")?.message;
  const doseError = hasDose ? errors.find((e) => e.field === "doseMg")?.message : undefined;
  const result = hasDose && errors.length === 0 ? calculate(input) : null;
  const frequency = FREQUENCIES.find((f) => f.id === frequencyId) ?? FREQUENCIES[1];
  const duration = result ? vialDuration(vialMg, doseMg, frequency.perDay) : null;
  const mix = Number.isFinite(water) && water > 0 ? mixRow(vialMg, water) : null;
  const otherSizes = guidesFor(peptide.id).filter((g) => g.id !== guide.id);

  return (
    <div className="page">
      <a className="back" href={href("guides")}>
        ← Vial guides
      </a>
      <h1>
        {peptide.name} {vialLabel(vialMg)} vial
      </h1>
      <div className="row wrap">
        <StatusBadge peptide={peptide} />
        <span className="badge">{peptide.category}</span>
      </div>
      <p className="muted">How to mix a {vialLabel(vialMg)} vial and read the syringe, worked out for your own dose.</p>
      {guide.note && <p className="notice small">{guide.note}</p>}
      <p className="notice small">Enter the dose your clinician has prescribed. This guide only converts units. It doesn't recommend doses.</p>

      <section className="card form">
        <label>
          <span>1. Bacteriostatic water added</span>
          <div className="input-suffix">
            <input inputMode="decimal" value={waterMl} onChange={(e) => setWaterMl(e.target.value)} aria-invalid={!!waterError} />
            <em>mL</em>
          </div>
          <div className="chips">
            {waters.map((w) => (
              <button type="button" key={w} className={water === w ? "chip active" : "chip"} onClick={() => setWaterMl(String(w))}>
                {w} mL
              </button>
            ))}
          </div>
          {mix && (
            <small className="hint">
              Makes {fmt(mix.mgPerMl, 3)} mg/mL: each unit on the syringe holds {fmt(mix.mcgPerUnit)} mcg.
            </small>
          )}
          {waterError && <small className="error">{waterError}</small>}
        </label>

        <label>
          <span>2. Your prescribed dose per injection</span>
          <div className="input-suffix">
            <input inputMode="decimal" value={dose} placeholder="Your dose" onChange={(e) => setDose(e.target.value)} aria-invalid={!!doseError} />
            <div className="segmented" role="group" aria-label="Dose unit">
              {(["mcg", "mg"] as const).map((u) => (
                <button type="button" key={u} className={doseUnit === u ? "active" : ""} onClick={() => setDoseUnit(u)}>
                  {u}
                </button>
              ))}
            </div>
          </div>
          <small className="hint">1 mg = 1,000 mcg.</small>
          {doseError && <small className="error">{doseError}</small>}
        </label>

        <label>
          <span>3. Syringe size (U-100 insulin)</span>
          <select value={syringeId} onChange={(e) => setSyringeId(e.target.value)}>
            {SYRINGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>4. How often you inject</span>
          <select value={frequencyId} onChange={(e) => setFrequencyId(e.target.value)}>
            {FREQUENCIES.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
          <small className="hint">Only used to work out how long the vial lasts.</small>
        </label>
      </section>

      <section className="card result" aria-live="polite">
        {result ? (
          <>
            <p className="result-label">Draw the syringe to</p>
            <p className="result-big">
              {fmt(result.doseUnitsRounded, 1)} <span>units</span>
            </p>
            <p className="muted small">
              = {fmt(result.doseVolumeMl, 3)} mL
              {result.doseUnitsRounded !== result.doseUnits && <> (exact: {fmt(result.doseUnits)} units)</>}
            </p>
            <SyringeVisual syringe={syringe} units={result.doseUnitsRounded} onUnitsChange={(u) => setDose(doseForUnits(u, vialMg, water, doseUnit))} />
            <p className="muted small syringe-hint">Drag the plunger to see the dose at any mark.</p>
            <dl className="stats">
              <div>
                <dt>Doses in the vial</dt>
                <dd>{duration ? duration.doses : "—"}</dd>
              </div>
              <div>
                <dt>Vial lasts</dt>
                <dd>{duration ? describeDays(duration.days) : "—"}</dd>
              </div>
            </dl>
            {(result.warnings.length > 0 || (duration && duration.days > MIXED_SHELF_DAYS)) && (
              <ul className="warnings">
                {result.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
                {duration && duration.days > MIXED_SHELF_DAYS && (
                  <li>
                    At this rate the vial lasts longer than about 4 weeks. Mixed peptides often aren't stable that long, so
                    check the supplier's use-by guidance for mixed vials.
                  </li>
                )}
              </ul>
            )}
            <div className="actions">
              <a className="button" href={href("tracker", { peptide: peptide.id, amount: dose, unit: doseUnit })}>
                Log this dose
              </a>
              <a className="button secondary" href={href("tracker/vials", { peptide: peptide.id, vialMg, waterMl })}>
                Save as a mixed vial
              </a>
            </div>
          </>
        ) : (
          <>
            <p className="result-label">Your syringe</p>
            <SyringeVisual syringe={syringe} units={0} />
            <p className="muted small">Enter your dose above to see where to draw to and how long the vial lasts.</p>
          </>
        )}
      </section>

      <section className="card">
        <h2>Mixing table for a {vialLabel(vialMg)} vial</h2>
        <p className="muted small">What each mark on a U-100 insulin syringe holds, depending on how much water you add.</p>
        <table className="blend-table">
          <thead>
            <tr>
              <th scope="col">Water</th>
              <th scope="col">Strength</th>
              <th scope="col">1 unit</th>
              <th scope="col">10 units</th>
              {result && <th scope="col">Your dose</th>}
            </tr>
          </thead>
          <tbody>
            {waters.map((w) => {
              const row = mixRow(vialMg, w);
              const units = result ? (doseMg / row.mgPerMl) * 100 : 0;
              return (
                <tr key={w} className={w === water ? "basis" : undefined}>
                  <th scope="row">{w} mL</th>
                  <td>{fmt(row.mgPerMl, 3)} mg/mL</td>
                  <td>{fmt(row.mcgPerUnit)} mcg</td>
                  <td>{row.mgPer10Units < 1 ? `${fmt(row.mgPer10Units * 1000)} mcg` : `${fmt(row.mgPer10Units)} mg`}</td>
                  {result && <td>{fmt(units, 1)} units</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="muted small">More water doesn't change the dose, only how much liquid holds it. It makes small doses easier to measure.</p>
      </section>

      <section className="card tips">
        <h2>How to mix it</h2>
        <ol className="steps">
          <li>Wash your hands. Wipe the tops of the peptide vial and the water vial with an alcohol swab and let them dry.</li>
          <li>Draw up {mix ? `${fmt(water)} mL` : "your chosen amount"} of bacteriostatic water with a fresh syringe.</li>
          <li>Push the needle through the rubber top and let the water run slowly down the inside wall, not straight onto the powder.</li>
          <li>Swirl or roll the vial gently until the powder dissolves. Don't shake it.</li>
          <li>Label the vial with the date and strength{mix ? ` (${fmt(mix.mgPerMl, 3)} mg/mL)` : ""}, and keep it in the fridge.</li>
          <li>Use a new sterile syringe for every dose, and never share needles.</li>
        </ol>
        <p className="muted small">If the liquid is cloudy or has bits in it when it shouldn't, don't use it.</p>
      </section>

      <section className="card">
        <h2>About {peptide.name}</h2>
        <p className="small">
          <strong>How it's taken:</strong> {peptide.route}
        </p>
        <p className="small">
          <strong>How long it lasts:</strong> {peptide.halfLife}
        </p>
        {peptide.storage && (
          <p className="small">
            <strong>Storage:</strong> {peptide.storage}
          </p>
        )}
        <a className="button secondary small" href={href(`library/${peptide.id}`)}>
          Uses, evidence &amp; side effects
        </a>
      </section>

      {otherSizes.length > 0 && (
        <section className="card">
          <h2>Other {peptide.name} vial sizes</h2>
          <div className="chips">
            {otherSizes.map((g) => (
              <a key={g.id} className="chip" href={href(`guides/${g.id}`)}>
                {vialLabel(g.vialMg)} vial
              </a>
            ))}
          </div>
        </section>
      )}

      <p className="muted small">Double-check every result, and confirm with your pharmacist or clinician if you're unsure.</p>
    </div>
  );
}
