import { useId } from "react";

/** Ring split into one arc per dose due today; taken doses are filled. */
export function DoseRing({ taken, total }: { taken: boolean[]; total: number }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const gap = total > 1 ? 10 : 0; // px of circumference between arcs
  const arc = c / total - gap;
  const done = taken.filter(Boolean).length;
  return (
    <svg className="dose-ring" viewBox="0 0 120 120" role="img" aria-label={`${done} of ${total} doses taken today`}>
      {taken.map((t, i) => (
        <circle
          key={i}
          cx="60"
          cy="60"
          r={r}
          className={t ? "ring-arc done" : "ring-arc"}
          strokeDasharray={`${Math.max(arc, 0.01)} ${c}`}
          transform={`rotate(${-90 + (360 / total) * i + (gap / c) * 180} 60 60)`}
        />
      ))}
      <text x="60" y="64" textAnchor="middle" className="ring-count">
        {done}/{total}
      </text>
      <text x="60" y="82" textAnchor="middle" className="ring-label">
        {done === total ? "all done" : "taken"}
      </text>
    </svg>
  );
}

/** Small vial whose liquid level shows how much is left. */
export function VialGlyph({ fraction, low }: { fraction: number; low?: boolean }) {
  const top = 22;
  const bottom = 58;
  const level = bottom - (bottom - top) * Math.min(Math.max(fraction, 0), 1);
  const clip = `vial-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`; // ids with ":" or "«" break url(#…) references
  return (
    <svg className="vial-glyph" viewBox="0 0 32 62" aria-hidden="true">
      <clipPath id={clip}>
        <rect x="5" y={top} width="22" height={bottom - top} rx="6" />
      </clipPath>
      <rect x="5" y={level} width="22" height={bottom - level} clipPath={`url(#${clip})`} className={low ? "vial-liquid low" : "vial-liquid"} />
      <rect x="5" y={top} width="22" height={bottom - top} rx="6" className="vial-glass" />
      <rect x="10" y="12" width="12" height="10" className="vial-neck" />
      <rect x="7" y="3" width="18" height="10" rx="3" className="vial-cap" />
    </svg>
  );
}

/** Countdown to a vial's discard date: a ring that empties as the date nears, with the days left. */
export function DiscardCountdown({ daysLeft, totalDays }: { daysLeft: number; totalDays: number }) {
  const r = 9;
  const c = 2 * Math.PI * r;
  const frac = totalDays > 0 ? Math.min(1, Math.max(0, daysLeft / totalDays)) : 0;
  const tone = daysLeft < 0 ? "over" : daysLeft <= 3 ? "soon" : "ok";
  const text = daysLeft < 0 ? "Past discard date" : daysLeft === 0 ? "Discard today" : `Discard in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;
  return (
    <span className={`countdown ${tone}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r={r} className="countdown-track" />
        <circle cx="12" cy="12" r={r} className="countdown-arc" strokeDasharray={`${c * frac} ${c}`} transform="rotate(-90 12 12)" />
      </svg>
      {text}
    </span>
  );
}
