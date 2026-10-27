import { useEffect, useState, type ReactNode } from "react";
import { ConverterNav } from "../components/ConverterNav";
import { href } from "../lib/router";

// A general, step-by-step guide to reconstituting a powdered vial. It never mentions doses or amounts:
// how much water to add comes from the user's prescriber, pharmacist or the converter.

interface Step {
  title: string;
  body: ReactNode;
  art: ReactNode;
  /** Optional countdown, in seconds. */
  timer?: { seconds: number; label: string };
}

const STEPS: Step[] = [
  {
    title: "Get everything ready",
    body: (
      <>
        <p>You'll need the peptide vial, bacteriostatic water, alcohol swabs, a syringe for mixing and a sharps container.</p>
        <p>Wash your hands and work on a clean, dry surface. Check the label and expiry date on both vials.</p>
      </>
    ),
    art: <ArtKit />,
  },
  {
    title: "Wipe the stoppers",
    body: (
      <>
        <p>Flip the plastic caps off both vials. Wipe each rubber stopper with a fresh alcohol swab.</p>
        <p>Let them air-dry. Don't blow on them or wipe them dry.</p>
      </>
    ),
    art: <ArtSwab />,
    timer: { seconds: 30, label: "Drying" },
  },
  {
    title: "Draw up the water",
    body: (
      <>
        <p>
          Pull the plunger back to the amount of water you plan to add, push the needle into the water vial and push the air
          in. Turn the vial upside down and draw the water slowly.
        </p>
        <p>
          Not sure how much water? Use the amount your prescriber or pharmacist gave you. The{" "}
          <a href={href("calculator")}>converter</a> shows how each amount changes what the syringe marks hold.
        </p>
      </>
    ),
    art: <ArtDraw />,
  },
  {
    title: "Add it slowly down the side",
    body: (
      <>
        <p>
          Push the needle through the peptide vial's stopper at an angle so the tip rests against the glass. Press the plunger
          slowly and let the water run down the inside wall.
        </p>
        <p>Don't spray it straight onto the powder. If the vial pulls the water in by itself, slow it down with the plunger.</p>
      </>
    ),
    art: <ArtPour />,
  },
  {
    title: "Swirl, don't shake",
    body: (
      <>
        <p>Gently swirl the vial or roll it between your palms until the powder has dissolved. Shaking can damage peptides.</p>
        <p>
          Some take a few minutes. The liquid should be clear. If it stays cloudy or has specks in it, don't use it and ask your
          pharmacist.
        </p>
      </>
    ),
    art: <ArtSwirl />,
    timer: { seconds: 180, label: "Dissolving" },
  },
  {
    title: "Label, store and log",
    body: (
      <>
        <p>Write the date and how much water you added on the vial. Keep it in the fridge, away from light, and don't freeze it.</p>
        <p>Log it as a mixed vial in Fiala to see how much is left and when to throw it away.</p>
      </>
    ),
    art: <ArtLabel />,
  },
];

