import { suggestSite } from "../lib/doseLog";
import type { KeyboardEvent } from "react";

// Tap-to-pick injection sites on a simple body outline, coloured by how recently
// each site was used so rotating is easy. Front view: the person's right is on
// the viewer's left; back view: their right is on the viewer's right. Zones are
// labelled L/R so it never depends on colour or orientation alone.

interface Zone {
  site: string;
  x: number;
  y: number;
  side: "L" | "R";
}

const FRONT: Zone[] = [
  { site: "Upper arm – right", x: 32, y: 60, side: "R" },
  { site: "Upper arm – left", x: 88, y: 60, side: "L" },
  { site: "Abdomen – right", x: 50, y: 94, side: "R" },
  { site: "Abdomen – left", x: 70, y: 94, side: "L" },
  { site: "Thigh – right", x: 48, y: 150, side: "R" },
  { site: "Thigh – left", x: 72, y: 150, side: "L" },
];

const BACK: Zone[] = [
  { site: "Glute – left", x: 50, y: 120, side: "L" },
  { site: "Glute – right", x: 70, y: 120, side: "R" },
];

// One half of the figure, from the centre line outwards; the other half is its mirror image.
const HALF =
  "M60 28.5h4.8l.7 5.5c6.5 2 16.5 3 20.5 8c4 4 5 12 5.5 20l2.5 30c.5 6 2 12 3 18c1 4-1 7-3 6c-2-1-3-6-4-12l-5-34c-.5-4-1.5-8-2.5-10l-1 24c-.5 8 1.5 16 2 26c.5 14-1.5 40-3.5 60c-1 12 0 26-1 40c-.5 8 1 14 3 18c1 3-4 4-10 3c-3-.5-2.5-5-2-9c1-14-2-26-2.5-38c-.5-12-2.5-44-5.5-60l-2-2z";

function Silhouette({ back }: { back?: boolean }) {
  return (
    <g className="site-body">
      {[40, 80, 120, 160, 200].map((y) => (
        <line key={y} x1="6" x2="114" y1={y} y2={y} className="site-grid" />
      ))}
      <line x1="60" x2="60" y1="2" y2="234" className="site-grid" />
      <ellipse cx="60" cy="16" rx="9.5" ry="11.5" />
      <path d={HALF} />
      <path d={HALF} transform="translate(120 0) scale(-1 1)" />
      {back ? <path d="M60 36v80M48 118q12 8 24 0" className="site-detail" /> : <path d="M48 52q6 4 12 0q6 4 12 0M60 100v.1M52 118l8 6l8-6" className="site-detail" />}
    </g>
  );
}

export function recencyClass(days: number | undefined): "recent" | "week" | "rested" | "" {
  if (days === undefined) return "";
  if (days < 3) return "recent";
  if (days < 7) return "week";
  return "rested";
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
  const suggested = suggestSite(lastUsed);
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
        className={`site-zone ${selected ? "selected" : recencyClass(days)}${!value && z.site === suggested ? " suggested" : ""}`}
        onClick={pick}
        onKeyDown={onKey}
      >
        <title>{`${z.site} (${describe(days)})`}</title>
        <circle cx={z.x} cy={z.y} r="12" className="site-hit" />
        <circle cx={z.x} cy={z.y} r="8.5" className="site-ring" />
        <path d={`M${z.x - 12} ${z.y}h4M${z.x + 8} ${z.y}h4M${z.x} ${z.y - 12}v4M${z.x} ${z.y + 8}v4`} className="site-cross" />
        <text x={z.x} y={z.y} textAnchor="middle" dominantBaseline="central">
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
            <Silhouette back />
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
          <i className="swatch rested" aria-hidden /> Rested a week+
        </span>
        <span>
          <i className="swatch selected" aria-hidden /> Chosen
        </span>
        <button type="button" className={value === "Other" ? "chip active" : "chip"} onClick={() => onChange(value === "Other" ? "" : "Other")} aria-pressed={value === "Other"}>
          Other site
        </button>
      </div>
      {suggested && !value && (
        <div className="site-suggest">
          <span className="small">
            <span className="muted">Suggested next:</span> <strong>{suggested}</strong>
            <span className="muted"> ({describe(lastUsed.get(suggested))})</span>
          </span>
          <button type="button" className="button small" onClick={() => onChange(suggested)}>
            Use this site
          </button>
        </div>
      )}
      <p className="muted small" aria-live="polite">
        {value ? `Chosen: ${value}${value !== "Other" ? ` (${describe(lastUsed.get(value))})` : ""}.` : "Tap where you injected. L and R are your left and right."}
      </p>
    </div>
  );
}
