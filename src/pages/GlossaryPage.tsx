import { useState } from "react";
import { sortedGlossary } from "../data/glossary";
import { href } from "../lib/router";

export function GlossaryPage() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const terms = sortedGlossary().filter(
    (t) => !q || t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q) || t.aka?.some((a) => a.toLowerCase().includes(q)),
  );

  return (
    <div className="page">
      <a className="back" href={href("library")}>
        ← Library
      </a>
      <h1>Glossary</h1>
      <p className="muted">Plain-English meanings of the terms used in Fiala.</p>
      <input type="search" className="search" placeholder="Search terms" value={query} onChange={(e) => setQuery(e.target.value)} />
      <dl className="glossary">
        {terms.map((t) => (
          <div key={t.id} id={`term-${t.id}`} className="card">
            <dt>
              {t.term}
              {t.aka?.length ? <span className="muted small"> · {t.aka.join(", ")}</span> : null}
            </dt>
            <dd>{t.definition}</dd>
          </div>
        ))}
        {terms.length === 0 && <p className="muted">No terms match that search.</p>}
      </dl>
    </div>
  );
}
