import { describe, expect, it } from "vitest";
import { PEPTIDES } from "../data/peptides";
import { filterNews, headlines } from "./news";
import {
  cleanText,
  makeMatcher,
  newsTerms,
  parsePubmedSearch,
  parsePubmedSummary,
  parseRss,
  parseTrials,
  pubmedQuery,
  regulatoryItems,
  studyLabel,
} from "./newsBuild";
import { mergeItems, parseFeed, type NewsItem } from "./newsFeed";

const match = makeMatcher(newsTerms(PEPTIDES));
const item = (over: Partial<NewsItem>): NewsItem => ({
  id: "x",
  kind: "research",
  title: "T",
  url: "https://example.org/",
  source: "PubMed · J",
  date: "2026-10-01",
  peptides: [],
  ...over,
});

describe("peptide matching", () => {
  it("recognises names, brands and spelling variants", () => {
    expect(match("Oral BPC 157 in tendon healing")).toEqual(["bpc-157"]);
    expect(match("BPC157 and TB-500 in rats")).toEqual(["bpc-157", "tb-500"]);
    expect(match("Wegovy versus Zepbound for obesity")).toEqual(["semaglutide", "tirzepatide"]);
    expect(match("CagriSema phase 3 results")).toContain("cagrilintide");
    expect(match("Tα1 in sepsis")).toEqual(["thymosin-alpha-1"]);
  });

  it("ignores look-alikes and too-broad aliases", () => {
    expect(match("cAMP signalling in hepatocytes")).toEqual([]);
    expect(match("GnRH neurons and puberty")).toEqual([]);
    expect(match("a vip experience")).toEqual([]);
    expect(match("Semaglutides")).toEqual([]);
    expect(match("ABPC-1570")).toEqual([]);
  });

  it("drops parenthetical qualifiers and keeps searchable terms", () => {
    const cagri = newsTerms(PEPTIDES).find((p) => p.id === "cagrilintide")!;
    expect(cagri.terms).toContain("CagriSema");
    expect(pubmedQuery(["Thymosin Alpha-1", "Tα1"])).toBe(
      '("Thymosin Alpha-1"[tiab]) NOT (comment[pt] OR letter[pt] OR erratum[pt] OR editorial[pt] OR "retracted publication"[pt])',
    );
  });
});

describe("source parsing", () => {
  it("cleans markup and entities", () => {
    expect(cleanText("<i>In vivo</i> effects &amp; &#x3b1;-MSH &lt;3")).toBe("In vivo effects & α-MSH <3");
  });

  it("labels study designs", () => {
    expect(studyLabel(["Journal Article", "Randomized Controlled Trial"], "x")).toBe("Randomised trial");
    expect(studyLabel(["Review", "Systematic Review"], "x")).toBe("Systematic review");
    expect(studyLabel(["Journal Article"], "BPC-157 in a rat model")).toBe("Lab or animal study");
    expect(studyLabel(["Journal Article"], "Outcomes in adults")).toBe("Study");
  });

  it("reads PubMed search and summary responses", () => {
    expect(parsePubmedSearch({ esearchresult: { idlist: ["111", "222", "bad"] } })).toEqual(["111", "222"]);
    const summary = {
      result: {
        uids: ["111", "222"],
        "111": {
          uid: "111",
          title: "Effects of <i>BPC-157</i> on tendon healing in rats.",
          source: "J Orthop Res",
          sortpubdate: "2026/09/28 00:00",
          pubtype: ["Journal Article"],
        },
        "222": { uid: "222", title: "Future issue", source: "Lancet", sortpubdate: "2027/01/01 00:00", pubtype: ["Randomized Controlled Trial"] },
      },
    };
    const items = parsePubmedSummary(summary, (id) => (id === "222" ? ["semaglutide"] : ["bpc-157"]), match, "2026-10-05");
    expect(items[0]).toEqual({
      id: "pubmed:111",
      kind: "research",
      title: "Effects of BPC-157 on tendon healing in rats",
      url: "https://pubmed.ncbi.nlm.nih.gov/111/",
      source: "PubMed · J Orthop Res",
      date: "2026-09-28",
      peptides: ["bpc-157"],
      label: "Lab or animal study",
    });
    expect(items[1].date).toBe("2026-10-05"); // future issue dates are clamped to today
    expect(items[1].label).toBe("Randomised trial");
  });

  it("reads ClinicalTrials.gov studies and skips stale or malformed ones", () => {
    const json = {
      studies: [
        {
          protocolSection: {
            identificationModule: { nctId: "NCT01234567", briefTitle: "Tirzepatide and semaglutide in adults" },
            statusModule: { overallStatus: "ACTIVE_NOT_RECRUITING", lastUpdatePostDateStruct: { date: "2026-09-30" } },
            designModule: { phases: ["PHASE3"] },
          },
          hasResults: true,
        },
        { protocolSection: { identificationModule: { nctId: "NCT07654321", briefTitle: "Old" }, statusModule: { lastUpdatePostDateStruct: { date: "2025-01-01" } } } },
        { protocolSection: { identificationModule: { nctId: "nope", briefTitle: "Bad" } } },
      ],
    };
    const items = parseTrials(json, "tirzepatide", match, "2026-08-06", "2026-10-05");
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "nct:NCT01234567",
      kind: "trial",
      url: "https://clinicaltrials.gov/study/NCT01234567",
      peptides: ["tirzepatide", "semaglutide"],
      label: "Active not recruiting · Phase 3 · Results posted · Updated",
    });
  });

  it("keeps only relevant regulator news", () => {
    const xml = `<?xml version="1.0"?><rss><channel>
      <item><title><![CDATA[FDA warns about compounded semaglutide]]></title><link>https://www.fda.gov/a</link><pubDate>Thu, 02 Oct 2026 14:00:00 EDT</pubDate><description>Dosing errors</description></item>
      <item><title>FDA approves new asthma inhaler</title><link>https://www.fda.gov/b</link><pubDate>Wed, 01 Oct 2026 10:00:00 EDT</pubDate></item>
      <item><title>Unapproved peptides sold online</title><link>https://www.fda.gov/c</link><pubDate>Tue, 30 Sep 2026 10:00:00 EDT</pubDate></item>
    </channel></rss>`;
    const entries = parseRss(xml);
    expect(entries).toHaveLength(3);
    const items = regulatoryItems(entries, "FDA press release", match, "2026-08-06", "2026-10-05");
    expect(items.map((i) => [i.title, i.peptides])).toEqual([
      ["FDA warns about compounded semaglutide", ["semaglutide"]],
      ["Unapproved peptides sold online", []],
    ]);
  });
});

