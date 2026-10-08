import { describe, expect, it } from "vitest";
import { PEPTIDES, type Peptide } from "../data/peptides";
import { esc, libraryIndexPage, metaDescription, peptidePage, sitemap } from "./sitePages";

describe("static library pages", () => {
  it("escapes HTML", () => {
    expect(esc(`<b>"A" & 'B'</b>`)).toBe("&lt;b&gt;&quot;A&quot; &amp; &#39;B&#39;&lt;/b&gt;");
  });

  it("trims descriptions on a word boundary", () => {
    const d = metaDescription("word ".repeat(60), 40);
    expect(d.length).toBeLessThanOrEqual(40);
    expect(d.endsWith("word…")).toBe(true);
    expect(metaDescription("Short and sweet.")).toBe("Short and sweet.");
  });

  it("renders every peptide with title, canonical URL, content and an app link", () => {
    for (const p of PEPTIDES) {
      const html = peptidePage(p, PEPTIDES);
      expect(html).toContain(`<link rel="canonical" href="https://getfiala.com/peptides/${p.id}/" />`);
      expect(html).toContain(`<h1>${esc(p.name)}</h1>`);
      expect(html).toContain(`href="../../#/library/${p.id}"`);
      expect(html).toContain(esc(p.mechanism));
      const escaped = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "";
      const description = escaped.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
      expect(description.length).toBeGreaterThan(50);
      expect(description.length).toBeLessThanOrEqual(160);
    }
  });

  it("never lets content break out of the markup", () => {
    const evil: Peptide = { ...PEPTIDES[0], id: "x", name: `<script>alert(1)</script>`, summary: `"><img src=x>` };
    const html = peptidePage(evil, [evil]);
    expect(html).not.toContain("<script>alert");
    expect(html).not.toContain("<img src=x>");
    expect(html).toContain("&quot;&gt;&lt;img src=x&gt;");
  });

  it("lists the latest news when there is some", () => {
    const html = peptidePage(PEPTIDES[0], PEPTIDES, [
      { id: "n", kind: "research", title: "A new study", url: "https://pubmed.ncbi.nlm.nih.gov/1/", source: "PubMed · J", date: "2026-10-01", peptides: [PEPTIDES[0].id], label: "Review" },
    ]);
    expect(html).toContain("Latest research &amp; news");
    expect(html).toContain("Research · Review · PubMed · J · 1 Oct 2026");
    expect(peptidePage(PEPTIDES[0], PEPTIDES)).not.toContain("Latest research");
  });

  it("links every peptide from the index and the sitemap", () => {
    const index = libraryIndexPage(PEPTIDES);
    const map = sitemap(PEPTIDES);
    for (const p of PEPTIDES) {
      expect(index).toContain(`href="${p.id}/"`);
      expect(map).toContain(`<loc>https://getfiala.com/peptides/${p.id}/</loc>`);
    }
  });
});
