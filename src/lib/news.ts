import { useEffect, useSyncExternalStore } from "react";
import { parseFeed, type NewsFeed, type NewsItem, type NewsKind } from "./newsFeed";
import { isNative } from "./platform";

// The news feed is a static file rebuilt nightly and published with the website.
// The last copy is kept on the device so the feed still shows offline.

/** The website serves it next to the app; the native app fetches it from the live site. */
export const FEED_URL = isNative ? "https://getfiala.com/news.json" : "news.json";
export const NEWS_CACHE_KEY = "fiala:news:v1";
export const FOLLOWING_KEY = "fiala:following:v1";
const REFRESH_AFTER_MS = 3 * 60 * 60 * 1000;

export type NewsStatus = "idle" | "loading" | "error";

interface NewsState {
  feed: NewsFeed | null;
  fetchedAt: number | null;
  status: NewsStatus;
}

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function loadCached(): NewsState {
  try {
    const raw = localStorage.getItem(NEWS_CACHE_KEY);
    if (raw) {
      const { feed, fetchedAt } = JSON.parse(raw);
      return { feed: parseFeed(feed), fetchedAt: typeof fetchedAt === "number" ? fetchedAt : null, status: "idle" };
    }
  } catch {
    // Missing or damaged cache: fetch a fresh copy.
  }
  return { feed: null, fetchedAt: null, status: "idle" };
}

let state: NewsState = loadCached();
let inFlight: Promise<void> | null = null;

function set(next: Partial<NewsState>) {
  state = { ...state, ...next };
  emit();
}

export function refreshNews(): Promise<void> {
  if (inFlight) return inFlight;
  set({ status: "loading" });
  inFlight = fetch(FEED_URL, { cache: "no-cache" })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((json) => {
      const feed = parseFeed(json);
      const fetchedAt = Date.now();
      try {
        localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify({ feed, fetchedAt }));
      } catch {
        // Storage full or blocked: the feed still shows for this session.
      }
      set({ feed, fetchedAt, status: "idle" });
    })
    .catch(() => set({ status: "error" }))
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/** The feed, refreshed in the background when it's more than a few hours old. */
export function useNews(): NewsState & { refresh: () => Promise<void> } {
  const current = useSyncExternalStore(subscribe, () => state);
  useEffect(() => {
    if (!state.fetchedAt || Date.now() - state.fetchedAt > REFRESH_AFTER_MS) void refreshNews();
  }, []);
  return { ...current, refresh: refreshNews };
}

// ---------- Followed peptides (kept on this device only) ----------

function readFollowing(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(FOLLOWING_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

let following = readFollowing();

export function useFollowing(): string[] {
  return useSyncExternalStore(subscribe, () => following);
}

export function toggleFollow(peptideId: string) {
  following = following.includes(peptideId) ? following.filter((id) => id !== peptideId) : [...following, peptideId];
  try {
    localStorage.setItem(FOLLOWING_KEY, JSON.stringify(following));
  } catch {
    // Storage blocked: the choice lasts for this session.
  }
  emit();
}

// ---------- Filtering ----------

export type NewsFilter = "all" | "following" | NewsKind;

export function filterNews(items: NewsItem[], filter: NewsFilter, followed: string[], peptideId?: string): NewsItem[] {
  return items.filter((i) => {
    if (peptideId && !i.peptides.includes(peptideId)) return false;
    if (filter === "all") return true;
    if (filter === "following") return i.peptides.some((p) => followed.includes(p));
    return i.kind === filter;
  });
}