describe("feed file", () => {
  it("drops malformed items and non-https links", () => {
    const feed = parseFeed({
      generatedAt: "2026-10-05T06:00:00Z",
      items: [
        item({ id: "ok" }),
        item({ id: "js", url: "javascript:alert(1)" }),
        { id: "nodate", kind: "research", title: "x", source: "y", url: "https://a.b/" },
        { id: "fiala:post", kind: "fiala", title: "Hello", source: "Fiala", date: "2026-10-02", summary: "Hi" },
      ],
    });
    expect(feed.items.map((i) => i.id)).toEqual(["fiala:post", "ok"]); // newest first
    expect(() => parseFeed({})).toThrow();
  });

  it("merges by id, keeps posts, and applies age and per-peptide limits", () => {
    const previous = [item({ id: "a", peptides: ["bpc-157"], date: "2026-09-01" }), item({ id: "old", date: "2026-01-01" })];
    const fresh = [
      item({ id: "a", peptides: ["tb-500"], date: "2026-09-01", label: "new" }),
      item({ id: "post", kind: "fiala", url: undefined, date: "2025-01-01" }),
      ...[1, 2, 3].map((n) => item({ id: `s${n}`, peptides: ["semaglutide"], date: `2026-10-0${n}` })),
    ];
    const merged = mergeItems(previous, fresh, "2026-10-05", { maxAgeDays: 120, perPeptide: 2, maxItems: 100 });
    expect(merged.map((i) => i.id)).toEqual(["s3", "s2", "a", "post"]);
    expect(merged.find((i) => i.id === "a")).toMatchObject({ label: "new", peptides: ["bpc-157", "tb-500"] });
  });
});

describe("filters", () => {
  const items = [
    item({ id: "1", peptides: ["bpc-157"], date: "2026-10-04" }),
    item({ id: "2", kind: "trial", peptides: ["semaglutide"], date: "2026-10-03" }),
    item({ id: "3", kind: "fiala", date: "2026-10-01" }),
    item({ id: "4", kind: "fiala", date: "2026-06-01" }),
  ];

  it("filters by kind, following and peptide", () => {
    expect(filterNews(items, "trial", []).map((i) => i.id)).toEqual(["2"]);
    expect(filterNews(items, "following", ["semaglutide"]).map((i) => i.id)).toEqual(["2"]);
    expect(filterNews(items, "all", [], "bpc-157").map((i) => i.id)).toEqual(["1"]);
  });

  it("puts recent posts, then followed peptides, first on the home screen", () => {
    expect(headlines(items, ["semaglutide"], 3, "2026-10-05").map((i) => i.id)).toEqual(["3", "2", "1"]);
  });
});
