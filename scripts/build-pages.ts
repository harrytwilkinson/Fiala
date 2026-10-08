// Writes the static library pages, sitemap.xml and robots.txt into dist/ after `vite build`.
// If the build includes a news feed (dist/news.json), each page also lists that peptide's latest news.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { PEPTIDES } from "../src/data/peptides.ts";
import { parseFeed, type NewsItem } from "../src/lib/newsFeed.ts";
import { libraryIndexPage, peptidePage, robots, sitemap } from "../src/lib/sitePages.ts";

const DIST = new URL("../dist/", import.meta.url);
const NEWS_PER_PAGE = 5;

async function news(): Promise<NewsItem[]> {
  try {
    return parseFeed(JSON.parse(await readFile(new URL("news.json", DIST), "utf8"))).items;
  } catch {
    return []; // no feed in this build (e.g. local or native builds)
  }
}

const items = await news();
await mkdir(new URL("peptides/", DIST), { recursive: true });
await writeFile(new URL("peptides/index.html", DIST), libraryIndexPage(PEPTIDES));
for (const p of PEPTIDES) {
  const dir = new URL(`peptides/${p.id}/`, DIST);
  await mkdir(dir, { recursive: true });
  const latest = items.filter((i) => i.kind !== "fiala" && i.peptides.includes(p.id)).slice(0, NEWS_PER_PAGE);
  await writeFile(new URL("index.html", dir), peptidePage(p, PEPTIDES, latest));
}
await writeFile(new URL("sitemap.xml", DIST), sitemap(PEPTIDES));
await writeFile(new URL("robots.txt", DIST), robots());
console.log(`[pages] wrote ${PEPTIDES.length} peptide pages, the library index, sitemap.xml and robots.txt`);
