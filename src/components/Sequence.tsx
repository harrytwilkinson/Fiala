import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { STAGE_LABEL, type ResearchStage } from "../data/researchStage";
import { AMINO_ACID, CLASS_LABEL, RESIDUE_CLASS, type PeptideSequence, type ResidueClass } from "../data/sequences";

const CLASS_ORDER: ResidueClass[] = ["hydrophobic", "polar", "positive", "negative", "special", "modified"];

/** Compact strip of coloured beads, one per amino acid, for list cards. */
export function SequenceBeads({ sequence }: { sequence: PeptideSequence }) {
  return (
    <span className="beads" role="img" aria-label={`Chain of ${sequence.seq.length} amino acids`}>
      {[...sequence.seq].map((c, i) => (
        <i key={i} className={`res-${RESIDUE_CLASS[c]}`} />
      ))}
    </span>
  );
}

const C = 160;
const R = 124;
const at = (r: number, deg: number): [number, number] => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
};

/** The sequence as a rotating bezel: spin it (drag, tap a bead or use the arrow keys) to bring any amino acid under the index mark. */
export function SequenceExplorer({ sequence }: { sequence: PeptideSequence }) {
  const residues = [...sequence.seq];
  const n = residues.length;
  const step = 360 / n;
  const bead = Math.min(9.5, Math.max(4, ((Math.PI * R) / n) * 0.84));
  // Open on the position the note calls out (the lipidated lysine on the GLP-1s), else the first residue.
  const noted = sequence.note && /position (\d+)/.exec(sequence.note);
  const [rot, setRot] = useState(() => -(noted ? Math.min(n, Number(noted[1])) - 1 : 0) * step);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ a: number; rot: number; moved: boolean } | null>(null);
  const picked = (((Math.round(-rot / step) % n) + n) % n);
  const c = residues[picked];
  const present = CLASS_ORDER.filter((k) => residues.some((r) => RESIDUE_CLASS[r] === k));
  const name = (r: string) => (r === "X" && sequence.x ? sequence.x.split(/[,(]/)[0].trim() : AMINO_ACID[r]);

  const angleOf = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    return (Math.atan2(e.clientY - box.top - box.height / 2, e.clientX - box.left - box.width / 2) * 180) / Math.PI;
  };
  const release = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    setDragging(false);
    if (d.moved) return setRot((r) => Math.round(r / step) * step);
    // A tap: bring the tapped position to the index mark by the shortest way round.
    const i = (((Math.round((angleOf(e) + 90 - rot) / step) % n) + n) % n);
    const turn = ((((-i * step - rot + 180) % 360) + 360) % 360) - 180;
    setRot(rot + turn);
  };

  return (
    <div className="sequence">
      <div className="bezel">
        <svg
          viewBox="0 0 320 320"
          role="slider"
          tabIndex={0}
          aria-label="Amino-acid position"
          aria-valuemin={1}
          aria-valuemax={n}
          aria-valuenow={picked + 1}
          aria-valuetext={`Position ${picked + 1}: ${name(c)}`}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { a: angleOf(e), rot, moved: false };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            let turn = angleOf(e) - d.a;
            if (turn > 180) turn -= 360;
            if (turn < -180) turn += 360;
            if (Math.abs(turn) > 1.5 && !d.moved) {
              d.moved = true;
              setDragging(true);
            }
            if (d.moved) setRot(d.rot + turn);
          }}
          onPointerUp={release}
          onPointerCancel={() => {
            drag.current = null;
            setDragging(false);
            setRot((r) => Math.round(r / step) * step);
          }}
          onKeyDown={(e: KeyboardEvent<SVGSVGElement>) => {
            const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
            if (d === undefined) return;
            e.preventDefault();
            setRot((r) => Math.round(r / step) * step - d * step);
          }}
        >
          <circle cx={C} cy={C} r="136.5" className="bezel-track" />
          <circle cx={C} cy={C} r="111" className="bezel-track" />
          <g className={dragging ? "bezel-ring" : "bezel-ring snap"} style={{ transform: `rotate(${rot}deg)`, transformOrigin: `${C}px ${C}px` }}>
            {residues.map((r, i) => {
              const d = i * step;
              const [x1, y1] = at(141, d);
              const [x2, y2] = at((i + 1) % 5 === 0 ? 147 : 144, d);
              const [nx, ny] = at(153, d);
              return (
                <g key={i}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} className="bezel-tick" />
                  {(i + 1) % 5 === 0 && n > 9 && (
                    <text x={nx} y={ny} transform={`rotate(${d} ${nx} ${ny})`} className="bezel-num">
                      {i + 1}
                    </text>
                  )}
                  <g transform={`rotate(${d} ${C} ${C})`} className={`bezel-bead res-${RESIDUE_CLASS[r]}${i === picked ? " on" : ""}`}>
                    <circle cx={C} cy={C - R} r={bead} />
                    {bead > 6.4 && (
                      <text x={C} y={C - R}>
                        {r}
                      </text>
                    )}
                  </g>
                </g>
              );
            })}
          </g>
          <path d={`M${C - 5} -6h10l-5 8z`} className="bezel-index" />
          <circle cx={C} cy={C - R} r={bead + 3.5} className="bezel-sel" />
        </svg>
        <div className="bezel-read" aria-live="polite">
          <span className="result-label">Position</span>
          <b>{picked + 1}</b>
          <strong>{name(c)}</strong>
          <span className="muted small">{CLASS_LABEL[RESIDUE_CLASS[c]]}</span>
        </div>
      </div>
      <p className="seq-info small">{sequence.note ?? "Spin the ring, or tap a bead, to read the chain one amino acid at a time."}</p>
      <div className="seq-legend small">
        {present.map((k) => (
          <span key={k}>
            <i className={`res-${k}`} />
            {CLASS_LABEL[k]}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Five short bars showing how far research has got, with the stage name. */
export function StageMeter({ stage }: { stage: ResearchStage }) {
  return (
    <span className="stage" title="How far research has got">
      <span className="stage-bars" aria-hidden>
        {[1, 2, 3, 4, 5].map((n) => (
          <i key={n} className={n <= stage ? "on" : ""} />
        ))}
      </span>
      <span>{STAGE_LABEL[stage]}</span>
    </span>
  );
}

/** The five stages as a ladder, with the reached ones lit. */
export function StageLadder({ stage }: { stage: ResearchStage }) {
  const steps = ([5, 4, 3, 2, 1] as ResearchStage[]).map((n) => ({ n, label: STAGE_LABEL[n] }));
  return (
    <ol className="ladder" aria-label={`Research stage: ${STAGE_LABEL[stage]}`}>
      {steps.map(({ n, label }) => (
        <li key={n} className={`${n <= stage ? "on" : ""}${n === stage ? " top" : ""}`}>
          <i aria-hidden />
          {label}
        </li>
      ))}
    </ol>
  );
}
