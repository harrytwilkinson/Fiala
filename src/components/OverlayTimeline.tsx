import { useState } from "react";
import { formatWeight, weightIn, type Measurement, type WeightUnit } from "../lib/body";
import { addDays, daysBetween, formatDateKey, localDateKey } from "../lib/dates";
import type { DoseEntry } from "../lib/doseLog";
import { SEVERITY_LABEL, type SymptomEntry } from "../lib/symptoms";

// One shared time axis with a lane per peptide (dose dots), a side-effects lane (marker size and colour by
// severity) and a weight line, so patterns can be spotted and discussed with a clinician.

const RANGES = { "30": 30, "60": 60, "90": 90 } as const;
type Range = keyof typeof RANGES;

const W = 340;
const LABEL_H = 13;
const LANE = 26;
const WEIGHT_H = 56;
const AXIS_H = 16;
const MAX_PEPTIDES = 4;

interface Props {
  entries: DoseEntry[];
  symptoms: SymptomEntry[];
  measurements: Measurement[];
  unit: WeightUnit;
}

export function OverlayTimeline({ entries, symptoms, measurements, unit }: Props) {
  const [range, setRange] = useState<Range>("60");
  const days = RANGES[range];
  const today = localDateKey();
  const from = addDays(today, -(days - 1));
  const x = (day: string, hour = 12) => ((daysBetween(from, day) + hour / 24) / days) * W;
  const inRange = (day: string) => daysBetween(from, day) >= 0 && daysBetween(day, today) >= 0;
  const dayOf = (iso: string) => localDateKey(new Date(iso));
  const hourOf = (iso: string) => new Date(iso).getHours();

  const recent = entries.filter((e) => inRange(dayOf(e.takenAt)));
  const counts = new Map<string, number>();
  for (const e of recent) counts.set(e.peptideName, (counts.get(e.peptideName) ?? 0) + 1);
  const peptides = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_PEPTIDES).map(([name]) => name);
  const feelings = symptoms.filter((s) => inRange(dayOf(s.at)));
  const weights = measurements
    .filter((m) => m.weightKg !== undefined && inRange(m.date))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((m) => ({ date: m.date, value: weightIn(m.weightKg!, unit), kg: m.weightKg! }));

  const lanes = [...peptides.map((p) => ({ kind: "dose" as const, name: p })), { kind: "symptoms" as const, name: "Side effects" }];
  const lanesTop = 4;
  const weightTop = lanesTop + lanes.length * (LABEL_H + LANE) + 6;
  const height = weightTop + (weights.length > 0 ? WEIGHT_H + LABEL_H : 0) + AXIS_H;

  const lo = Math.min(...weights.map((w) => w.value));
  const hi = Math.max(...weights.map((w) => w.value));
  const wy = (v: number) => weightTop + LABEL_H + 4 + (hi === lo ? (WEIGHT_H - 8) / 2 : ((hi - v) / (hi - lo)) * (WEIGHT_H - 8));

  // Week ticks along the bottom.
  const ticks: string[] = [];
  for (let i = days - 1; i >= 0; i -= 7) ticks.push(addDays(from, i));

  if (recent.length === 0 && feelings.length === 0 && weights.length === 0) {
    return <p className="muted small">Log doses, side effects or weight and they'll appear here on one timeline.</p>;
  }

  return (
    <div className="overlay">
      <div className="segmented" role="group" aria-label="Time range">
        {(Object.keys(RANGES) as Range[]).map((r) => (
          <button type="button" key={r} className={r === range ? "active" : ""} aria-pressed={r === range} onClick={() => setRange(r)}>
            {r} days
          </button>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${height}`} className="overlay-chart" role="img" aria-label={`Doses, side effects and weight over the last ${days} days`}>
        {ticks.map((t) => (
          <line key={t} x1={x(t, 24)} x2={x(t, 24)} y1={lanesTop} y2={height - AXIS_H} className="chart-grid" />
        ))}
        {lanes.map((lane, i) => {
          const top = lanesTop + i * (LABEL_H + LANE);
          const mid = top + LABEL_H + LANE / 2;
          return (
            <g key={lane.name}>
              <text x={0} y={top + 10} className="overlay-label">
                {lane.name}
              </text>
              <line x1={0} x2={W} y1={mid} y2={mid} className="overlay-lane" />
              {lane.kind === "dose"
                ? recent
                    .filter((e) => e.peptideName === lane.name)
                    .map((e) => (
                      <circle key={e.id} cx={x(dayOf(e.takenAt), hourOf(e.takenAt))} cy={mid} r={4} className={`overlay-dose lane-${i}`}>
                        <title>{`${e.peptideName} ${e.amount} ${e.unit}, ${new Date(e.takenAt).toLocaleString()}`}</title>
                      </circle>
                    ))
                : feelings.map((s) => (
                    <rect
                      key={s.id}
                      x={x(dayOf(s.at), hourOf(s.at)) - 2 - s.severity}
                      y={mid - 2 - s.severity}
                      width={4 + s.severity * 2}
                      height={4 + s.severity * 2}
                      rx={1.5}
                      transform={`rotate(45 ${x(dayOf(s.at), hourOf(s.at))} ${mid})`}
                      className={`overlay-symptom sev-${s.severity}`}
                    >
                      <title>{`${s.symptom} (${SEVERITY_LABEL[s.severity].toLowerCase()}), ${new Date(s.at).toLocaleString()}`}</title>
                    </rect>
                  ))}
            </g>
          );
        })}
        {weights.length > 0 && (
          <g>
            <text x={0} y={weightTop + 10} className="overlay-label">
              Weight · {formatWeight(weights[weights.length - 1].kg, unit)}
            </text>
            <polyline points={weights.map((w) => `${x(w.date)},${wy(w.value)}`).join(" ")} className="chart-line" fill="none" />
            {weights.map((w) => (
              <circle key={w.date} cx={x(w.date)} cy={wy(w.value)} r={2.5} className="chart-dot" />
            ))}
          </g>
        )}
        {/* Label every week for 30 days, every other week for longer ranges; today's label sits at the right edge. */}
        {ticks
          .filter((_, i) => days <= 30 || i % 2 === 0)
          .map((t, i) => (
            <text key={t} x={i === 0 ? W : x(t, 24)} y={height - 3} textAnchor={i === 0 ? "end" : "middle"} className="chart-axis">
              {formatDateKey(t, { day: "numeric", month: "short" })}
            </text>
          ))}
      </svg>
      <div className="site-legend small">
        <span>
          <i className="swatch sev-1" aria-hidden /> Mild
        </span>
        <span>
          <i className="swatch sev-2" aria-hidden /> Moderate
        </span>
        <span>
          <i className="swatch sev-3" aria-hidden /> Severe
        </span>
        {counts.size > MAX_PEPTIDES && <span>Showing your {MAX_PEPTIDES} most-logged peptides</span>}
      </div>
    </div>
  );
}
