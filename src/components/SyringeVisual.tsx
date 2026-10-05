import { UNITS_PER_ML, type Syringe } from "../lib/reconstitution";

interface Props {
  syringe: Syringe;
  units: number;
}

/** Horizontal U-100 syringe with graduations, filled to `units`. */
export function SyringeVisual({ syringe, units }: Props) {
  const capacity = syringe.capacityMl * UNITS_PER_ML;
  const labelEvery = capacity <= 30 ? 5 : 10;
  // Draw ticks at 1-unit spacing at most so the 100-unit barrel stays readable.
  const tickStep = Math.max(syringe.tickUnits, capacity > 50 ? 2 : 1);

  const x0 = 40;
  const barrelWidth = 300;
  const y = 20;
  const h = 34;
  const scale = barrelWidth / capacity;
  const fill = Math.min(Math.max(units, 0), capacity) * scale;
  const over = units > capacity;

  const ticks: number[] = [];
  for (let u = 0; u <= capacity + 1e-9; u += tickStep) ticks.push(Math.round(u * 10) / 10);

  return (
    <svg
      className="syringe"
      viewBox="0 0 400 90"
      role="img"
      aria-label={`Syringe filled to ${units} of ${capacity} units`}
    >
      {/* plunger rod + thumb press */}
      <rect x={x0 + fill} y={y + h / 2 - 3} width={barrelWidth - fill + 30} height={6} className="syringe-rod" />
      <rect x={x0 + barrelWidth + 30} y={y - 4} width={6} height={h + 8} rx={2} className="syringe-rod" />
      {/* liquid */}
      <rect x={x0} y={y} width={fill} height={h} className={over ? "syringe-fill over" : "syringe-fill"} />
      {/* plunger stopper */}
      <rect x={x0 + fill - 1} y={y} width={6} height={h} className="syringe-stopper" />
      {/* barrel */}
      <rect x={x0} y={y} width={barrelWidth} height={h} rx={3} className="syringe-barrel" />
      {/* hub + needle */}
      <path d={`M${x0} ${y + 8} L${x0 - 14} ${y + h / 2 - 3} L${x0 - 14} ${y + h / 2 + 3} L${x0} ${y + h - 8} Z`} className="syringe-hub" />
      <line x1={x0 - 14} y1={y + h / 2} x2={4} y2={y + h / 2} className="syringe-needle" />
      {/* graduations */}
      {ticks.map((u) => {
        const major = u % labelEvery === 0;
        const tx = x0 + u * scale;
        return (
          <g key={u}>
            <line x1={tx} y1={y} x2={tx} y2={y + (major ? 14 : 7)} className="syringe-tick" />
            {major && (
              <text x={tx} y={y + h + 16} textAnchor="middle" className="syringe-label">
                {u}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
