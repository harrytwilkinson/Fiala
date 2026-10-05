// Builds public/news.json for the in-app news feed. Runs nightly on GitHub Actions
// (see .github/workflows/deploy.yml) and can be run locally with `npm run news`.
//
// Sources: PubMed (new studies), ClinicalTrials.gov (trial updates), FDA RSS
// (regulatory news), plus hand-written posts from news/posts.json. Each run merges
// with the currently published feed, so a source that's down for a night doesn't
// empty the feed. This script never fails the build: problems are logged and skipped.

import { readFile, writeFile } from "node:fs/promises";
import { PEPTIDES } from "../src/data/peptides.ts";
import {
  makeMatcher,
  newsTerms,
  parsePubmedSearch,
  parsePubmedSummary,
  parseRss,
  parseTrials,
  pubmedQuery,
  regulatoryItems,
  trialsQuery,
} from "../src/lib/newsBuild.ts";
import { mergeItems, normalizeItem, parseFeed, shiftDate, type NewsFeed, type NewsItem } from "../src/lib/newsFeed.ts";

const OUT = new URL("../public/news.json", import.meta.url);
const POSTS = new URL("../news/posts.json", import.meta.url);
const PREVIOUS = process.env.PREVIOUS_FEED_URL ?? "https://getfiala.com/news.json";
const USER_AGENT = "Fiala-news/1.0 (+https://getfiala.com/support.html; support@getfiala.com)";

const PUBMED_DAYS = 30;
const PUBMED_PER_PEPTIDE = 5;
const TRIALS_DAYS = 60;
const TRIALS_PER_PEPTIDE = 3;
const REGULATORY_DAYS = 60;
const FDA_FEEDS = [
  { url: "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/press-releases/rss.xml", source: "FDA press release" },
  { url: "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/medwatch/rss.xml", source: "FDA MedWatch safety alert" },
];

const today = new Date().toISOString().slice(0, 10);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const log = (...args: unknown[]) => console.log("[news]", ...args);

async function get(url: string, as: "json" | "text"): Promise<any> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(30_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return as === "json" ? await res.json() : await res.text();
    } catch (err) {
      if (attempt >= 3) throw err;
      await sleep(2000 * attempt);
    }
  }
}

/** Gives up on a source after a few failures in a row, so an outage doesn't stall the build. */
function breaker(name: string) {
  let failures = 0;
  return {
    get open() {
      return failures >= 3;
    },
    ok() {
      failures = 0;
    },
    fail(what: string, err: unknown) {
      log(`${name} failed for ${what}:`, String(err));
      if (++failures === 3) log(`${name}: 3 failures in a row, skipping the rest for this run`);
    },
  };
}

const terms = newsTerms(PEPTIDES);
const match = makeMatcher(terms);

async function pubmed(): Promise<NewsItem[]> {
  const base = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
  const common = "db=pubmed&retmode=json&tool=fiala&email=support%40getfiala.com";
  const found = new Map<string, string[]>();
  const b = breaker("PubMed search");
  for (const p of terms) {
    if (b.open) break;
    try {
      const url = `${base}/esearch.fcgi?${common}&sort=pub_date&retmax=${PUBMED_PER_PEPTIDE}&datetype=edat&reldate=${PUBMED_DAYS}&term=${encodeURIComponent(pubmedQuery(p.terms))}`;
      for (const id of parsePubmedSearch(await get(url, "json"))) found.set(id, [...(found.get(id) ?? []), p.id]);
      b.ok();
    } catch (err) {
      b.fail(p.id, err);
    }
    await sleep(400); // NCBI allows 3 requests a second without an API key
  }
  const ids = [...found.keys()];
  const items: NewsItem[] = [];
  for (let i = 0; i < ids.length; i += 150) {
    try {
      const url = `${base}/esummary.fcgi?${common}&id=${ids.slice(i, i + 150).join(",")}`;
      items.push(...parsePubmedSummary(await get(url, "json"), (id) => found.get(id) ?? [], match, today));
    } catch (err) {
      log("PubMed summary failed:", String(err));
    }
    await sleep(400);
  }
  return items;
}

async function trials(): Promise<NewsItem[]> {
  const since = shiftDate(today, -TRIALS_DAYS);
  const items: NewsItem[] = [];
  const b = breaker("ClinicalTrials.gov");
  for (const p of terms) {
    if (b.open) break;
    try {
      const params = new URLSearchParams({
        "query.intr": trialsQuery(p.terms),
        "filter.advanced": `AREA[LastUpdatePostDate]RANGE[${since},MAX]`,
        sort: "LastUpdatePostDate:desc",
        pageSize: String(TRIALS_PER_PEPTIDE),
        format: "json",
      });
      items.push(...parseTrials(await get(`https://clinicaltrials.gov/api/v2/studies?${params}`, "json"), p.id, match, since, today));
      b.ok();
    } catch (err) {
      b.fail(p.id, err);
    }
    await sleep(300);
  }
  return items;
}

async function regulators(): Promise<NewsItem[]> {
  const since = shiftDate(today, -REGULATORY_DAYS);
  const items: NewsItem[] = [];
  for (const feed of FDA_FEEDS) {
    try {
      items.push(...regulatoryItems(parseRss(await get(feed.url, "text")), feed.source, match, since, today));
    } catch (err) {
      log(`${feed.source} feed failed:`, String(err));
    }
  }
  return items;
}

async function posts(): Promise<NewsItem[]> {
  const raw = JSON.parse(await readFile(POSTS, "utf8"));
  if (!Array.isArray(raw)) throw new Error("news/posts.json must be a list");
  return raw.map((p) => {
    const item = normalizeItem({ source: "Fiala", peptides: [], ...p, kind: "fiala", id: `fiala:${p?.id}` });
    if (!item) throw new Error(`Invalid post in news/posts.json: ${JSON.stringify(p)}`);
    return item;
  });
}

async function previous(): Promise<NewsItem[]> {
  try {
    // Fiala posts always come fresh from news/posts.json, so deleted posts disappear.
    return parseFeed(await get(PREVIOUS, "json")).items.filter((i) => i.kind !== "fiala");
  } catch (err) {
    log(`No previous feed from ${PREVIOUS}:`, String(err));
    return [];
  }
}

async function main() {
  const [prev, fiala, research, trialItems, regulatory] = await Promise.all([previous(), posts(), pubmed(), trials(), regulators()]);
  log(`previous ${prev.length}, posts ${fiala.length}, PubMed ${research.length}, trials ${trialItems.length}, regulatory ${regulatory.length}`);
  const items = mergeItems(prev, [...fiala, ...research, ...trialItems, ...regulatory], today);
  const feed: NewsFeed = { version: 1, generatedAt: new Date().toISOString(), items };
  await writeFile(OUT, JSON.stringify(feed));
  log(`wrote ${items.length} items to public/news.json`);
}

main().catch((err) => {
  // Posts file errors are the only thing worth failing on: they're a mistake in this repo.
  console.error("[news] failed:", err);
  process.exitCode = 1;
});
