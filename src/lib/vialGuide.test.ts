import { describe, expect, it } from "vitest";
import { PEPTIDES } from "../data/peptides";
import { VIAL_GUIDES, VIAL_GUIDE_SPECS, findGuide, guideId, guidesFor, vialLabel, waterOptions } from "../data/vialGuides";
import { esc, peptidePage, sitemap } from "./sitePages";
import { describeDays, mixRow, vialDuration } from "./vialGuide";
import { vialGuidePage, vialGuidesIndexPage } from "./vialGuidePages";

describe("vial guide data", () => {
  it("only lists real peptides, with unique slugs and sensible sizes", () => {
    for (const spec of VIAL_GUIDE_SPECS) {
      expect(PEPTIDES.some((p) => p.id === spec.peptideId), spec.peptideId).toBe(true);
      expect(spec.sizesMg.length).toBeGreaterThan(0);
      for (const mg of spec.sizesMg) expect(mg).toBeGreaterThan(0);
    }
    const ids = VIAL_GUIDES.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(VIAL_GUIDES.length).toBe(VIAL_GUIDE_SPECS.reduce((n, s) => n + s.sizesMg.length, 0));
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+mg$/);
  });

  it("finds guides by slug and by peptide", () => {
    expect(guideId("bpc-157", 10)).toBe("bpc-157-10mg");
    expect(guideId("igf-1-lr3", 0.1)).toBe("igf-1-lr3-0-1mg");
    expect(findGuide("bpc-157-10mg")?.vialMg).toBe(10);
    expect(findGuide("nope")).toBeUndefined();
    expect(guidesFor("tirzepatide").map((g) => g.vialMg)).toEqual([5, 10, 15, 30]);
    expect(vialLabel(0.1)).toBe("0.1 mg (100 mcg)");
    expect(vialLabel(10)).toBe("10 mg");
  });

  it("offers more water for big vials", () => {
    expect(waterOptions(10)).toEqual([1, 2, 3, 5]);
    expect(waterOptions(60)).toContain(6);
  });
});

describe("vial guide maths", () => {
  it("works out strength and what each mark holds", () => {
    const r = mixRow(10, 2);
    expect(r.mgPerMl).toBe(5);
    expect(r.mcgPerUnit).toBe(50);
    expect(r.mgPer10Units).toBe(0.5);
  });

  it("works out how long a vial lasts", () => {
    expect(vialDuration(10, 0.25, 1)).toEqual({ doses: 40, days: 40 });
    expect(vialDuration(10, 2.5, 1 / 7)).toEqual({ doses: 4, days: 28 });
    expect(vialDuration(5, 0.3, 1)?.doses).toBe(16);
    expect(vialDuration(5, 6, 1)).toBeNull();
    expect(vialDuration(5, 0, 1)).toBeNull();
    expect(describeDays(0.5)).toBe("less than a day");
    expect(describeDays(1)).toBe("1 day");
    expect(describeDays(10)).toBe("10 days");
    expect(describeDays(28)).toBe("about 4 weeks");
    expect(describeDays(90)).toBe("about 3 months");
  });
});

describe("static vial guide pages", () => {
  it("renders every guide with a canonical URL, mixing table, simulator and no suggested dose", () => {
    for (const g of VIAL_GUIDES) {
      const html = vialGuidePage(g);
      expect(html).toContain(`<link rel="canonical" href="https://getfiala.com/vial-guides/${g.id}/" />`);
      expect(html).toContain(esc(g.peptide.name));
      expect(html).toContain('id="sim"');
      expect(html).toContain(`href="../../#/guides/${g.id}"`);
      expect(html).toMatch(/<input id="s-dose"[^>]*placeholder="Your dose"/);
      expect(html).not.toMatch(/<input id="s-dose"[^>]*value=/);
      const escaped = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "";
      const description = escaped.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
      expect(description.length).toBeGreaterThan(50);
      expect(description.length).toBeLessThanOrEqual(160);
    }
  });

  it("links every guide from the index", () => {
    const index = vialGuidesIndexPage();
    for (const g of VIAL_GUIDES) expect(index).toContain(`href="${g.id}/"`);
  });

  it("lists guides in the sitemap and on their peptide's page", () => {
    const map = sitemap(PEPTIDES);
    for (const g of VIAL_GUIDES) expect(map).toContain(`<loc>https://getfiala.com/vial-guides/${g.id}/</loc>`);
    const bpc = PEPTIDES.find((p) => p.id === "bpc-157")!;
    expect(peptidePage(bpc, PEPTIDES)).toContain('href="../../vial-guides/bpc-157-10mg/"');
  });
});
