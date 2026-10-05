import { useState } from "react";
import { NewsDisclaimer, NewsList } from "../components/NewsList";
import { findPeptide } from "../data/peptides";
import { filterNews, useFollowing, useNews, type NewsFilter } from "../lib/news";
import { href } from "../lib/router";

const PAGE = 30;

const FILTERS: { value: NewsFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "following", label: "Following" },
  { value: "research", label: "Research" },
  { value: "trial", label: "Trials" },
  { value: "regulatory", label: "Regulatory" },
  { value: "fiala", label: "Fiala" },
];

export function NewsPage({ peptideId }: { peptideId?: string }) {
  const { feed, fetchedAt, status, refresh } = useNews();
  const followed = useFollowing();
  const peptide = peptideId ? findPeptide(peptideId) : undefined;
  const [filter, setFilter] = useState<NewsFilter>(() => (!peptide && followed.length > 0 ? "following" : "all"));
  const [shown, setShown] = useState(PAGE);

  const items = filterNews(feed?.items ?? [], filter, followed, peptide?.id);

  return (
    <div className="page">
      <div className="row">
        <h1>News</h1>
        <button type="button" className="button secondary small" onClick={() => void refresh()} disabled={status === "loading"}>
          {status === "loading" ? "Updating…" : "Refresh"}
        </button>
      </div>
      <NewsDisclaimer />

      {peptide && (
        <p className="notice">
          Showing news about <strong>{peptide.name}</strong>. <a href={href("news")}>Show all news</a>
        </p>
      )}

      <div className="chips scroll" role="group" aria-label="Filter news">
        {FILTERS.map((f) => (
          <button
            type="button"
            key={f.value}
            className={filter === f.value ? "chip active" : "chip"}
            aria-pressed={filter === f.value}
            onClick={() => {
              setFilter(f.value);
              setShown(PAGE);
            }}
          >
            {f.label}
            {f.value === "following" && followed.length > 0 ? ` (${followed.length})` : ""}
          </button>
        ))}
      </div>

      {status === "error" && (
        <p className="alert warn" role="status">
          {feed ? "Couldn't check for new stories. Showing the last saved news." : "News isn't available right now. Check your connection and try again."}
        </p>
      )}

      {!feed && status === "loading" && <p className="muted">Loading news…</p>}

      {feed && items.length === 0 && (
        <p className="muted">
          {filter === "following" && followed.length === 0 ? (
            <>
              You're not following any peptides yet. Open one in the <a href={href("library")}>library</a> and tap{" "}
              <strong>Follow</strong> to see its news here.
            </>
          ) : (
            "No stories here yet."
          )}
        </p>
      )}

      <NewsList items={items.slice(0, shown)} />

      {items.length > shown && (
        <button type="button" className="button secondary" onClick={() => setShown(shown + PAGE)}>
          Show more
        </button>
      )}

      {fetchedAt && (
        <p className="muted small">
          Checked {new Date(fetchedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}. The feed
          updates once a day.
        </p>
      )}
    </div>
  );
}
