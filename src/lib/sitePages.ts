// Renders the static, search-engine-friendly library pages (getfiala.com/peptides/...),
// the sitemap and robots.txt. The app itself uses hash URLs (#/library/...), which
// search engines don't index, so these plain HTML pages are what people find in search.
// Pure functions only: scripts/build-pages.ts does the file writing.

import { CATEGORIES, STATUS_LABEL, type Peptide } from "../data/peptides.ts";
import { sortedGlossary } from "../data/glossary.ts";
import { evidenceLinks } from "./evidenceLinks.ts";
import { KIND_LABEL, type NewsItem } from "./newsFeed.ts";
import { BLEND_LABEL_NOTE, STACKS, STACK_KIND_LABEL, componentName, stacksWith, type Stack } from "../data/stacks.ts";
import { SHARE_IMAGE, SITE_URL, SUPPORT_URL, analyticsTag, peptidePageUrl, stackPageUrl, vialGuidePageUrl } from "./site.ts";
import { VIAL_GUIDES, guidesFor, vialLabel } from "../data/vialGuides.ts";

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Trim to a search-snippet-sized description on a word boundary. */
export function metaDescription(text: string, max = 158): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:.]$/, "")}…`;
}

/** Same fonts as the app, copied into dist/fonts/ by scripts/build-pages.ts. Latin only to keep pages light. */
export const FONT_FILES = [
  ["@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2", "bricolage-grotesque.woff2"],
  ["@fontsource-variable/figtree/files/figtree-latin-wght-normal.woff2", "figtree.woff2"],
  ["@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2", "jetbrains-mono-500.woff2"],
] as const;

function fontFaces(root: string): string {
  const face = (family: string, file: string, weight: string) =>
    `@font-face{font-family:"${family}";src:url(${root}fonts/${file}) format("woff2");font-weight:${weight};font-display:swap}`;
  return face("Bricolage Grotesque", "bricolage-grotesque.woff2", "200 800") + face("Figtree", "figtree.woff2", "300 900") + face("JetBrains Mono", "jetbrains-mono-500.woff2", "500") + "\n";
}

const STYLE = `
:root{--bg:#edf3f2;--surface:rgba(255,255,255,.74);--text:#0a1f1d;--muted:#536d67;--border:#d3e1de;--line:rgba(13,148,136,.14);--accent:#0f766e;--accent-soft:#ccfbf1;--warn-bg:#fff4ea;--warn-border:#fdba74;--warn-text:#7c2d12;--b1:#14b8a6;--b2:#0d9488;--b3:#3730a3;--glow:rgba(20,184,166,.24);--fd:"Bricolage Grotesque","Avenir Next","Segoe UI",system-ui,sans-serif;--fb:"Figtree",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;--fm:"JetBrains Mono",ui-monospace,Menlo,monospace;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#061110;--surface:rgba(15,36,34,.72);--text:#e2f2ef;--muted:#8ba9a3;--border:#1e3532;--line:rgba(94,234,212,.12);--accent:#2dd4bf;--accent-soft:#0f3d39;--warn-bg:#2a1a0c;--warn-border:#9a3412;--warn-text:#fed7aa;--b1:#5eead4;--b2:#2dd4bf;--b3:#818cf8;--glow:rgba(45,212,191,.18);color-scheme:dark}}
*{box-sizing:border-box}
body{margin:0;background:radial-gradient(44rem 26rem at 100% -6%,var(--glow),transparent 62%) no-repeat,var(--bg);color:var(--text);font:16px/1.6 var(--fb);-webkit-font-smoothing:antialiased}
main{max-width:720px;margin:0 auto;padding:max(1rem,env(safe-area-inset-top)) 16px 3rem}
a{color:var(--accent)}
.brand{display:inline-flex;align-items:center;gap:.5rem;text-decoration:none;margin-bottom:1rem}
.brand img{width:32px;height:32px;border-radius:8px}
.brand span{font-family:var(--fd);font-weight:800;font-size:1.5rem;letter-spacing:-.03em;background:linear-gradient(100deg,var(--b1),var(--b2) 45%,var(--b3));-webkit-background-clip:text;background-clip:text;color:transparent}
.crumbs{font-size:.85rem;color:var(--muted);margin:0 0 .25rem}
.crumbs a{color:var(--muted)}
h1,h2{font-family:var(--fd);letter-spacing:-.025em;text-wrap:balance}
h1{font-size:2.3rem;font-weight:800;line-height:1.05;letter-spacing:-.04em;margin:.1rem 0 .4rem}
h2{font-size:1.2rem;font-weight:700;margin:0 0 .5rem}
.muted{color:var(--muted)}
.lead{font-size:1.08rem}
.badges{display:flex;gap:.4rem;flex-wrap:wrap;margin:.5rem 0 .75rem}
.badge{font-size:.72rem;font-weight:700;padding:.2rem .6rem;border-radius:999px;background:var(--border);color:var(--text)}
.s-approved{background:#dcfce7;color:#14532d}.s-approved-elsewhere{background:#dbeafe;color:#1e3a8a}.s-investigational{background:#ede9fe;color:#4c1d95}.s-research-only{background:#fef3c7;color:#78350f}.s-supplement{background:#fce7f3;color:#831843}.s-cosmetic{background:#ccfbf1;color:#134e4a}.s-not-peptide{background:var(--accent-soft);color:var(--text)}
.card{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:1.05rem 1.15rem;margin:1rem 0;box-shadow:0 8px 24px -14px rgba(10,40,38,.18)}
.card ul{margin:.25rem 0;padding-left:1.2rem}
.cta{border-color:var(--accent);background:var(--accent-soft)}
.button{display:inline-block;background:linear-gradient(135deg,var(--b2),var(--accent));color:#fff;text-decoration:none;font-weight:700;padding:.65rem 1.15rem;border-radius:999px;margin:.4rem .4rem 0 0}
@media (prefers-color-scheme:dark){.button{color:#042f2e}}
.button.secondary{background:var(--surface);color:var(--text);border:1px solid var(--border)}
.warn{background:var(--warn-bg);border-color:var(--warn-border);color:var(--warn-text)}
.news li{margin:.5rem 0}
.news small{color:var(--muted)}
.grid{list-style:none;padding:0;margin:0;display:grid;gap:.6rem}
.grid a{display:block;text-decoration:none;color:inherit;background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:.8rem .95rem;transition:border-color .15s}
.grid a:hover{border-color:var(--accent)}
.grid strong{font-family:var(--fd);letter-spacing:-.01em}
.grid strong{color:var(--text)}
.grid span{display:block;font-size:.88rem;color:var(--muted)}
table{width:100%;border-collapse:collapse;font-size:.92rem}
th,td{text-align:left;padding:.4rem .25rem;border-bottom:1px solid var(--border)}
thead th{font-family:var(--fm);font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:500}
td{font-variant-numeric:tabular-nums}
.sim label{display:block;margin:.6rem 0}
.sim label>span{display:block;font-weight:600;font-size:.92rem;margin-bottom:.2rem}
.sim input,.sim select{font:inherit;padding:.5rem .7rem;border:1px solid var(--border);border-radius:12px;background:var(--surface);color:var(--text);max-width:100%}
.sim .row{display:flex;gap:.5rem;flex-wrap:wrap}
.big{font-family:var(--fm);font-size:2.8rem;font-weight:700;letter-spacing:-.04em;color:var(--accent);line-height:1.1;margin:.25rem 0}
.big small{font-family:var(--fd);font-size:1rem;font-weight:700;letter-spacing:0;color:var(--muted)}
.syr{width:100%;max-width:420px;display:block;margin:.5rem 0}
.syr .barrel{fill:none;stroke:var(--text);stroke-width:1.5}.syr .liquid{fill:var(--b1);opacity:.7}.syr .liquid.over{fill:#dc2626}.syr .tick{stroke:var(--text);stroke-width:1}.syr text{fill:var(--muted);font-family:var(--fm);font-size:9px}.syr .rod{fill:var(--muted)}
.warnings{color:var(--warn-text);background:var(--warn-bg);border-radius:14px;padding:.5rem .5rem .5rem 1.6rem;margin:.5rem 0}
.chips{display:flex;gap:.4rem;flex-wrap:wrap;list-style:none;padding:0;margin:.4rem 0}
.chips a{display:inline-block;border:1px solid var(--border);border-radius:999px;padding:.25rem .75rem;text-decoration:none;background:var(--surface)}
footer{margin-top:2rem;font-size:.85rem;color:var(--muted)}
footer a{color:var(--muted)}
`;

export interface PageOptions {
  title: string;
  description: string;
  canonical: string;
  /** Path from this page back to the site root, e.g. "../../". */
  root: string;
  body: string;
  jsonLd?: object[];
}

export function page({ title, description, canonical, root, body, jsonLd = [] }: PageOptions): string {
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
    <meta property="og:image" content="${SHARE_IMAGE}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Fiala: peptide library, dose converter and private tracker" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="icon" href="${root}fiala.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="${root}icons/apple-touch-icon.png" />
    ${ld}
    <style>${fontFaces(root)}${STYLE}</style>
    ${analyticsTag()}
  </head>
  <body>
    <main>
      <a class="brand" href="${root}"><img src="${root}icons/icon-192.png" alt="" /><span>Fiala</span></a>
${body}
      <footer>
        <p>Fiala is for education and personal record-keeping only and is not medical advice. Many peptides are not approved for human use. Talk to a qualified healthcare professional before using any peptide.</p>
        <p><a href="${root}peptides/">All peptides</a> · <a href="${root}vial-guides/">Mixing guides</a> · <a href="${root}glossary/">Glossary</a> · <a href="${root}">Open the app</a> · <a href="${root}support.html">Help &amp; support</a> · <a href="${root}privacy.html">Privacy</a>${
          SUPPORT_URL ? ` · <a href="${esc(SUPPORT_URL)}" rel="noopener">Support Fiala ♥</a>` : ""
        }</p>
        <p>© ${new Date().getUTCFullYear()} Fiala. All rights reserved.</p>
      </footer>
    </main>
  </body>
</html>
`;
}

export const list = (items: string[]) => `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;

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
      <div class="badges"><span class="badge s-${p.status}">${esc(STATUS_LABEL[p.status])}</span>${p.notPeptide ? `<span class="badge s-not-peptide">Not a peptide</span>` : ""}<span class="badge">${esc(p.category)}</span></div>
      <p class="lead">${esc(p.summary)}</p>

      <section class="card"><h2>What people use it for</h2>${list(p.commonUses)}</section>
      <section class="card"><h2>What ${esc(p.name)} does in the body</h2><p>${esc(p.mechanism)}</p></section>
      <section class="card"><h2>Strength of evidence</h2><p>${esc(p.evidence)}</p></section>
      <section class="card"><h2>Look up the evidence</h2><ul>${evidenceLinks(p)
        .map((l) => `<li><a href="${esc(l.url)}" rel="noopener">${esc(l.label)}</a>: ${esc(l.note)}</li>`)
        .join("")}</ul><p class="muted" style="font-size:.88rem">Live searches of official databases. New to the terms? See the <a href="${root}glossary/">glossary</a>.</p></section>
      <section class="card"><h2>Reported side effects &amp; risks</h2>${list(p.sideEffects)}</section>
      <section class="card"><h2>Who should avoid it or take extra care</h2>${list(p.avoidIf)}<p class="muted" style="font-size:.88rem">Not a complete list. Check with a doctor or pharmacist about your own health and medicines.</p></section>
      <section class="card"><h2>Regulatory status</h2><p>${esc(p.regulatory)}</p></section>
      ${
        p.route || p.halfLife
          ? `<section class="card"><h2>How it's taken</h2>${p.route ? `<p><strong>Route:</strong> ${esc(p.route)}</p>` : ""}${
              p.halfLife ? `<p><strong>How long it lasts (half-life):</strong> ${esc(p.halfLife)}</p>` : ""
            }</section>`
          : ""
      }
      ${p.storage ? `<section class="card"><h2>Storage</h2><p>${esc(p.storage)}</p></section>` : ""}
      ${
        guidesFor(p.id).length
          ? `<section class="card"><h2>Mixing guides</h2><p>How much water to add and what each syringe mark holds, worked out for your own dose:</p><ul class="chips">${guidesFor(p.id)
              .map((g) => `<li><a href="${root}vial-guides/${esc(g.id)}/">${esc(vialLabel(g.vialMg))} vial</a></li>`)
              .join("")}</ul></section>`
          : ""
      }
      ${
        stacksWith(p.id).length
          ? `<section class="card"><h2>Found in these stacks</h2><ul>${stacksWith(p.id)
              .map((s) => `<li><a href="${root}stacks/${esc(s.id)}/">${esc(s.name)}</a>: ${esc(s.summary)}</li>`)
              .join("")}</ul></section>`
          : ""
      }
${newsSection(news)}
      <section class="card cta">
        <h2>Keep track of ${esc(p.name)} privately</h2>
        <p>Fiala is a free app for logging doses, tracking vials and setting reminders. No account, and everything you log stays on your phone.</p>
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
${sections}
      <h2 style="margin-top:1.75rem">Mixing guides</h2>
      <p><a href="${root}vial-guides/">Vial mixing guides</a>: how to mix ${VIAL_GUIDES.length} common vial sizes of ${new Set(VIAL_GUIDES.map((g) => g.peptide.id)).size} peptides and read the syringe at your dose.</p>
      <h2 style="margin-top:1.75rem">Stacks &amp; blends</h2>
      <ul class="grid">${STACKS.map((st) => `<li><a href="${root}stacks/${esc(st.id)}/"><strong>${esc(st.name)}</strong><span>${esc(st.summary)}</span></a></li>`).join("")}</ul>`;
  return page({
    title: "Peptide library: uses, evidence and side effects · Fiala",
    description: metaDescription(`Plain-English guide to ${all.length} peptides including semaglutide, tirzepatide, BPC-157 and TB-500: uses, how they work, evidence, side effects and regulatory status.`),
    canonical: `${SITE_URL}/peptides/`,
    root,
    body,
  });
}

export function stackPage(st: Stack): string {
  const root = "../../";
  const ingredients = st.components.map((c) => componentName(c.peptideId));
  const body = `
      <p class="crumbs"><a href="${root}peptides/">Peptide library</a> › Stacks &amp; blends</p>
      <h1>${esc(st.name)}</h1>
      ${st.aliases.length ? `<p class="muted">Also known as ${esc(st.aliases.join(", "))}</p>` : ""}
      <div class="badges"><span class="badge s-${st.status.tone}">${esc(st.status.label)}</span><span class="badge">${esc(STACK_KIND_LABEL[st.kind])}</span></div>
      <p class="lead">${esc(st.summary)}</p>

      <section class="card"><h2>What's in it</h2><ul>${st.components
        .map((c) => `<li><a href="${root}peptides/${esc(c.peptideId)}/">${esc(componentName(c.peptideId))}</a>: ${esc(c.role)}</li>`)
        .join("")}</ul></section>
      ${
        st.exampleVial
          ? `<section class="card"><h2>Typical vial label</h2><p>${st.exampleVial.totalMg} mg: ${esc(
              st.exampleVial.contents.map((c) => `${c.mg} mg ${componentName(c.peptideId)}`).join(", "),
            )}</p><p class="muted" style="font-size:.88rem">${esc(BLEND_LABEL_NOTE)}</p></section>`
          : ""
      }
      <section class="card"><h2>Why people combine them</h2><p>${esc(st.whyCombined)}</p></section>
      <section class="card"><h2>Strength of evidence</h2><p>${esc(st.evidence)}</p></section>
      <section class="card"><h2>Risks</h2>${list(st.risks)}</section>
      <section class="card"><h2>Regulatory status</h2><p>${esc(st.regulatory)}</p></section>

      <section class="card cta">
        <h2>Track ${esc(st.name)} privately</h2>
        <p>Fiala's free converter handles blends: enter what's in your vial and your prescribed dose of one peptide, and it shows the units to draw and how much of each peptide that draw contains. Everything stays on your phone.</p>
        <a class="button" href="${root}#/stacks/${esc(st.id)}">Open ${esc(st.name)} in Fiala</a>
      </section>

      <section class="card warn"><strong>Not medical advice.</strong> This page is general education. Talk to a qualified clinician before starting, stopping or changing any treatment.</section>`;
  return page({
    title: `${st.name} (${ingredients.join(" + ")}): what's in it, evidence and risks · Fiala`,
    description: metaDescription(`${st.name}: ${st.summary} What's in it, why people combine them, the evidence, risks and regulatory status.`),
    canonical: stackPageUrl(st.id),
    root,
    body,
  });
}

export function glossaryPage(): string {
  const root = "../";
  const terms = sortedGlossary();
  const body = `
      <p class="crumbs"><a href="${root}peptides/">Peptide library</a> › Glossary</p>
      <h1>Peptide glossary</h1>
      <p class="lead">Plain-English meanings of ${terms.length} terms you'll meet when reading about peptides, from reconstitution to U-100 syringes.</p>
${terms
  .map(
    (t) =>
      `      <section class="card" id="${esc(t.id)}"><h2>${esc(t.term)}</h2>${t.aka?.length ? `<p class="muted">Also: ${esc(t.aka.join(", "))}</p>` : ""}<p>${esc(t.definition)}</p></section>`,
  )
  .join("\n")}`;
  return page({
    title: "Peptide glossary: reconstitution, half-life, U-100 and more · Fiala",
    description: metaDescription(`Plain-English glossary of ${terms.length} peptide terms: reconstitution, bacteriostatic water, half-life, U-100 insulin syringes, mcg vs mg, clinical trial phases and more.`),
    canonical: `${SITE_URL}/glossary/`,
    root,
    body,
  });
}

export function sitemap(all: Peptide[]): string {
  const urls = [
    `${SITE_URL}/`,
    `${SITE_URL}/peptides/`,
    ...all.map((p) => peptidePageUrl(p.id)),
    ...STACKS.map((st) => stackPageUrl(st.id)),
    `${SITE_URL}/vial-guides/`,
    ...VIAL_GUIDES.map((g) => vialGuidePageUrl(g.id)),
    `${SITE_URL}/glossary/`,
    `${SITE_URL}/support.html`,
    `${SITE_URL}/privacy.html`,
    `${SITE_URL}/terms.html`,
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${esc(u)}</loc></url>`).join("\n")}
</urlset>
`;
}

export const robots = () => `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
