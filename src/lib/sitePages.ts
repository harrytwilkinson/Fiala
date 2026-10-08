// Renders the static, search-engine-friendly library pages (getfiala.com/peptides/...),
// the sitemap and robots.txt. The app itself uses hash URLs (#/library/...), which
// search engines don't index, so these plain HTML pages are what people find in search.
// Pure functions only: scripts/build-pages.ts does the file writing.

import { CATEGORIES, STATUS_LABEL, type Peptide } from "../data/peptides.ts";
import { KIND_LABEL, type NewsItem } from "./newsFeed.ts";
import { SITE_URL, SUPPORT_URL, peptidePageUrl } from "./site.ts";

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Trim to a search-snippet-sized description on a word boundary. */
export function metaDescription(text: string, max = 158): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:.]$/, "")}…`;
}

const STYLE = `
:root{--bg:#f6f7f9;--surface:#fff;--text:#13201f;--muted:#5b6b6a;--border:#dfe5e4;--accent:#0f766e;--accent-soft:#ccfbf1;--warn-bg:#fff7ed;--warn-border:#fdba74;--warn-text:#7c2d12;--b1:#14b8a6;--b2:#0d9488;--b3:#3730a3;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#0d1413;--surface:#151f1e;--text:#e6efee;--muted:#93a3a1;--border:#283533;--accent:#2dd4bf;--accent-soft:#134e4a;--warn-bg:#2a1a0c;--warn-border:#9a3412;--warn-text:#fed7aa;--b1:#5eead4;--b2:#2dd4bf;--b3:#818cf8;color-scheme:dark}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:720px;margin:0 auto;padding:max(1rem,env(safe-area-inset-top)) 16px 3rem}
a{color:var(--accent)}
.brand{display:inline-flex;align-items:center;gap:.5rem;text-decoration:none;margin-bottom:1rem}
.brand img{width:32px;height:32px;border-radius:8px}
.brand span{font-weight:800;font-size:1.35rem;letter-spacing:-.03em;background:linear-gradient(100deg,var(--b1),var(--b2) 45%,var(--b3));-webkit-background-clip:text;background-clip:text;color:transparent}
.crumbs{font-size:.85rem;color:var(--muted);margin:0 0 .25rem}
.crumbs a{color:var(--muted)}
h1{font-size:1.9rem;line-height:1.2;margin:.1rem 0 .3rem}
h2{font-size:1.15rem;margin:0 0 .5rem}
.muted{color:var(--muted)}
.lead{font-size:1.08rem}
.badges{display:flex;gap:.4rem;flex-wrap:wrap;margin:.5rem 0 .75rem}
.badge{font-size:.75rem;font-weight:600;padding:.15rem .55rem;border-radius:999px;background:var(--border);color:var(--text)}
.s-approved{background:#dcfce7;color:#14532d}.s-approved-elsewhere{background:#dbeafe;color:#1e3a8a}.s-investigational{background:#ede9fe;color:#4c1d95}.s-research-only{background:#fef3c7;color:#78350f}
.card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:1rem 1.1rem;margin:1rem 0}
.card ul{margin:.25rem 0;padding-left:1.2rem}
.cta{border-color:var(--accent);background:var(--accent-soft)}
.button{display:inline-block;background:var(--accent);color:#fff;text-decoration:none;font-weight:600;padding:.6rem 1rem;border-radius:10px;margin:.4rem .4rem 0 0}
@media (prefers-color-scheme:dark){.button{color:#042f2e}}
.button.secondary{background:var(--surface);color:var(--text);border:1px solid var(--border)}
.warn{background:var(--warn-bg);border-color:var(--warn-border);color:var(--warn-text)}
.news li{margin:.5rem 0}
.news small{color:var(--muted)}
.grid{list-style:none;padding:0;margin:0;display:grid;gap:.6rem}
.grid a{display:block;text-decoration:none;color:inherit;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:.75rem .9rem}
.grid strong{color:var(--text)}
.grid span{display:block;font-size:.88rem;color:var(--muted)}
footer{margin-top:2rem;font-size:.85rem;color:var(--muted)}
footer a{color:var(--muted)}
`;

interface PageOptions {
  title: string;
  description: string;
  canonical: string;
  /** Path from this page back to the site root, e.g. "../../". */
  root: string;
  body: string;
  jsonLd?: object[];
}

function page({ title, description, canonical, root, body, jsonLd = [] }: PageOptions): string {
  const ld = jsonLd.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`).join("\n    ");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#0f766e" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <link rel="canonical" href="${esc(canonical)}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Fiala" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:url" content="${esc(canonical)}" />
    <meta property="og:image" content="${SITE_URL}/icons/icon-512.png" />
    <meta name="twitter:card" content="summary" />
    <link rel="icon" href="${root}fiala.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="${root}icons/apple-touch-icon.png" />
    ${ld}
    <style>${STYLE}</style>
  </head>
  <body>
    <main>
      <a class="brand" href="${root}"><img src="${root}icons/icon-192.png" alt="" /><span>Fiala</span></a>
${body}
      <footer>
        <p>Fiala is for education and personal record-keeping only and is not medical advice. Many peptides are not approved for human use. Talk to a qualified healthcare professional before using any peptide.</p>
        <p><a href="${root}peptides/">All peptides</a> · <a href="${root}">Open the app</a> · <a href="${root}support.html">Help &amp; support</a> · <a href="${root}privacy.html">Privacy</a>${
          SUPPORT_URL ? ` · <a href="${esc(SUPPORT_URL)}" rel="noopener">Support Fiala ♥</a>` : ""
        }</p>
      </footer>
    </main>
  </body>
</html>
`;
}

const list = (items: string[]) => `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;

const fmtDate = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function newsSection(items: NewsItem[]): string {
  if (items.length === 0) return "";
  const rows = items
    .map(
      (n) =>
        `<li>${n.url ? `<a href="${esc(n.url)}" rel="noopener">${esc(n.title)}</a>` : `<strong>${esc(n.title)}</strong>`}<br /><small>${esc(
          [KIND_LABEL[n.kind], n.label, n.source, fmtDate(n.date)].filter(Boolean).join(" · "),
        )}</small></li>`,
    )
    .join("");
  return `
      <section class="card news">
        <h2>Latest research &amp; news</h2>
        <ul>${rows}</ul>
        <p class="muted" style="font-size:.85rem">Picked automatically from PubMed, ClinicalTrials.gov and the FDA, and updated daily. Early, lab and animal studies often don't carry over to people.</p>
      </section>`;
}

export function peptidePage(p: Peptide, all: Peptide[], news: NewsItem[] = []): string {
  const root = "../../";
  // One short brand name helps searchers ("Semaglutide (Ozempic)"); long descriptive aliases don't.
  const shortAlias = p.aliases.find((a) => a.length <= 16 && !a.includes("("));
  const aka = shortAlias ? ` (${shortAlias})` : "";
  const title = `${p.name}${aka}: uses, how it works, evidence and side effects · Fiala`;
  const related = all.filter((o) => o.category === p.category && o.id !== p.id);
  const body = `
      <p class="crumbs"><a href="${root}peptides/">Peptide library</a> › ${esc(p.category)}</p>
      <h1>${esc(p.name)}</h1>
      ${p.aliases.length ? `<p class="muted">Also known as ${esc(p.aliases.join(", "))}</p>` : ""}
      <div class="badges"><span class="badge s-${p.status}">${esc(STATUS_LABEL[p.status])}</span><span class="badge">${esc(p.category)}</span></div>
      <p class="lead">${esc(p.summary)}</p>

      <section class="card"><h2>What people use it for</h2>${list(p.commonUses)}</section>
      <section class="card"><h2>What ${esc(p.name)} does in the body</h2><p>${esc(p.mechanism)}</p></section>
      <section class="card"><h2>Strength of evidence</h2><p>${esc(p.evidence)}</p></section>
      <section class="card"><h2>Reported side effects &amp; risks</h2>${list(p.sideEffects)}</section>
      <section class="card"><h2>Regulatory status</h2><p>${esc(p.regulatory)}</p></section>
      ${p.storage ? `<section class="card"><h2>Storage</h2><p>${esc(p.storage)}</p></section>` : ""}
${newsSection(news)}
      <section class="card cta">
        <h2>Keep track of ${esc(p.name)} privately</h2>
        <p>Fiala is a free app for logging doses, tracking vials and setting reminders. Everything stays on your phone: no account, no tracking.</p>
        <a class="button" href="${root}#/library/${esc(p.id)}">Open ${esc(p.name)} in Fiala</a>
        <a class="button secondary" href="${root}support.html">How to install</a>
      </section>

      <section class="card warn"><strong>Not medical advice.</strong> This page is general education. Talk to a qualified clinician before starting, stopping or changing any treatment.</section>
${
  related.length
    ? `
      <h2 style="margin-top:2rem">More in ${esc(p.category)}</h2>
      <ul class="grid">${related.map((o) => `<li><a href="${root}peptides/${esc(o.id)}/"><strong>${esc(o.name)}</strong><span>${esc(o.summary)}</span></a></li>`).join("")}</ul>`
    : ""
}`;
  return page({
    title,
    description: metaDescription(`${p.name}: ${p.summary} What people use it for, how it works, the evidence, side effects and regulatory status.`),
    canonical: peptidePageUrl(p.id),
    root,
    body,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Fiala", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Peptide library", item: `${SITE_URL}/peptides/` },
          { "@type": "ListItem", position: 3, name: p.name, item: peptidePageUrl(p.id) },
        ],
      },
    ],
  });
}

