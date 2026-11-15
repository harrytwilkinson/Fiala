import { useState } from "react";
import { Head } from "../components/Calibre";
import { LibraryNav } from "../components/LibraryNav";
import { SequenceSigil, StageMeter } from "../components/Sequence";
import { CATEGORIES, CATEGORY_SHORT, PEPTIDES, STATUS_LABEL, type Category, type Peptide } from "../data/peptides";
import { researchStage } from "../data/researchStage";
import { SEQUENCES } from "../data/sequences";
import { href } from "../lib/router";

/** Short status wording for the compact library rows; the full label is on each peptide's page. */
export const STATUS_SHORT: Record<Peptide["status"], string> = {
  approved: "Approved",
  "approved-elsewhere": "Approved abroad",
  investigational: "In trials",
  "research-only": "Research",
  supplement: "Supplement",
  cosmetic: "Cosmetic",
};

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
      <Head label="Library" title="Compounds">
        <div className="cal-count">
          <b>{PEPTIDES.length}</b>
          <span className="cal-label">entries</span>
        </div>
      </Head>
      <LibraryNav active="peptides" />
      <p className="cal-links">
        <a href={href("library/compare")}>Compare two</a>
        <a href={href("glossary")}>Glossary</a>
      </p>

      <input
        type="search"
        className="search"
        placeholder="Name, brand or use"
        aria-label="Search the library"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="chips scroll">
        <button type="button" className={category === "all" ? "chip active" : "chip"} onClick={() => setCategory("all")}>
          All
        </button>
        {CATEGORIES.map((c) => (
          <button type="button" key={c} className={category === c ? "chip active" : "chip"} onClick={() => setCategory(c)} aria-label={c}>
            {CATEGORY_SHORT[c]}
          </button>
        ))}
      </div>

      <ul className="lib-list">
        {results.map((p) => (
          <li key={p.id}>
            <a className="lib-row" href={href(`library/${p.id}`)}>
              <SequenceSigil sequence={SEQUENCES[p.id]} />
              <span className="lib-main">
                <strong>{p.name}</strong>
                <span className="lib-alias">{p.aliases.length > 0 ? p.aliases.join(" · ") : p.category}</span>
              </span>
              <span className="lib-side">
                <span className={`badge badge-${p.status}`}>{p.notPeptide ? "Not a peptide" : STATUS_SHORT[p.status]}</span>
                <StageMeter stage={researchStage(p)} compact />
              </span>
            </a>
          </li>
        ))}
        {results.length === 0 && <li className="muted lib-empty">No peptides match that search.</li>}
      </ul>
    </div>
  );
}
