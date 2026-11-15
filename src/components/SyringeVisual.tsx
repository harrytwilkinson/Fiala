import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { UNITS_PER_ML, roundToTick, type Syringe } from "../lib/reconstitution";

interface Props {
  syringe: Syringe;
  units: number;
  /** Makes the plunger draggable; called with the units the user pulls it to, snapped to the syringe's marks. */
  onUnitsChange?: (units: number) => void;
}

const X0 = 40;
const BARREL = 300;
const VIEW_WIDTH = 400;

/** Horizontal U-100 syringe with graduations, filled to `units`. */
export function SyringeVisual({ syringe, units, onUnitsChange }: Props) {
  const capacity = syringe.capacityMl * UNITS_PER_ML;
  const labelEvery = capacity <= 30 ? 5 : 10;
  // Draw ticks at 1-unit spacing at most so the 100-unit barrel stays readable.
  const tickStep = Math.max(syringe.tickUnits, capacity > 50 ? 2 : 1);
  const [dragging, setDragging] = useState(false);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, ""); // ids with ":" break url(#…) references
  const shown = useTweened(units, !dragging);

  const y = 20;
  const h = 34;
  const scale = BARREL / capacity;
  const fill = Math.min(Math.max(shown, 0), capacity) * scale;
  const over = units > capacity;

  const ticks: number[] = [];
  for (let u = 0; u <= capacity + 1e-9; u += tickStep) ticks.push(Math.round(u * 10) / 10);

  const interactive = !!onUnitsChange;
  const set = (u: number) => {
    const snapped = Math.min(capacity, Math.max(syringe.tickUnits, roundToTick(u, syringe.tickUnits)));
    if (snapped !== units) onUnitsChange?.(Math.round(snapped * 10) / 10);
  };
  const fromPointer = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * VIEW_WIDTH;
    set((x - X0) / scale);
  };
  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
    if (step === undefined) return;
    e.preventDefault();
    set(units + step * syringe.tickUnits);
  };

  return (
    <svg
      className={interactive ? "syringe interactive" : "syringe"}
      viewBox={interactive ? `0 -58 ${VIEW_WIDTH} 148` : `0 0 ${VIEW_WIDTH} 90`}
      {...(interactive
        ? {
            role: "slider",
            tabIndex: 0,
            "aria-label": "Syringe units",
            "aria-valuemin": 0,
            "aria-valuemax": capacity,
            "aria-valuenow": units,
            "aria-valuetext": `${units} units`,
            onKeyDown,
            onPointerDown: (e: PointerEvent<SVGSVGElement>) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setDragging(true);
              fromPointer(e);
            },
            onPointerMove: (e: PointerEvent<SVGSVGElement>) => {
              if (dragging) fromPointer(e);
            },
            onPointerUp: () => setDragging(false),
            onPointerCancel: () => setDragging(false),
          }
        : { role: "img", "aria-label": `Syringe filled to ${units} of ${capacity} units` })}
    >
      {/* plunger rod + thumb press */}
      <rect x={X0 + fill} y={y + h / 2 - 3} width={BARREL - fill + 30} height={6} className="syringe-rod" />
      <rect x={X0 + BARREL + 30} y={y - 4} width={6} height={h + 8} rx={2} className="syringe-rod" />
      {/* liquid */}
      <rect x={X0} y={y} width={fill} height={h} className={over ? "syringe-fill over" : "syringe-fill"} />
      {/* plunger stopper, with a grip when draggable */}
      <rect x={X0 + fill - 1} y={y} width={6} height={h} className="syringe-stopper" />
      {/* barrel */}
      <rect x={X0} y={y} width={BARREL} height={h} rx={3} className="syringe-barrel" />
      {/* hub + needle */}
      <path d={`M${X0} ${y + 8} L${X0 - 14} ${y + h / 2 - 3} L${X0 - 14} ${y + h / 2 + 3} L${X0} ${y + h - 8} Z`} className="syringe-hub" />
      <line x1={X0 - 14} y1={y + h / 2} x2={4} y2={y + h / 2} className="syringe-needle" />
      {/* graduations */}
      <g id={`ticks-${uid}`}>
        {ticks.map((u) => {
          const tx = X0 + u * scale;
          return <line key={u} x1={tx} y1={y} x2={tx} y2={y + (u % labelEvery === 0 ? 14 : 7)} className="syringe-tick" />;
        })}
      </g>
      {ticks
        .filter((u) => u % labelEvery === 0)
        .map((u) => (
          <text key={u} x={X0 + u * scale} y={y + h + 16} textAnchor="middle" className="syringe-label">
            {u}
          </text>
        ))}
      {/* loupe: a magnified view of the marks around the plunger */}
      {interactive && (
        <g transform={`translate(${X0 + fill} 0)`} className="loupe">
          <clipPath id={`lens-${uid}`}>
            <circle cx="0" cy="-27" r="24" />
          </clipPath>
          <line x1="0" x2="0" y1="-2" y2={y + h} className="loupe-cursor" />
          <circle cx="0" cy="-27" r="26" className="loupe-body" />
          <g clipPath={`url(#lens-${uid})`}>
            <g transform={`translate(0 -27) scale(2.2) translate(${-(X0 + fill)} ${-(y + 7)})`}>
              <rect x={X0} y={y} width={fill} height={h} className={over ? "syringe-fill over" : "syringe-fill"} />
              <use href={`#ticks-${uid}`} />
            </g>
          </g>
          <circle cx="0" cy="-27" r="25" className="loupe-ring" />
          <path d="M-16 -41a21 21 0 0 1 19 -8" className="loupe-glint" />
        </g>
      )}
    </svg>
  );
}

/** Eases from the previous value to `target`; jumps straight there when `animate` is off or motion is reduced. */
function useTweened(target: number, animate: boolean): number {
  const [value, setValue] = useState(target);
  const current = useRef(target);
  useEffect(() => {
    const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!animate || reduce || typeof requestAnimationFrame !== "function") {
      current.current = target;
      setValue(target);
      return;
    }
    const from = current.current;
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 380);
      current.current = from + (target - from) * (1 - Math.pow(1 - t, 3));
      setValue(current.current);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, animate]);
  return value;
}