export function libraryIndexPage(all: Peptide[]): string {
  const root = "../";
  const sections = CATEGORIES.map((c) => {
    const items = all.filter((p) => p.category === c).sort((a, b) => a.name.localeCompare(b.name));
    return `
      <h2 style="margin-top:1.75rem">${esc(c)}</h2>
      <ul class="grid">${items
        .map((p) => `<li><a href="${p.id}/"><strong>${esc(p.name)}</strong>${p.aliases.length ? ` <span style="display:inline">· ${esc(p.aliases.join(", "))}</span>` : ""}<span>${esc(p.summary)}</span></a></li>`)
        .join("")}</ul>`;
  }).join("");
  const body = `
      <h1>Peptide library</h1>
      <p class="lead">What ${all.length} common peptides are, what people use them for, how they work in the body, how strong the evidence is, and their side effects and regulatory status.</p>
      <section class="card cta">
        <p>Fiala is a free, private app to learn about peptides, convert a prescribed dose into syringe units, and log doses, vials and schedules. Nothing leaves your phone.</p>
        <a class="button" href="${root}">Open Fiala</a>
      </section>
${sections}`;
  return page({
    title: "Peptide library: uses, evidence and side effects · Fiala",
    description: metaDescription(`Plain-English guide to ${all.length} peptides including semaglutide, tirzepatide, BPC-157 and TB-500: uses, how they work, evidence, side effects and regulatory status.`),
    canonical: `${SITE_URL}/peptides/`,
    root,
    body,
  });
}

export function sitemap(all: Peptide[]): string {
  const urls = [`${SITE_URL}/`, `${SITE_URL}/peptides/`, ...all.map((p) => peptidePageUrl(p.id)), `${SITE_URL}/support.html`, `${SITE_URL}/privacy.html`];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${esc(u)}</loc></url>`).join("\n")}
</urlset>
`;
}

export const robots = () => `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
