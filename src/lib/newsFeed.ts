// The news feed file (news.json) shared by the nightly builder (scripts/build-news.ts)
// and the app. Kept free of app imports so Node can run it directly.

export type NewsKind = "fiala" | "research" | "trial" | "regulatory";

export interface NewsItem {
  /** Stable id, e.g. "pubmed:12345678", "nct:NCT01234567", "fda:<url>", "fiala:<slug>". */
  id: string;
  kind: NewsKind;
  title: string;
  /** Link to the original source (https only). Optional for Fiala posts. */
  url?: string;
  /** Publisher or journal, e.g. "PubMed · J Clin Endocrinol Metab". */
  source: string;
  /** YYYY-MM-DD. */
  date: string;
  /** Library ids this item mentions. */
  peptides: string[];
  /** Short qualifier shown next to the source, e.g. "Animal study", "Recruiting · Phase 2". */
  label?: string;
  /** Plain-text body; used for Fiala posts. */
  summary?: string;
}

export interface NewsFeed {
  version: 1;
  generatedAt: string;
  items: NewsItem[];
}

export const NEWS_KINDS: NewsKind[] = ["fiala", "research", "trial", "regulatory"];

export const KIND_LABEL: Record<NewsKind, string> = {
  fiala: "Fiala",
  research: "Research",
  trial: "Clinical trial",
  regulatory: "Regulatory",
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const str = (v: unknown, max: number): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;

function safeUrl(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  try {
    const u = new URL(v);
    return u.protocol === "https:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** Validate one item from an untrusted file; returns undefined if it's unusable. */
export function normalizeItem(raw: unknown): NewsItem | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const id = str(r.id, 300);
  const title = str(r.title, 400);
  const source = str(r.source, 200);
  const date = typeof r.date === "string" && DATE_RE.test(r.date) ? r.date : undefined;
  const kind = NEWS_KINDS.includes(r.kind as NewsKind) ? (r.kind as NewsKind) : undefined;
  if (!id || !title || !source || !date || !kind) return undefined;
  const url = safeUrl(r.url);
  if (!url && kind !== "fiala") return undefined;
  const peptides = Array.isArray(r.peptides) ? r.peptides.filter((p): p is string => typeof p === "string").slice(0, 20) : [];
  const item: NewsItem = { id, kind, title, source, date, peptides };
  if (url) item.url = url;
  const label = str(r.label, 120);
  if (label) item.label = label;
  const summary = str(r.summary, 2000);
  if (summary) item.summary = summary;
  return item;
}

/** Parse a news.json payload, dropping anything malformed. Throws if it isn't a feed at all. */
export function parseFeed(raw: unknown): NewsFeed {
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as { items?: unknown }).items)) {
    throw new Error("Not a Fiala news feed");
  }
  const r = raw as { generatedAt?: unknown; items: unknown[] };
  const items = r.items.map(normalizeItem).filter((i): i is NewsItem => !!i);
  return { version: 1, generatedAt: typeof r.generatedAt === "string" ? r.generatedAt : "", items: sortItems(items) };
}

/** Newest first; ties keep Fiala posts on top. */
export function sortItems(items: NewsItem[]): NewsItem[] {
  return [...items].sort((a, b) => b.date.localeCompare(a.date) || Number(b.kind === "fiala") - Number(a.kind === "fiala"));
}

export interface PruneOptions {
  /** Drop automatic items older than this (Fiala posts are kept). */
  maxAgeDays: number;
  /** Keep at most this many automatic items per peptide (newest first). */
  perPeptide: number;
  /** Overall cap on automatic items. */
  maxItems: number;
}

export const DEFAULT_PRUNE: PruneOptions = { maxAgeDays: 120, perPeptide: 12, maxItems: 300 };

/**
 * Combine a previous feed with freshly fetched items: same id → newest copy wins and
 * peptide tags are merged; then apply age and size limits.
 */
export function mergeItems(previous: NewsItem[], fresh: NewsItem[], today: string, opts: PruneOptions = DEFAULT_PRUNE): NewsItem[] {
  const byId = new Map<string, NewsItem>();
  for (const item of [...previous, ...fresh]) {
    const existing = byId.get(item.id);
    byId.set(item.id, existing ? { ...item, peptides: [...new Set([...existing.peptides, ...item.peptides])] } : item);
  }
  const cutoff = shiftDate(today, -opts.maxAgeDays);
  const counts = new Map<string, number>();
  const kept: NewsItem[] = [];
  let automatic = 0;
  for (const item of sortItems([...byId.values()])) {
    if (item.kind === "fiala") {
      kept.push(item);
      continue;
    }
    if (item.date < cutoff || automatic >= opts.maxItems) continue;
    // Keep an item while at least one of its peptides still has room (or it has no peptide tags).
    const room = item.peptides.length === 0 || item.peptides.some((p) => (counts.get(p) ?? 0) < opts.perPeptide);
    if (!room) continue;
    for (const p of item.peptides) counts.set(p, (counts.get(p) ?? 0) + 1);
    kept.push(item);
    automatic++;
  }
  return kept;
}

export function shiftDate(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
