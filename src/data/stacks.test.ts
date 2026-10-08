import { describe, expect, it } from "vitest";
import { choiceId, choiceName, emptyChoice } from "../components/PeptideField";
import { newsTerms } from "../lib/newsBuild";
import { sitemap, stackPage } from "../lib/sitePages";
import { PEPTIDES, findPeptide } from "./peptides";
import { STACKS, findStack, stacksWith } from "./stacks";

describe("stacks & blends", () => {
  it("have unique, URL-safe ids that don't clash with peptides", () => {
    const ids = STACKS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9-]+$/);
      expect(findPeptide(id), id).toBeUndefined();
    }
  });

  it("only contain peptides that are in the library", () => {
    for (const s of STACKS) {
      expect(s.components.length, s.id).toBeGreaterThanOrEqual(2);
      for (const c of s.components) expect(findPeptide(c.peptideId), `${s.id}: ${c.peptideId}`).toBeDefined();
    }
  });

  it("have example vials that match their ingredients and add up", () => {
    for (const s of STACKS.filter((x) => x.exampleVial)) {
      const v = s.exampleVial!;
      expect(v.contents.map((c) => c.peptideId).sort(), s.id).toEqual(s.components.map((c) => c.peptideId).sort());
      expect(v.contents.reduce((sum, c) => sum + c.mg, 0), s.id).toBe(v.totalMg);
    }
  });

  it("are found from their ingredients", () => {
    expect(stacksWith("kpv").map((s) => s.id)).toEqual(["klow"]);
    expect(stacksWith("bpc-157").map((s) => s.id)).toEqual(["glow", "klow", "wolverine"]);
    expect(findStack("glow")?.name).toBe("GLOW");
  });

  it("can be picked when logging, and are saved by name", () => {
    const c = emptyChoice("stack:glow");
    expect(c.selected).toBe("stack:glow");
    expect(choiceName(c)).toBe("GLOW");
    expect(choiceId(c)).toBeNull();
    expect(emptyChoice("stack:nope").selected).toBe("");
    expect(choiceId(emptyChoice("bpc-157"))).toBe("bpc-157");
  });

  it("get public pages listed in the sitemap", () => {
    const html = stackPage(findStack("klow")!);
    expect(html).toContain(`<link rel="canonical" href="https://getfiala.com/stacks/klow/" />`);
    expect(html).toContain(`href="../../peptides/kpv/"`);
    const map = sitemap(PEPTIDES);
    for (const s of STACKS) expect(map).toContain(`<loc>https://getfiala.com/stacks/${s.id}/</loc>`);
  });
});

describe("new library entries", () => {
  it("leave overly broad names out of the news search", () => {
    const ids = newsTerms(PEPTIDES).map((p) => p.id);
    expect(ids).not.toContain("glutathione");
    expect(newsTerms(PEPTIDES).find((p) => p.id === "mgf")?.terms).toEqual(["Mechano growth factor", "PEG-MGF"]);
  });

  it("flag compounds that aren't peptides", () => {
    expect(findPeptide("mk-677")?.notPeptide).toBe(true);
    expect(PEPTIDES.filter((p) => p.notPeptide).map((p) => p.id)).toEqual(["mk-677"]);
  });
});
