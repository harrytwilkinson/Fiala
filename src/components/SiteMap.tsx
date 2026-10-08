import type { KeyboardEvent } from "react";

// Tap-to-pick injection sites on a simple body outline, coloured by how recently
// each site was used so rotating is easy. Front view: the person's right is on
// the viewer's left; back view: their right is on the viewer's right. Zones are
// labelled L/R so it never depends on colour or orientation alone.

interface Zone {
  site: string;
  x: number;
  y: number;
  w: number;
  h: number;
  side: "L" | "R";
}

const FRONT: Zone[] = [
  { site: "Upper arm – right", x: 22, y: 44, w: 12, h: 30, side: "R" },
  { site: "Upper arm – left", x: 86, y: 44, w: 12, h: 30, side: "L" },
  { site: "Abdomen – right", x: 40, y: 78, w: 19, h: 28, side: "R" },
  { site: "Abdomen – left", x: 61, y: 78, w: 19, h: 28, side: "L" },
  { site: "Thigh – right", x: 40, y: 126, w: 18, h: 42, side: "R" },
  { site: "Thigh – left", x: 62, y: 126, w: 18, h: 42, side: "L" },
];

const BACK: Zone[] = [
  { site: "Glute – left", x: 40, y: 104, w: 19, h: 24, side: "L" },
  { site: "Glute – right", x: 61, y: 104, w: 19, h: 24, side: "R" },
];

function Silhouette() {
  return (
    <g className="site-body">
      <circle cx="60" cy="18" r="12" />
      <rect x="54" y="28" width="12" height="8" />
      <rect x="36" y="34" width="48" height="84" rx="10" />
      <rect x="22" y="38" width="12" height="72" rx="6" />
      <rect x="86" y="38" width="12" height="72" rx="6" />
      <rect x="39" y="114" width="20" height="116" rx="8" />
      <rect x="61" y="114" width="20" height="116" rx="8" />
    </g>
  );
}

export function recencyClass(days: number | undefined): "recent" | "week" | "" {
  if (days === undefined) return "";
  if (days < 3) return "recent";
  if (days < 7) return "week";
  return "";
}

function describe(days: number | undefined): string {
  if (days === undefined) return "not used yet";
  if (days === 0) return "used today";
  return `used ${days} day${days === 1 ? "" : "s"} ago`;
}

interface Props {
  value: string;
  onChange: (site: string) => void;
  /** Days since each site was last used. */
  lastUsed: Map<string, number>;
}

export function SiteMap({ value, onChange, lastUsed }: Props) {
  const zone = (z: Zone) => {
    const days = lastUsed.get(z.site);
    const selected = value === z.site;
    const pick = () => onChange(selected ? "" : z.site);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        pick();
      }
    };
    return (
      <g
        key={z.site}
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        aria-label={`${z.site}, ${describe(days)}`}
        className={`site-zone ${selected ? "selected" : recencyClass(days)}`}
        onClick={pick}
        onKeyDown={onKey}
      >
        <title>{`${z.site} (${describe(days)})`}</title>
        <rect x={z.x} y={z.y} width={z.w} height={z.h} rx="4" />
        <text x={z.x + z.w / 2} y={z.y + z.h / 2} textAnchor="middle" dominantBaseline="central">
          {z.side}
        </text>
      </g>
    );
  };

  return (
    <div className="site-map">
      <div className="site-figures">
        <figure>
          <svg viewBox="0 0 120 236" aria-label="Front of body">
            <Silhouette />
            {FRONT.map(zone)}
          </svg>
          <figcaption>Front</figcaption>
        </figure>
        <figure>
          <svg viewBox="0 0 120 236" aria-label="Back of body">
            <Silhouette />
            {BACK.map(zone)}
          </svg>
          <figcaption>Back</figcaption>
        </figure>
      </div>
      <div className="site-legend small">
        <span>
          <i className="swatch recent" aria-hidden /> Last 3 days
        </span>
        <span>
          <i className="swatch week" aria-hidden /> Last week
        </span>
        <span>
          <i className="swatch selected" aria-hidden /> Chosen
        </span>
        <button type="button" className={value === "Other" ? "chip active" : "chip"} onClick={() => onChange(value === "Other" ? "" : "Other")} aria-pressed={value === "Other"}>
          Other site
        </button>
      </div>
      <p className="muted small" aria-live="polite">
        {value ? `Chosen: ${value}${value !== "Other" ? ` (${describe(lastUsed.get(value))})` : ""}.` : "Tap where you injected. L and R are your left and right."}
      </p>
    </div>
  );
}
