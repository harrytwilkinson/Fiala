import { describe, expect, it } from "vitest";
import { evidenceLinks } from "../lib/evidenceLinks";
import { sitemap } from "../lib/sitePages";
import { GLOSSARY, sortedGlossary } from "./glossary";
import { CATEGORIES, PEPTIDES, findPeptide } from "./peptides";

describe("peptide library", () => {
  it("has unique, URL-safe ids", () => {
    const ids = PEPTIDES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  it("has every section filled in for every entry", () => {
    for (const p of PEPTIDES) {
      expect(p.name, p.id).not.toBe("");
      expect(p.summary, p.id).not.toBe("");
      expect(p.mechanism, p.id).not.toBe("");
      expect(p.evidence, p.id).not.toBe("");
      expect(p.regulatory, p.id).not.toBe("");
      expect(p.commonUses.length, p.id).toBeGreaterThan(0);
      expect(p.sideEffects.length, p.id).toBeGreaterThan(0);
    }
  });

  it("lists every used category exactly once", () => {
    const used = new Set(PEPTIDES.map((p) => p.category));
    expect(new Set(CATEGORIES)).toEqual(used);
  });

  it("looks peptides up by id", () => {
    expect(findPeptide("bpc-157")?.name).toBe("BPC-157");
    expect(findPeptide("nope")).toBeUndefined();
  });
});

describe("library depth", () => {
  it("gives every entry how it's taken, its half-life and who should avoid it", () => {
    for (const p of PEPTIDES) {
      expect(p.route.trim(), p.id).not.toBe("");
      expect(p.halfLife.trim(), p.id).not.toBe("");
      expect(p.avoidIf.length, p.id).toBeGreaterThan(0);
    }
  });

  it("builds evidence searches, with label links only for approved medicines", () => {
    const bpc = evidenceLinks(findPeptide("bpc-157")!);
    expect(bpc.map((l) => l.label)).toEqual(["Reviews on PubMed", "Clinical trials on PubMed", "ClinicalTrials.gov"]);
    expect(bpc[0].url).toBe("https://pubmed.ncbi.nlm.nih.gov/?term=BPC-157&filter=pubt.review");
    expect(evidenceLinks(findPeptide("mgf")!)[2].url).toBe("https://clinicaltrials.gov/search?intr=mechano%20growth%20factor");
    expect(evidenceLinks(findPeptide("semaglutide")!)).toHaveLength(5);
  });

  it("has a glossary with unique, URL-safe ids", () => {
    const ids = GLOSSARY.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
    expect(sortedGlossary()[0].term).toBe("Agonist");
    expect(sitemap(PEPTIDES)).toContain("<loc>https://getfiala.com/glossary/</loc>");
  });
});
