import { useState } from "react";
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

/** Tappable sequence: each bead shows the amino acid and its position. */
export function SequenceExplorer({ sequence }: { sequence: PeptideSequence }) {
  const [picked, setPicked] = useState<number | null>(null);
  const residues = [...sequence.seq];
  const present = CLASS_ORDER.filter((k) => residues.some((c) => RESIDUE_CLASS[c] === k));
  const c = picked === null ? null : residues[picked];

  return (
    <div className="sequence">
      <div className="seq-beads" role="group" aria-label="Amino-acid sequence">
        {residues.map((r, i) => (
          <button
            type="button"
            key={i}
            className={`seq-bead res-${RESIDUE_CLASS[r]}`}
            aria-pressed={picked === i}
            aria-label={`${i + 1}: ${r === "X" && sequence.x ? sequence.x : AMINO_ACID[r]}`}
            onClick={() => setPicked(picked === i ? null : i)}
          >
            {r}
          </button>
        ))}
      </div>
      <p className="seq-info small" aria-live="polite">
        {c ? (
          <>
            <strong>
              Position {picked! + 1}: {c === "X" && sequence.x ? sequence.x : AMINO_ACID[c]}
            </strong>
            <br />
            <span className="muted">{CLASS_LABEL[RESIDUE_CLASS[c]]} amino acid.</span>
          </>
        ) : (
          (sequence.note ?? "Tap any bead to see which amino acid it is.")
        )}
      </p>
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
