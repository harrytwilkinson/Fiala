import { useState } from "react";
import { PlusGate } from "../components/PlusGate";
import { findPeptide } from "../data/peptides";
import { useDoseLog } from "../lib/doseLog";
import { HALF_LIFE_HOURS, dosePoints, levelCurve, type LevelCurve } from "../lib/levels";
import { href } from "../lib/router";
import { useVials } from "../lib/vials";

export function LevelsPage({ peptideId }: { peptideId?: string }) {
  return (
    <div className="page">
      <a className="back" href={href("plus")}>
        ← Fiala Plus
      </a>
      <h1>Level curves</h1>
      <PlusGate feature="Level curves">
        <Levels initial={peptideId} />
      </PlusGate>
    </div>
  );
}

function Levels({ initial }: { initial?: string }) {
  const entries = useDoseLog();
  const vialsById = new Map(useVials().map((v) => [v.id, v]));
  const logged = [...new Set(entries.map((e) => e.peptideId).filter((id): id is string => !!id && id in HALF_LIFE_HOURS))];
  const [chosen, setChosen] = useState(initial && logged.includes(initial) ? initial : logged[0]);

  if (logged.length === 0) {
    return (
      <section className="card">
        <p>
          Log a dose of a peptide with a known half-life, such as semaglutide, tirzepatide or ipamorelin, and its estimated
          level curve will appear here.
        </p>
        <a className="button" href={href("tracker")}>
          Log a dose
        </a>
      </section>
    );
  }

  const peptide = findPeptide(chosen!)!;
  const halfLife = HALF_LIFE_HOURS[chosen!];
  const { points, skipped } = dosePoints(entries, chosen!, vialsById);
  const curve = levelCurve(points, halfLife);
  const last = points[0];
  const hoursSince = last ? (Date.now() - last.atMs) / 3_600_000 : undefined;

  return (
    <>
      <p className="notice small">
        An estimate from the published half-life and the doses you've logged. It isn't a blood test: real levels vary with
        body size, kidney function, injection site and more.
      </p>

      {logged.length > 1 && (
        <div className="chips scroll" role="group" aria-label="Peptide">
          {logged.map((id) => (
            <button type="button" key={id} className={id === chosen ? "chip active" : "chip"} onClick={() => setChosen(id)}>
              {findPeptide(id)?.name ?? id}
            </button>
          ))}
        </div>
      )}

      <section className="card">
        <div className="row">
          <h2>{peptide.name}</h2>
          <span className="muted small">Half-life: {peptide.halfLife.toLowerCase()}</span>
        </div>
        <LevelChart curve={curve} doses={points.map((p) => p.atMs)} />
        <dl className="stats">
          <div>
            <dt>Now</dt>
            <dd>{Math.round(curve.nowFraction * 100)}% of peak</dd>
          </div>
          <div>
            <dt>Since last dose</dt>
            <dd>{hoursSince === undefined ? "—" : `${(hoursSince / halfLife).toFixed(1)} half-lives`}</dd>
          </div>
        </dl>
        <p className="muted small">
          The solid line is the estimate so far; the dashed line shows how it would fall with no further doses. Dots mark
          your logged doses.
          {skipped > 0 && ` ${skipped} dose${skipped === 1 ? " was" : "s were"} logged in syringe units without a vial, so ${skipped === 1 ? "it isn't" : "they aren't"} included.`}
        </p>
      </section>
    </>
  );
}

const W = 340;
const H = 180;
const PAD = { left: 8, right: 8, top: 18, bottom: 26 };

function LevelChart({ curve, doses }: { curve: LevelCurve; doses: number[] }) {
  const x = (t: number) => PAD.left + ((t - curve.fromMs) / (curve.toMs - curve.fromMs)) * (W - PAD.left - PAD.right);
  const y = (f: number) => H - PAD.bottom - f * (H - PAD.top - PAD.bottom);
  const line = (pts: [number, number][]) => pts.map(([t, f], i) => `${i ? "L" : "M"}${x(t).toFixed(1)} ${y(f).toFixed(1)}`).join(" ");
  const pastPath = line(curve.past);
  const area = `${pastPath} L${x(curve.nowMs).toFixed(1)} ${y(0)} L${x(curve.fromMs).toFixed(1)} ${y(0)} Z`;
  const span = curve.toMs - curve.fromMs;
  const dayMs = 86_400_000;
  // Gridlines every day, week or fortnight depending on the span.
  const every = span <= 4 * dayMs ? dayMs : span <= 21 * dayMs ? 7 * dayMs : 14 * dayMs;
  const grid: number[] = [];
  for (let t = curve.nowMs - every; t > curve.fromMs; t -= every) grid.push(t);
  const label = (t: number) => {
    const days = Math.round((curve.nowMs - t) / dayMs);
    return every < 7 * dayMs ? `-${days}d` : `-${Math.round(days / 7)}w`;
  };

  return (
    <svg className="level-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Estimated level now ${Math.round(curve.nowFraction * 100)}% of its highest point in this period`}>
      <defs>
        <linearGradient id="level-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="level-stop-top" />
          <stop offset="1" className="level-stop-bottom" />
        </linearGradient>
      </defs>
      {grid.map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={PAD.top} y2={y(0)} className="chart-grid" />
          <text x={x(t)} y={H - 8} textAnchor="middle" className="chart-axis">
            {label(t)}
          </text>
        </g>
      ))}
      <line x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} className="chart-grid" />
      <path d={area} fill="url(#level-fill)" />
      <path d={pastPath} className="chart-line" />
      <path d={line(curve.future)} className="chart-line level-future" />
      {doses
        .filter((t) => t >= curve.fromMs)
        .map((t) => (
          <circle key={t} cx={x(t)} cy={y(0) + 6} r={2.5} className="level-dose" />
        ))}
      <line x1={x(curve.nowMs)} x2={x(curve.nowMs)} y1={PAD.top - 6} y2={y(0)} className="level-now-line" />
      <text x={x(curve.nowMs)} y={PAD.top - 8} textAnchor="middle" className="chart-axis level-now-label">
        now
      </text>
      <circle cx={x(curve.nowMs)} cy={y(curve.nowFraction)} r={4.5} className="chart-dot" />
    </svg>
  );
}
