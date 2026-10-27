import { useState, type ReactNode } from "react";
import { SequenceBeads, StageMeter } from "../components/Sequence";
import { CATEGORIES, PEPTIDES, findPeptide, type Peptide } from "../data/peptides";
import { researchStage } from "../data/researchStage";
import { SEQUENCES } from "../data/sequences";
import { href } from "../lib/router";
import { StatusBadge } from "./LibraryPage";

const BY_CATEGORY = CATEGORIES.map((c) => ({
  category: c,
  peptides: PEPTIDES.filter((p) => p.category === c).sort((a, b) => a.name.localeCompare(b.name)),
}));

interface Row {
  label: string;
  render: (p: Peptide) => ReactNode;
}

const list = (items: string[]) => (
  <ul>
    {items.map((i) => (
      <li key={i}>{i}</li>
    ))}
  </ul>
);

const ROWS: Row[] = [
  { label: "Status", render: (p) => <StatusBadge peptide={p} /> },
  { label: "Research stage", render: (p) => <StageMeter stage={researchStage(p)} /> },
  { label: "Category", render: (p) => p.category },
  { label: "In short", render: (p) => p.summary },
  { label: "What people use it for", render: (p) => list(p.commonUses) },
  { label: "What it does in the body", render: (p) => p.mechanism },
  { label: "Strength of evidence", render: (p) => p.evidence },
  { label: "How it's taken", render: (p) => p.route },
  { label: "How long it lasts", render: (p) => p.halfLife },
  { label: "Side effects", render: (p) => list(p.sideEffects) },
  { label: "Who should avoid it", render: (p) => list(p.avoidIf) },
  {
    label: "Sequence",
    render: (p) =>
      SEQUENCES[p.id] ? (
        <>
          <SequenceBeads sequence={SEQUENCES[p.id]} />
          <span className="muted small mono">{SEQUENCES[p.id].seq.length} amino acids</span>
        </>
      ) : (
        <span className="muted">Not shown</span>
      ),
  },
];

export function ComparePage({ a, b }: { a?: string; b?: string }) {
  const [left, setLeft] = useState(findPeptide(a ?? "")?.id ?? "semaglutide");
  const [right, setRight] = useState(findPeptide(b ?? "")?.id ?? (left === "tirzepatide" ? "semaglutide" : "tirzepatide"));
  const pair = [findPeptide(left)!, findPeptide(right)!];

  return (
    <div className="page">
      <a className="back" href={href("library")}>
        ← Library
      </a>
      <h1>Compare peptides</h1>
      <p className="muted">Pick two peptides to see them side by side.</p>

      <div className="compare-pick">
        <PeptideSelect label="First peptide" value={left} onChange={setLeft} />
        <span className="compare-vs" aria-hidden>
          vs
        </span>
        <PeptideSelect label="Second peptide" value={right} onChange={setRight} />
      </div>

      <section className="card compare">
        <div className="compare-row compare-head">
          {pair.map((p, i) => (
            <a key={i} href={href(`library/${p.id}`)} className="compare-name">
              {p.name}
            </a>
          ))}
        </div>
        {ROWS.map((row) => (
          <div key={row.label} className="compare-block">
            <h3>{row.label}</h3>
            <div className="compare-row">
              {pair.map((p, i) => (
                <div key={i} className="compare-cell">
                  {row.render(p)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function PeptideSelect({ label, value, onChange }: { label: string; value: string; onChange: (id: string) => void }) {
  return (
    <label className="compare-select">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {BY_CATEGORY.map((g) => (
          <optgroup key={g.category} label={g.category}>
            {g.peptides.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
