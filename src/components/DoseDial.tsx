import { useEffect, useId, useRef } from "react";

export interface DialDose {
  /** Hour of the day as a decimal, e.g. 21.5 for 21:30. */
  hour: number;
  taken: boolean;
}

interface Props {
  doses: DialDose[];
  /** Reading for the reserve subdial: the vial closest to running out. */
  reserve?: { fraction: number; text: string };
  /** Monday-to-Sunday share of doses logged this week; null for days still to come or with nothing scheduled. */
  week: (number | null)[];
  todayIndex: number;
  /** Days in a row with every scheduled dose logged. */
  streak: number;
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
export function DoseDial({ doses, reserve, week, todayIndex, streak }: Props) {
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
          if (h === 12)
            return (
              <g key={h} transform={`translate(${x} ${y})`} className="dial-sun">
                <circle r="2.3" />
                {[0, 45, 90, 135, 180, 225, 270, 315].map((r) => (
                  <line key={r} y1="-3.6" y2="-5" transform={`rotate(${r})`} />
                ))}
              </g>
            );
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
        {[32, 26, 20, 14, 8].map((r) => (
          <circle key={r} cx="104" cy="176" r={r} className="dial-az" />
        ))}
        <path d={arc(104, 176, 27, -120, 120)} className="dial-arc" />
        {reserve && frac > 0 && <path d={arc(104, 176, 27, -120, -120 + 240 * frac)} className={frac <= 0.25 ? "dial-arc low" : "dial-arc on"} />}
        {reserve && <line x1="104" y1="176" x2={104 + 23 * Math.sin(((-120 + 240 * frac) * Math.PI) / 180)} y2={176 - 23 * Math.cos(((-120 + 240 * frac) * Math.PI) / 180)} className="dial-needle" />}
        <circle cx="104" cy="176" r="2" className="dial-pin" />
        <text x="104" y="196" className="dial-small">
          {reserve ? reserve.text : "NO VIAL"}
        </text>
        <text x="104" y="205" className="dial-small">
          RESERVE
        </text>

        {/* streak, at three */}
        <circle cx="236" cy="176" r="38" className="dial-sub" />
        {[32, 26, 20, 14, 8].map((r) => (
          <circle key={r} cx="236" cy="176" r={r} className="dial-az" />
        ))}
        {week.map((f, i) => {
          const a = ((-72 + i * 24 - 90) * Math.PI) / 180;
          const tone = f === null ? "" : f >= 1 ? " on" : f > 0 ? " part" : " miss";
          return <circle key={i} cx={236 + 27 * Math.cos(a)} cy={176 + 27 * Math.sin(a)} r="2.3" className={`dial-day${tone}${i === todayIndex ? " now" : ""}`} />;
        })}
        <text x="236" y="182" className="dial-num">
          {streak}
        </text>
        <text x="236" y="196" className="dial-small">
          {streak === 1 ? "DAY" : "DAYS"}
        </text>
        <text x="236" y="205" className="dial-small">
          STREAK
        </text>

        {/* today's count, at six */}
        <circle cx={C} cy="240" r="38" className="dial-sub" />
        {[32, 26, 20, 14, 8].map((r) => (
          <circle key={r} cx={C} cy="240" r={r} className="dial-az" />
        ))}
        {doses.map((d, i) => {
          const g = total > 1 ? 14 : 0;
          return <path key={i} d={arc(C, 240, 30, -130 + (260 / total) * i + g / 2, -130 + (260 / total) * (i + 1) - g / 2)} className={d.taken ? "dial-seg on" : "dial-seg"} />;
        })}
        <text x={C} y="246" className="dial-num">
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
