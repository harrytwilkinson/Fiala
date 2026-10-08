import { useRef, useState, type PointerEvent } from "react";
import { formatWeight, weightIn, type WeightPoint, type WeightUnit } from "../lib/body";
import { formatDateKey, parseDateKey } from "../lib/dates";

const W = 340;
const H = 200;
const PAD = { left: 40, right: 12, top: 12, bottom: 40 };
const RUG_Y = H - 10;

/** 1, 2 or 5 × a power of ten, so axis labels are round numbers. */
function niceStep(range: number, ticks: number): number {
  const raw = range / ticks;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

interface Props {
  points: WeightPoint[];
  unit: WeightUnit;
  /** Dates ("YYYY-MM-DD") of doses to mark along the bottom. */
  doseDates?: string[];
  doseLabel?: string;
}

// Single-series line chart: weight over time, with an optional rug of dose dates
// under the plot. One y axis only; hover (or touch) shows the nearest reading.
export function WeightChart({ points, unit, doseDates = [], doseLabel }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const t = (d: string) => parseDateKey(d).getTime();
  const values = points.map((p) => weightIn(p.kg, unit));
  const t0 = t(points[0].date);
  const t1 = Math.max(t(points[points.length - 1].date), t0 + 86_400_000);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const step = niceStep(Math.max(hi - lo, unit === "kg" ? 2 : unit === "lb" ? 4 : 0.3), 4);
  const yMin = Math.floor(lo / step) * step;
  const yMax = Math.max(Math.ceil(hi / step) * step, yMin + step);
  const ticks: number[] = [];
  for (let v = yMin; v <= yMax + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (d: string) => PAD.left + ((t(d) - t0) / (t1 - t0)) * plotW;
  const y = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * plotH;

  const path = points.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(values[i]).toFixed(1)}`).join(" ");
  const rug = doseDates.filter((d) => t(d) >= t0 && t(d) <= t1);
  const xLabels = [...new Set([points[0].date, points[Math.floor((points.length - 1) / 2)].date, points[points.length - 1].date])];

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box) return;
    const px = ((e.clientX - box.left) / box.width) * W;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(x(p.date) - px) < Math.abs(x(points[best].date) - px)) best = i;
    });
    setHover(best);
  };

  const h = hover === null ? null : points[hover];
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <figure className="chart">
      <div className="chart-wrap">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Weight from ${formatWeight(first.kg, unit)} on ${formatDateKey(first.date)} to ${formatWeight(last.kg, unit)} on ${formatDateKey(last.date)}, ${points.length} readings.`}
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {ticks.map((v) => (
            <g key={v}>
              <line className="chart-grid" x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} />
              <text className="chart-axis" x={PAD.left - 6} y={y(v)} textAnchor="end" dominantBaseline="middle">
                {unit === "st" ? v.toFixed(1) : Math.round(v * 10) / 10}
              </text>
            </g>
          ))}
          {xLabels.map((d, i) => (
            <text key={d} className="chart-axis" x={x(d)} y={H - PAD.bottom + 14} textAnchor={i === 0 ? "start" : i === xLabels.length - 1 ? "end" : "middle"}>
              {formatDateKey(d, { day: "numeric", month: "short" })}
            </text>
          ))}
          {rug.map((d, i) => (
            <line key={`${d}-${i}`} className="chart-rug" x1={x(d)} x2={x(d)} y1={RUG_Y - 5} y2={RUG_Y + 5} />
          ))}
          <path className="chart-line" d={path} />
          {points.map((p, i) => (
            <circle key={p.date} className={hover === i ? "chart-dot active" : "chart-dot"} cx={x(p.date)} cy={y(values[i])} r={hover === i ? 5 : 3.5} />
          ))}
          {h && <line className="chart-crosshair" x1={x(h.date)} x2={x(h.date)} y1={PAD.top} y2={H - PAD.bottom} />}
        </svg>
        {h && (
          <div className="chart-tip" style={{ left: `${(x(h.date) / W) * 100}%`, top: `${(y(weightIn(h.kg, unit)) / H) * 100}%` }} role="status">
            <strong>{formatWeight(h.kg, unit)}</strong>
            <span>{formatDateKey(h.date, { weekday: "short", day: "numeric", month: "short" })}</span>
          </div>
        )}
      </div>
      <figcaption className="muted small">
        Weight ({unit === "st" ? "stone" : unit})
        {rug.length > 0 && doseLabel ? <> · ticks along the bottom show {doseLabel} doses</> : null}
      </figcaption>
    </figure>
  );
}
