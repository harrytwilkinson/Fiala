import { PEPTIDES } from "../data/peptides";
import { STACKS } from "../data/stacks";
import { href } from "../lib/router";

/** Switch between the peptide library and stacks & blends. */
export function LibraryNav({ active }: { active: "peptides" | "stacks" }) {
  return (
    <nav className="segmented wide" aria-label="Library sections">
      <a href={href("library")} className={active === "peptides" ? "active" : ""} aria-current={active === "peptides" ? "page" : undefined}>
        Peptides ({PEPTIDES.length})
      </a>
      <a href={href("stacks")} className={active === "stacks" ? "active" : ""} aria-current={active === "stacks" ? "page" : undefined}>
        Stacks &amp; blends ({STACKS.length})
      </a>
    </nav>
  );
}
