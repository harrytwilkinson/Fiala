import { BLEND_LABEL_NOTE, componentName, type Stack } from "../data/stacks";
import { findPeptide } from "../data/peptides";
import { href } from "../lib/router";
import { StackBadges } from "./StacksPage";

export function StackDetailPage({ stack }: { stack: Stack }) {
  return (
    <div className="page">
      <a className="back" href={href("stacks")}>
        ← Stacks &amp; blends
      </a>
      <h1>{stack.name}</h1>
      {stack.aliases.length > 0 && <p className="muted">Also known as {stack.aliases.join(", ")}</p>}
      <div className="row wrap">
        <StackBadges stack={stack} />
      </div>
      <p className="lead">{stack.summary}</p>

      <section className="card">
        <h2>What's in it</h2>
        <ul className="list component-list">
          {stack.components.map((c) => {
            const p = findPeptide(c.peptideId);
            return (
              <li key={c.peptideId}>
                {p ? <a href={href(`library/${p.id}`)}>{p.name}</a> : <strong>{c.peptideId}</strong>}
                <span className="muted small"> · {c.role}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {stack.exampleVial && (
        <section className="card">
          <h2>Typical vial label</h2>
          <p>
            {stack.exampleVial.totalMg} mg:{" "}
            {stack.exampleVial.contents.map((c) => `${c.mg} mg ${componentName(c.peptideId)}`).join(", ")}
          </p>
          <p className="muted small">{BLEND_LABEL_NOTE}</p>
          {__CONVERTER__ && (
            <a className="button secondary small" href={href("calculator", { blend: stack.id })}>
              Open in the blend converter
            </a>
          )}
        </section>
      )}

      <section className="card">
        <h2>Why people combine them</h2>
        <p>{stack.whyCombined}</p>
      </section>

      <section className="card">
        <h2>Strength of evidence</h2>
        <p>{stack.evidence}</p>
      </section>

      <section className="card">
        <h2>Risks</h2>
        <ul>
          {stack.risks.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Regulatory status</h2>
        <p>{stack.regulatory}</p>
      </section>

      <div className="actions">
        <a className="button" href={href("tracker", { peptide: `stack:${stack.id}` })}>
          Log a dose
        </a>
        <a className="button secondary" href={href("tracker/schedules", { peptide: `stack:${stack.id}` })}>
          Create schedule
        </a>
      </div>

      <p className="muted small">
        Educational information only, not medical advice. Talk to a qualified clinician before starting, stopping or
        changing any treatment.
      </p>
    </div>
  );
}
