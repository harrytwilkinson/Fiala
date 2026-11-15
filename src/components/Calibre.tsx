import type { ReactNode } from "react";

/** Page heading: a small engraved label over a thin display title, with an optional control on the right. */
export function Head({ label, title, children }: { label: string; title: string; children?: ReactNode }) {
  return (
    <header className="cal-head">
      <div>
        <span className="cal-label">{label}</span>
        <h1>{title}</h1>
      </div>
      {children}
    </header>
  );
}

/** Section with an engraved label, a hairline rule and an optional note or control on the right. */
export function Sec({ title, right, children, className }: { title: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={className ? `cal-sec ${className}` : "cal-sec"}>
      <div className="cal-sec-h">
        <h2>{title}</h2>
        <i aria-hidden />
        {right}
      </div>
      {children}
    </section>
  );
}

/** The Fiala vial, drawn as a line mark. */
export function VialMark() {
  return (
    <svg viewBox="0 0 16 22" className="vial-mark" aria-hidden="true">
      <path className="lq" d="M3 13.5h10V18a2.5 2.5 0 0 1-2.5 2.5h-5A2.5 2.5 0 0 1 3 18z" />
      <rect x="4.5" y="1" width="7" height="3.2" rx="1" />
      <path d="M5.7 4.2v2.3M10.3 4.2v2.3" />
      <rect x="2.5" y="6.5" width="11" height="14.5" rx="3" />
    </svg>
  );
}

const pt = (c: number, r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return `${(c + r * Math.cos(a)).toFixed(2)} ${(c + r * Math.sin(a)).toFixed(2)}`;
};

/** Power-reserve style gauge: an arc and needle showing how much of a vial is left. */
export function ReserveGauge({ fraction, low }: { fraction: number; low?: boolean }) {
  const c = 27;
  const r = 21;
  const f = Math.min(1, Math.max(0, fraction));
  const end = -130 + 260 * f;
  return (
    <svg viewBox="0 0 54 54" className="reserve-gauge" aria-hidden="true">
      <path d={`M${pt(c, r, -130)} A${r} ${r} 0 1 1 ${pt(c, r, 130)}`} className="rv-track" />
      {f > 0 && <path d={`M${pt(c, r, -130)} A${r} ${r} 0 ${end + 130 > 180 ? 1 : 0} 1 ${pt(c, r, end)}`} className={low ? "rv-arc low" : "rv-arc"} />}
      {Array.from({ length: 11 }, (_, i) => {
        const d = -130 + 26 * i;
        return <path key={i} d={`M${pt(c, r + 1.5, d)} L${pt(c, r + (i % 5 === 0 ? 5 : 3.5), d)}`} className="rv-tick" />;
      })}
      <path d={`M${c} ${c} L${pt(c, r - 3, end)}`} className="rv-needle" />
      <circle cx={c} cy={c} r="2.2" className="rv-cap" />
    </svg>
  );
}
