// Pure helpers for the nightly news builder (scripts/build-news.ts): which words to
// search for, how to recognise a peptide in a headline, and how to turn each
// source's response into feed items. No network or file access here, so it's testable.

import type { NewsItem } from "./newsFeed.ts";

export interface PeptideTerms {
  id: string;
  /** Terms used to search sources and to tag headlines. */
  terms: string[];
}

/**
 * Aliases that are too broad to search for: they'd mostly match unrelated research
 * (e.g. "cAMP", or GnRH/kisspeptin biology in general rather than these peptides).
 */
export const EXCLUDED_TERMS = new Set([
  "CAMP",
  "GnRH",
  "LHRH",
  "Kisspeptin",
  "ACTH(4-10) analog",
  "α-MSH (11-13)",
  "Metastin (45-54)",
  // Glutathione is in tens of thousands of unrelated papers; MGF is also an unrelated acronym.
  "Glutathione",
  "GSH",
  "L-glutathione",
  "MGF",
]);

export function newsTerms(peptides: { id: string; name: string; aliases: string[] }[]): PeptideTerms[] {
  return peptides.map((p) => {
    const terms = [p.name, ...p.aliases]
      .filter((t) => !EXCLUDED_TERMS.has(t))
      // "CagriSema (with semaglutide)" -> "CagriSema"
      .map((t) => t.replace(/\s*\([^)]*\)\s*/g, " ").trim())
      .filter((t) => t.length >= 3);
    return { id: p.id, terms: [...new Set(terms)] };
  }).filter((p) => p.terms.length > 0); // peptides with no usable search terms are left out of the news
}

