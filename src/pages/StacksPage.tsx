import { GlossaryLink, LibraryNav } from "../components/LibraryNav";
import { STACKS, STACK_KIND_LABEL, componentName, type Stack } from "../data/stacks";
import { href } from "../lib/router";

export function StackBadges({ stack }: { stack: Stack }) {
  return (
    <>
      <span className={`badge badge-${stack.status.tone}`}>{stack.status.label}</span>
      <span className="badge">{STACK_KIND_LABEL[stack.kind]}</span>
    </>
  );
}

export function StacksPage() {
  return (
    <div className="page">
      <div className="row">
        <h1>Peptide library</h1>
        <GlossaryLink />
      </div>
      <LibraryNav active="stacks" />
      <p className="muted">
        Combinations people take together, what's in them and what the evidence says. Most pre-mixed blends have never
        been studied as a combination.
      </p>
      <ul className="list">
        {STACKS.map((s) => (
          <li key={s.id}>
            <a className="card link-card" href={href(`stacks/${s.id}`)}>
              <div className="row">
                <strong>{s.name}</strong>
                <span className={`badge badge-${s.status.tone}`}>{s.status.label}</span>
              </div>
              <p>{s.summary}</p>
              <span className="muted small">{s.components.map((c) => componentName(c.peptideId)).join(" + ")}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
