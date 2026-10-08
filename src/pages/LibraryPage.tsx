import { useState } from "react";
import { GlossaryLink, LibraryNav } from "../components/LibraryNav";
import { CATEGORIES, PEPTIDES, STATUS_LABEL, type Category, type Peptide } from "../data/peptides";
import { href } from "../lib/router";

export function StatusBadge({ peptide }: { peptide: Peptide }) {
  return (
    <span className="badge-group">
      <span className={`badge badge-${peptide.status}`}>{STATUS_LABEL[peptide.status]}</span>
      {peptide.notPeptide && <span className="badge not-peptide">Not a peptide</span>}
    </span>
  );
}

export function LibraryPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");

  const q = query.trim().toLowerCase();
  const results = PEPTIDES.filter(
    (p) =>
      (category === "all" || p.category === category) &&
      (!q ||
        p.name.toLowerCase().includes(q) ||
        p.aliases.some((a) => a.toLowerCase().includes(q)) ||
        p.commonUses.some((u) => u.toLowerCase().includes(q))),
  ).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="page">
      <div className="row">
        <h1>Peptide library</h1>
        <GlossaryLink />
      </div>
      <LibraryNav active="peptides" />
      <p className="muted">What each peptide is, what people use it for, and what it does in the body.</p>

      <input
        type="search"
        className="search"
        placeholder="Search by name, brand or use (e.g. tendon, weight)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="chips scroll">
        <button type="button" className={category === "all" ? "chip active" : "chip"} onClick={() => setCategory("all")}>
          All
        </button>
        {CATEGORIES.map((c) => (
          <button type="button" key={c} className={category === c ? "chip active" : "chip"} onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
      </div>

      <ul className="list">
        {results.map((p) => (
          <li key={p.id}>
            <a className="card link-card" href={href(`library/${p.id}`)}>
              <div className="row">
                <strong>{p.name}</strong>
                <StatusBadge peptide={p} />
              </div>
              {p.aliases.length > 0 && <div className="muted small">{p.aliases.join(" · ")}</div>}
              <p>{p.summary}</p>
              <span className="muted small">{p.category}</span>
            </a>
          </li>
        ))}
        {results.length === 0 && <li className="muted">No peptides match that search.</li>}
      </ul>
    </div>
  );
}