/** Short all-caps codes (VIP, KPV, DSIP) are matched case-sensitively so "vip" or "Kpv" in prose don't count. */
function isAcronym(term: string): boolean {
  const letters = term.replace(/[^\p{L}]/gu, "");
  return letters.length > 0 && letters.length <= 4 && letters === letters.toUpperCase();
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Regex for a term that tolerates "BPC-157", "BPC 157" and "BPC157", on word boundaries. */
export function termRegex(term: string): RegExp {
  const parts = term.split(/[\s-]+/).filter(Boolean).map(escape);
  return new RegExp(`(?<![\\p{L}\\p{N}])${parts.join("[\\s-]?")}(?![\\p{L}\\p{N}])`, isAcronym(term) ? "u" : "iu");
}

export type Matcher = (text: string) => string[];

/** Returns the ids of every peptide mentioned in a piece of text. */
export function makeMatcher(list: PeptideTerms[]): Matcher {
  const compiled = list.map((p) => ({ id: p.id, res: p.terms.map(termRegex) }));
  return (text) => compiled.filter((p) => p.res.some((re) => re.test(text))).map((p) => p.id);
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** Strip markup (e.g. <i>in vivo</i>) and decode entities so titles are plain text. */
export function cleanText(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === "#") {
        const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : m;
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, " ")
    .trim();
}

const uniq = (ids: string[]) => [...new Set(ids)];
const clampDate = (date: string, today: string) => (date > today ? today : date);

// ---------- PubMed (NCBI E-utilities) ----------

/** PubMed search for one peptide: title/abstract mentions, excluding letters, comments and errata. */
export function pubmedQuery(terms: string[]): string {
  // PubMed's index is ASCII-only, so skip terms like "Tα1".
  const ascii = terms.filter((t) => /^[\x20-\x7e]+$/.test(t));
  const any = ascii.map((t) => `"${t.replace(/"/g, "")}"[tiab]`).join(" OR ");
  return `(${any}) NOT (comment[pt] OR letter[pt] OR erratum[pt] OR editorial[pt] OR "retracted publication"[pt])`;
}

const ANIMAL_OR_LAB = /\b(rats?|mice|mouse|murine|porcine|pigs?|piglets?|rabbits?|zebrafish|canine|dogs?|bovine|in vitro|cell lines?|cultured)\b/i;

/** A plain-English label for how strong a study's design is. */
export function studyLabel(pubtypes: string[], title: string): string {
  const has = (t: string) => pubtypes.some((p) => p.toLowerCase() === t.toLowerCase());
  if (has("Retracted Publication")) return "Retracted";
  if (has("Meta-Analysis")) return "Meta-analysis";
  if (has("Systematic Review")) return "Systematic review";
  if (has("Randomized Controlled Trial")) return "Randomised trial";
  if (pubtypes.some((p) => /^Clinical Trial/i.test(p))) return "Clinical trial";
  if (has("Review")) return "Review";
  if (has("Case Reports")) return "Case report";
  if (ANIMAL_OR_LAB.test(title)) return "Lab or animal study";
  return "Study";
}

/** "2026/09/30 00:00" or "2026 Sep 30" -> "2026-09-30". */
export function pubmedDate(sortpubdate: unknown, pubdate: unknown): string | undefined {
  if (typeof sortpubdate === "string") {
    const m = sortpubdate.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  }
  if (typeof pubdate === "string") {
    const d = new Date(`${pubdate} UTC`);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return undefined;
}

/** esearch JSON -> list of PMIDs. */
export function parsePubmedSearch(json: unknown): string[] {
  const ids = (json as { esearchresult?: { idlist?: unknown } })?.esearchresult?.idlist;
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string" && /^\d+$/.test(id)) : [];
}

/** esummary JSON -> items. `tagsFor` gives the peptide(s) whose search found each PMID. */
export function parsePubmedSummary(json: unknown, tagsFor: (pmid: string) => string[], match: Matcher, today: string): NewsItem[] {
  const result = (json as { result?: Record<string, unknown> })?.result;
  if (!result || !Array.isArray(result.uids)) return [];
  const items: NewsItem[] = [];
  for (const uid of result.uids as unknown[]) {
    if (typeof uid !== "string") continue;
    const doc = result[uid] as Record<string, unknown> | undefined;
    if (!doc || typeof doc.title !== "string") continue;
    const title = cleanText(doc.title).replace(/\.$/, "");
    const date = pubmedDate(doc.sortpubdate, doc.pubdate);
    if (!title || !date) continue;
    const pubtypes = Array.isArray(doc.pubtype) ? doc.pubtype.filter((p): p is string => typeof p === "string") : [];
    const journal = typeof doc.source === "string" && doc.source ? doc.source : "PubMed";
    items.push({
      id: `pubmed:${uid}`,
      kind: "research",
      title,
      url: `https://pubmed.ncbi.nlm.nih.gov/${uid}/`,
      source: `PubMed · ${cleanText(journal)}`,
      date: clampDate(date, today),
      peptides: uniq([...tagsFor(uid), ...match(title)]),
      label: studyLabel(pubtypes, title),
    });
  }
  return items;
}

// ---------- ClinicalTrials.gov (API v2) ----------

export function trialsQuery(terms: string[]): string {
  return terms.map((t) => `"${t.replace(/"/g, "")}"`).join(" OR ");
}

const humanize = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");

function phaseLabel(phases: unknown): string | undefined {
  if (!Array.isArray(phases)) return undefined;
  const nums = phases
    .filter((p): p is string => typeof p === "string")
    .map((p) => (p === "EARLY_PHASE1" ? "Early phase 1" : p.replace(/^PHASE(\d)$/, "$1")))
    .filter((p) => p && p !== "NA");
  if (nums.length === 0) return undefined;
  return nums[0].startsWith("Early") ? nums.join("/") : `Phase ${nums.join("/")}`;
}

/** /api/v2/studies JSON -> items, keeping studies updated on or after `since`. */
export function parseTrials(json: unknown, peptideId: string, match: Matcher, since: string, today: string): NewsItem[] {
  const studies = (json as { studies?: unknown })?.studies;
  if (!Array.isArray(studies)) return [];
  const items: NewsItem[] = [];
  for (const s of studies as Record<string, any>[]) {
    const ps = s?.protocolSection;
    const nct: unknown = ps?.identificationModule?.nctId;
    const rawTitle: unknown = ps?.identificationModule?.briefTitle;
    const updated: unknown = ps?.statusModule?.lastUpdatePostDateStruct?.date;
    if (typeof nct !== "string" || !/^NCT\d{8}$/.test(nct) || typeof rawTitle !== "string" || typeof updated !== "string") continue;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(updated) ? updated : /^\d{4}-\d{2}$/.test(updated) ? `${updated}-01` : undefined;
    if (!date || date < since) continue;
    const title = cleanText(rawTitle);
    const status: unknown = ps?.statusModule?.overallStatus;
    const label = [
      typeof status === "string" ? humanize(status) : undefined,
      phaseLabel(ps?.designModule?.phases),
      s.hasResults === true ? "Results posted" : undefined,
    ]
      .filter(Boolean)
      .join(" · ");
    items.push({
      id: `nct:${nct}`,
      kind: "trial",
      title,
      url: `https://clinicaltrials.gov/study/${nct}`,
      source: "ClinicalTrials.gov",
      date: clampDate(date, today),
      peptides: uniq([peptideId, ...match(title)]),
      label: label ? `${label} · Updated` : "Updated",
    });
  }
  return items;
}

// ---------- Regulator RSS feeds (FDA) ----------

export interface RssEntry {
  title: string;
  link: string;
  date: string;
  description: string;
}

const tag = (block: string, name: string) => block.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, "i"))?.[1];

export function parseRss(xml: string): RssEntry[] {
  const entries: RssEntry[] = [];
  for (const [, block] of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    const title = cleanText(tag(block, "title") ?? "");
    const link = cleanText(tag(block, "link") ?? "");
    const when = new Date(cleanText(tag(block, "pubDate") ?? tag(block, "dc:date") ?? ""));
    if (!title || !link || Number.isNaN(when.getTime())) continue;
    entries.push({ title, link, date: when.toISOString().slice(0, 10), description: cleanText(tag(block, "description") ?? "") });
  }
  return entries;
}

/** Regulatory items worth showing: they name a library peptide, or talk about peptides or compounded GLP-1s. */
export function regulatoryItems(entries: RssEntry[], source: string, match: Matcher, since: string, today: string): NewsItem[] {
  const items: NewsItem[] = [];
  for (const e of entries) {
    if (e.date < since || !/^https:\/\//.test(e.link)) continue;
    const text = `${e.title} ${e.description}`;
    const peptides = match(text);
    const relevant = peptides.length > 0 || /\bpeptides?\b/i.test(text) || (/\bcompound(ed|ing)\b/i.test(text) && /\bGLP-1\b/i.test(text));
    if (!relevant) continue;
    items.push({ id: `fda:${e.link}`, kind: "regulatory", title: e.title, url: e.link, source, date: clampDate(e.date, today), peptides });
  }
  return items;
}
