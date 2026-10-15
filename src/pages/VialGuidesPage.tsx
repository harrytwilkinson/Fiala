import { useState } from "react";
import { ConverterNav } from "../components/ConverterNav";
import { VIAL_GUIDES, vialLabel } from "../data/vialGuides";
import { href } from "../lib/router";

/** Index of vial guides, grouped by peptide. */
export function VialGuidesPage() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const byPeptide = new Map<string, typeof VIAL_GUIDES>();
  for (const g of VIAL_GUIDES) {
    const haystack = [g.peptide.name, ...g.peptide.aliases].join(" ").toLowerCase();
    if (q && !haystack.includes(q)) continue;
    byPeptide.set(g.peptide.id, [...(byPeptide.get(g.peptide.id) ?? []), g]);
  }
  const groups = [...byPeptide.values()].sort((a, b) => a[0].peptide.name.localeCompare(b[0].peptide.name));

  return (
    <div className="page">
      <h1>Vial guides</h1>
      <ConverterNav active="guides" />
      <p className="muted">
        Pick your peptide and the amount on the vial label. Each guide shows how much water to add, what every mark on
        the syringe holds, and how long the vial lasts at your dose.
      </p>
      <p className="muted small">
        {new Set(VIAL_GUIDES.map((g) => g.peptide.id)).size} peptides · {VIAL_GUIDES.length} vial sizes
      </p>
      <input type="search" className="search" placeholder="Search peptides" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search vial guides" />
      {groups.length === 0 && <p className="muted">No guides match. The <a href={href("calculator")}>converter</a> works for any vial.</p>}
      <ul className="list">
        {groups.map((guides) => (
          <li key={guides[0].peptide.id} className="card">
            <strong>{guides[0].peptide.name}</strong>
            {guides[0].peptide.aliases.length > 0 && <span className="muted small"> · {guides[0].peptide.aliases.slice(0, 3).join(", ")}</span>}
            <div className="chips" style={{ marginTop: "0.5rem" }}>
              {guides.map((g) => (
                <a key={g.id} className="chip" href={href(`guides/${g.id}`)}>
                  {vialLabel(g.vialMg)} vial
                </a>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <p className="muted small">
        Vial not listed? The <a href={href("calculator")}>converter</a> handles any amount.
      </p>
    </div>
  );
}