export function MixingPage() {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  return (
    <div className="page">
      <h1>How to mix a vial</h1>
      <ConverterNav active="mixing" />
      <p className="notice small">A general guide. Follow any instructions from your prescriber, pharmacist or the product itself first.</p>

      <section className="card mix-card" aria-live="polite">
        <div className="mix-progress" aria-hidden>
          {STEPS.map((_, n) => (
            <i key={n} className={n <= i ? "on" : ""} />
          ))}
        </div>
        <div className="mix-art" key={`art-${i}`}>
          {step.art}
        </div>
        <p className="result-label">
          Step {i + 1} of {STEPS.length}
        </p>
        <h2 className="mix-title">{step.title}</h2>
        <div className="mix-body">{step.body}</div>
        {step.timer && <StepTimer key={`timer-${i}`} seconds={step.timer.seconds} label={step.timer.label} />}
        <div className="mix-actions">
          <button type="button" className="button secondary" disabled={i === 0} onClick={() => setI(i - 1)}>
            Back
          </button>
          {last ? (
            <a className="button" href={href("tracker/vials")}>
              Log a mixed vial
            </a>
          ) : (
            <button type="button" className="button" onClick={() => setI(i + 1)}>
              Next
            </button>
          )}
        </div>
      </section>

      <ol className="mix-list">
        {STEPS.map((s, n) => (
          <li key={s.title}>
            <button type="button" className={n === i ? "active" : ""} aria-current={n === i ? "step" : undefined} onClick={() => setI(n)}>
              {s.title}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function StepTimer({ seconds, label }: { seconds: number; label: string }) {
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);
  useEffect(() => {
    if (left === 0) setRunning(false);
  }, [left]);
  const r = 22;
  const c = 2 * Math.PI * r;
  const mmss = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  return (
    <div className="mix-timer">
      <svg viewBox="0 0 56 56" aria-hidden>
        <circle cx="28" cy="28" r={r} className="mix-timer-track" />
        <circle cx="28" cy="28" r={r} className="mix-timer-arc" strokeDasharray={`${(c * left) / seconds} ${c}`} transform="rotate(-90 28 28)" />
      </svg>
      <div>
        <span className="result-label">{left === 0 ? "Done" : label}</span>
        <div className="mix-timer-time" role="timer" aria-live="off">
          {mmss}
        </div>
      </div>
      <button
        type="button"
        className="button small secondary"
        onClick={() => {
          if (left === 0) setLeft(seconds);
          setRunning(left === 0 ? true : !running);
        }}
      >
        {left === 0 ? "Restart" : running ? "Pause" : left < seconds ? "Resume" : "Start timer"}
      </button>
    </div>
  );
}

// ---------- step illustrations (shared shapes, animated in CSS) ----------

function Vial({ x = 0, liquid = 0.4, powder = false }: { x?: number; liquid?: number; powder?: boolean }) {
  const top = 46;
  const bottom = 120;
  const level = bottom - (bottom - top) * liquid;
  return (
    <g transform={`translate(${x} 0)`}>
      <rect x="6" y="20" width="36" height="14" rx="4" className="art-cap" />
      <rect x="13" y="32" width="22" height="14" className="art-neck" />
      {liquid > 0 && <rect x="2" y={level} width="44" height={bottom - level} rx="0" className="art-liquid" clipPath="url(#art-vial-clip)" />}
      {powder && <path d="M6 112 Q24 100 42 112 L42 116 Q24 122 6 116 Z" className="art-powder" />}
      <rect x="2" y={top} width="44" height={bottom - top} rx="10" className="art-glass" />
    </g>
  );
}

function ArtFrame({ children, tall }: { children: ReactNode; tall?: boolean }) {
  return (
    <svg viewBox={tall ? "0 -92 240 232" : "0 0 240 140"} className="mix-svg" aria-hidden>
      <defs>
        <clipPath id="art-vial-clip">
          <rect x="2" y="46" width="44" height="74" rx="10" />
        </clipPath>
      </defs>
      {children}
    </svg>
  );
}

function ArtKit() {
  return (
    <ArtFrame>
      <g className="art-pop" style={{ animationDelay: "0s" }}>
        <Vial x={30} liquid={0} powder />
      </g>
      <g className="art-pop" style={{ animationDelay: "0.15s" }}>
        <Vial x={96} liquid={0.75} />
      </g>
      <g className="art-pop" style={{ animationDelay: "0.3s" }}>
        <rect x="160" y="62" width="44" height="30" rx="6" className="art-swab" />
        <path d="M168 77h28" className="art-line" />
      </g>
      <g className="art-pop" style={{ animationDelay: "0.45s" }}>
        <path d="M150 124h76" className="art-line" />
        <path d="M156 116h50l12 8h-62z" className="art-glass" />
      </g>
    </ArtFrame>
  );
}

function ArtSwab() {
  return (
    <ArtFrame>
      <Vial x={96} liquid={0} powder />
      <g className="art-wipe">
        <rect x="98" y="8" width="44" height="16" rx="5" className="art-swab" />
      </g>
      <path d="M160 30 q8 -6 16 0 M168 22 q8 -6 16 0" className="art-line art-fade" />
    </ArtFrame>
  );
}

function ArtDraw() {
  return (
    <ArtFrame tall>
      <g transform="translate(70 0)">
        <Vial liquid={0.75} />
      </g>
      <g className="art-syringe-v">
        <line x1="94" y1="20" x2="94" y2="60" className="art-needle" />
        <rect x="86" y="-56" width="16" height="76" rx="3" className="art-glass" />
        <rect x="86" y="-4" width="16" height="24" className="art-liquid art-draw" />
        <rect x="90" y="-88" width="8" height="40" className="art-rod art-pull" />
      </g>
    </ArtFrame>
  );
}

function ArtPour() {
  return (
    <ArtFrame tall>
      <g transform="translate(96 0)">
        <Vial liquid={0.12} powder />
      </g>
      <g transform="rotate(-28 120 30)">
        <line x1="120" y1="20" x2="120" y2="52" className="art-needle" />
        <rect x="112" y="-50" width="16" height="70" rx="3" className="art-glass" />
        <rect x="112" y="0" width="16" height="20" className="art-liquid art-empty" />
      </g>
      <path d="M103 54 Q100 84 104 112" className="art-stream" />
    </ArtFrame>
  );
}

function ArtSwirl() {
  return (
    <ArtFrame>
      <g className="art-rock">
        <Vial x={96} liquid={0.5} />
      </g>
      <path d="M70 70 a50 22 0 1 0 100 0" className="art-line art-orbit" />
      <path d="M166 62 l6 8 -10 2" className="art-line art-orbit" />
    </ArtFrame>
  );
}

function ArtLabel() {
  return (
    <ArtFrame>
      <Vial x={96} liquid={0.5} />
      <g className="art-pop" style={{ animationDelay: "0.2s" }}>
        <rect x="92" y="70" width="56" height="24" rx="4" className="art-label" />
        <path d="M98 79h30M98 86h22" className="art-line" />
      </g>
      <g className="art-pop" style={{ animationDelay: "0.4s" }}>
        <path d="M176 44v40M162 51l28 26M190 51l-28 26" className="art-line art-snow" />
      </g>
    </ArtFrame>
  );
}
