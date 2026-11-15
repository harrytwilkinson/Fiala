import { useEffect, useId, useRef } from "react";

export interface DialDose {
  /** Hour of the day as a decimal, e.g. 21.5 for 21:30. */
  hour: number;
  taken: boolean;
}

interface Props {
  doses: DialDose[];
  /** Fullest-to-emptiest reading for the reserve subdial: the vial closest to running out. */
  reserve?: { fraction: number; label: string };
}

const C = 170;
const pol = (r: number, deg: number): [number, number] => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
};
const arc = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const p = (deg: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  };
  return `M${p(a0)} A${r} ${r} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} 1 ${p(a1)}`;
};
/** Noon sits at the top of the dial and midnight at the bottom, so the day reads like the sun's path. */
const angle = (hour: number) => ((hour - 12) / 24) * 360;

/** Today as a 24-hour instrument dial: a marker at each dose time, live hands, and small dials for the day's count and vial reserve. */
export function DoseDial({ doses, reserve }: Props) {
  const glow = `dial-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const hourHand = useRef<SVGGElement>(null);
  const secondHand = useRef<SVGGElement>(null);
  const done = doses.filter((d) => d.taken).length;
  const total = doses.length;

  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let timer = 0;
    const paint = () => {
      const d = new Date();
      hourHand.current?.setAttribute("transform", `rotate(${angle(d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600).toFixed(2)} ${C} ${C})`);
      secondHand.current?.setAttribute("transform", `rotate(${((d.getSeconds() + (still ? 0 : d.getMilliseconds() / 1000)) * 6).toFixed(2)} ${C} ${C})`);
    };
    const loop = () => {
      if (!document.hidden) paint();
      raf = requestAnimationFrame(loop);
    };
    paint();
    if (still) timer = window.setInterval(paint, 1000);
    else raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(timer);
    };
  }, []);

  const now = new Date();
  const nowHour = now.getHours() + now.getMinutes() / 60;
  const next = doses.filter((d) => !d.taken && d.hour >= nowHour).sort((a, b) => a.hour - b.hour)[0];
  const wait = next ? Math.max(0, next.hour - nowHour) : 0;
  const waitText = !next ? (done === total && total > 0 ? "done" : "none") : wait < 1 ? `${Math.round(wait * 60)} min` : `${Math.floor(wait)} h ${String(Math.round((wait % 1) * 60)).padStart(2, "0")}`;
  const frac = reserve ? Math.min(1, Math.max(0, reserve.fraction)) : 0;

  return (
    <div className="dial">
      <div className="dial-bezel" />
      <div className="dial-face" />
      <svg viewBox="0 0 340 340" role="img" aria-label={total ? `24-hour dial: ${done} of ${total} doses taken today` : "24-hour dial: nothing scheduled today"}>
        <defs>
          <filter id={glow} x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>
        {Array.from({ length: 24 }, (_, h) => {
          const d = angle(h);
          const [x, y] = pol(161.4, d);
          if (h === 12) return <circle key={h} cx={x} cy={y} r="2.6" className="dial-sun" />;
          if (h === 0) return <path key={h} transform={`translate(${x} ${y}) rotate(180)`} d="M1.6 -3.6a4 4 0 1 0 0 7.2a3.2 3.2 0 0 1 0 -7.2z" className="dial-moon" />;
          if (h % 2) return <circle key={h} cx={x} cy={y} r="0.9" className="dial-pip" />;
          return (
            <text key={h} x={x} y={y} transform={`rotate(${d} ${x} ${y})`} className="dial-hour">
              {String(h).padStart(2, "0")}
            </text>
          );
        })}
        {Array.from({ length: 96 }, (_, i) => {
          const major = i % 4 === 0;
          const [x1, y1] = pol(major ? 139.5 : i % 2 === 0 ? 144 : 146.5, i * 3.75);
          const [x2, y2] = pol(150.5, i * 3.75);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className={major ? "dial-tick major" : "dial-tick"} />;
        })}
        <circle cx={C} cy={C} r="124.5" className="dial-track" />
        <text x={C} y="97" className="dial-brand">
          FIALA
        </text>
        <text x={C} y="108" className="dial-small">
          24 H · DOSE DIAL
        </text>

        {/* reserve, at nine */}
        <circle cx="104" cy="176" r="38" className="dial-sub" />
        <path d={arc(104, 176, 27, -120, 120)} className="dial-arc" />
        {reserve && <path d={arc(104, 176, 27, -120, -120 + 240 * Math.max(frac, 0.001))} className={frac <= 0.25 ? "dial-arc low" : "dial-arc on"} />}
        <text x="104" y="180" className="dial-num">
          {reserve ? Math.round(frac * 100) : "–"}
        </text>
        <text x="104" y="194" className="dial-small">
          {reserve ? "% LEFT" : "NO VIAL"}
        </text>
        <text x="104" y="204" className="dial-small">
          RESERVE
        </text>

        {/* next dose, at three */}
        <circle cx="236" cy="176" r="38" className="dial-sub" />
        <path d={arc(236, 176, 27, -120, 120)} className="dial-arc" />
        {next && <path d={arc(236, 176, 27, -120, -120 + 240 * Math.max(0.001, 1 - Math.min(wait, 12) / 12))} className="dial-arc amber" />}
        <text x="236" y="180" className={waitText.length > 4 ? "dial-num sm" : "dial-num"}>
          {waitText}
        </text>
        <text x="236" y="199" className="dial-small">
          NEXT DOSE
        </text>

        {/* today's count, at six */}
        <circle cx={C} cy="240" r="38" className="dial-sub" />
        {doses.map((d, i) => {
          const g = total > 1 ? 14 : 0;
          return <path key={i} d={arc(C, 240, 30, -130 + (260 / total) * i + g / 2, -130 + (260 / total) * (i + 1) - g / 2)} className={d.taken ? "dial-seg on" : "dial-seg"} />;
        })}
        <text x={C} y="244" className="dial-num">
          {done}
          <tspan className="dial-of">/{total}</tspan>
        </text>
        <text x={C} y="258" className="dial-small">
          TAKEN
        </text>

        {doses.map((d, i) => (
          <g key={i} transform={`rotate(${angle(d.hour)} ${C} ${C})`}>
            {d.taken && <rect x="166" y="38" width="8" height="15" rx="4" className="dial-baton-glow" filter={`url(#${glow})`} />}
            <rect x="166.5" y="38.5" width="7" height="14" rx="3.5" className={d.taken ? "dial-baton on" : "dial-baton"} />
          </g>
        ))}
        <g ref={hourHand} className="dial-hand">
          <path d="M168.7 192 L169.3 36 L170 27 L170.7 36 L171.3 192 Z" />
        </g>
        <g ref={secondHand} className="dial-second">
          <line x1={C} y1="198" x2={C} y2="22" />
          <circle cx={C} cy="198" r="2.6" />
        </g>
        <circle cx={C} cy={C} r="6" className="dial-cap" />
        <circle cx={C} cy={C} r="2" className="dial-pin" />
      </svg>
      <div className="dial-glass" />
    </div>
  );
}
