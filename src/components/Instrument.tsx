import { useRef, type KeyboardEvent, type PointerEvent } from "react";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Mechanical-counter readout: each digit sits in its own window and rolls to the next value. */
export function Odometer({ value, label }: { value: string; label: string }) {
  const chars = value.padStart(3, " ").split("");
  return (
    <span className="odo" role="img" aria-label={label}>
      {chars.map((ch, i) =>
        /\d| /.test(ch) ? (
          <span key={i} className={ch === " " ? "odo-d blank" : "odo-d"}>
            <span className="odo-strip" style={{ transform: `translateY(-${(ch === " " ? 0 : Number(ch)) * 10}%)` }}>
              {DIGITS.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </span>
          </span>
        ) : (
          <span key={i} className="odo-sep">
            {ch}
          </span>
        ),
      )}
    </span>
  );
}

interface WheelProps {
  value: number;
  step: number;
  min: number;
  label: string;
  onChange: (value: number) => void;
}

const PX_PER_STEP = 7;

/** Knurled thumbwheel: drag sideways (or use the arrow keys) to nudge a number up or down in fixed steps. */
export function Thumbwheel({ value, step, min, label, onChange }: WheelProps) {
  const drag = useRef<{ x: number; base: number } | null>(null);
  const snap = (v: number) => Math.max(min, Math.round(v / step) * step);
  const safe = Number.isFinite(value) ? value : min;
  return (
    <div
      className="wheel"
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={min}
      aria-valuenow={safe}
      style={{ ["--off" as string]: `${(safe / step) * PX_PER_STEP}px` }}
      onPointerDown={(e: PointerEvent<HTMLDivElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX, base: safe };
      }}
      onPointerMove={(e: PointerEvent<HTMLDivElement>) => {
        if (!drag.current) return;
        const next = snap(drag.current.base + ((e.clientX - drag.current.x) / PX_PER_STEP) * step);
        if (next !== safe) onChange(next);
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
        if (d === undefined) return;
        e.preventDefault();
        onChange(snap(safe + d * step));
      }}
    >
      <i className="wheel-ribs" />
      <i className="wheel-shade" />
      <i className="wheel-index" />
    </div>
  );
}
