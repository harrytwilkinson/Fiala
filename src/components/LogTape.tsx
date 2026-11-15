import { addDays, formatDateKey, localDateKey } from "../lib/dates";
import type { DoseEntry } from "../lib/doseLog";

const DAYS = 28;
const W = 358;
const H = 92;
const X0 = 10;
const STEP = (W - 2 * X0) / (DAYS - 1);
const BASE = 66;

/** The last four weeks as an instrument trace: one column per day, one mark per dose logged. */
export function LogTape({ entries, today = localDateKey() }: { entries: DoseEntry[]; today?: string }) {
  const counts = new Map<string, number>();
  for (const e of entries) {
    const k = localDateKey(new Date(e.takenAt));
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const days = Array.from({ length: DAYS }, (_, i) => addDays(today, i - (DAYS - 1)));
  const total = days.reduce((n, d) => n + (counts.get(d) ?? 0), 0);
  return (
    <svg className="log-tape" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${total} doses logged in the last four weeks`}>
      {[0, 1, 2, 3].map((r) => (
        <line key={r} x1={X0} x2={W - X0} y1={BASE - r * 16} y2={BASE - r * 16} className={r === 0 ? "tape-base" : "tape-grid"} />
      ))}
      {days.map((d, i) => {
        const x = X0 + i * STEP;
        const n = counts.get(d) ?? 0;
        const [y, m, dd] = d.split("-").map(Number);
        const monday = new Date(y, m - 1, dd).getDay() === 1;
        return (
          <g key={d}>
            <line x1={x} x2={x} y1={BASE} y2={BASE + (monday ? 7 : 4)} className={monday ? "tape-tick major" : "tape-tick"} />
            {monday && (
              <text x={x} y={BASE + 18} className="tape-label">
                {formatDateKey(d, { month: "short", day: "numeric" })}
              </text>
            )}
            {n > 0 && <line x1={x} x2={x} y1={BASE - 3} y2={BASE - Math.min(n, 4) * 14} className="tape-stem" />}
            {Array.from({ length: Math.min(n, 4) }, (_, k) => (
              <circle key={k} cx={x} cy={BASE - 14 - k * 14} r="3" className="tape-dot" />
            ))}
            {n > 4 && (
              <text x={x} y="6" className="tape-label">
                +{n - 4}
              </text>
            )}
          </g>
        );
      })}
      <line x1={W - X0} x2={W - X0} y1="10" y2={BASE} className="tape-now" />
      <text x={W - X0} y="5" className="tape-label now" textAnchor="end">
        NOW
      </text>
    </svg>
  );
}
