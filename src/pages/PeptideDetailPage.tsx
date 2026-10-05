import type { Peptide } from "../data/peptides";
import { NewsDisclaimer, NewsList } from "../components/NewsList";
import { filterNews, toggleFollow, useFollowing, useNews } from "../lib/news";
import { href } from "../lib/router";
import { StatusBadge } from "./LibraryPage";

const NEWS_PREVIEW = 4;

export function PeptideDetailPage({ peptide }: { peptide: Peptide }) {
  const { feed } = useNews();
  const followed = useFollowing();
  const isFollowing = followed.includes(peptide.id);
  const news = filterNews(feed?.items ?? [], "all", followed, peptide.id);

  return (
    <div className="page">
      <a className="back" href={href("library")}>
        ← Library
      </a>
      <h1>{peptide.name}</h1>
      {peptide.aliases.length > 0 && <p className="muted">Also known as {peptide.aliases.join(", ")}</p>}
      <div className="row wrap">
        <StatusBadge peptide={peptide} />
        <span className="badge">{peptide.category}</span>
      </div>
      <button
        type="button"
        className={isFollowing ? "button small follow" : "button secondary small follow"}
        aria-pressed={isFollowing}
        onClick={() => toggleFollow(peptide.id)}
      >
        {isFollowing ? "✓ Following" : "+ Follow news"}
      </button>

      <p className="lead">{peptide.summary}</p>

      <section className="card">
        <h2>What people use it for</h2>
        <ul>
          {peptide.commonUses.map((u) => (
            <li key={u}>{u}</li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>What it does in the body</h2>
        <p>{peptide.mechanism}</p>
      </section>

      <section className="card">
        <h2>Strength of evidence</h2>
        <p>{peptide.evidence}</p>
      </section>

      <section className="card">
        <h2>Reported side effects &amp; risks</h2>
        <ul>
          {peptide.sideEffects.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Regulatory status</h2>
        <p>{peptide.regulatory}</p>
      </section>

      {peptide.storage && (
        <section className="card">
          <h2>Storage</h2>
          <p>{peptide.storage}</p>
        </section>
      )}

      <section className="card">
        <div className="row">
          <h2>Latest research &amp; news</h2>
          {news.length > NEWS_PREVIEW && (
            <a className="small" href={href("news", { peptide: peptide.id })}>
              See all {news.length}
            </a>
          )}
        </div>
        {news.length > 0 ? (
          <>
            <NewsList items={news.slice(0, NEWS_PREVIEW)} showPeptides={false} />
            <NewsDisclaimer />
          </>
        ) : (
          <p className="muted small">{feed ? "No recent stories about this peptide." : "News will appear here once it has loaded."}</p>
        )}
      </section>

      <div className="actions">
        <a className="button" href={href("tracker", { peptide: peptide.id })}>
          Log a dose
        </a>
        <a className="button secondary" href={href("tracker/schedules", { peptide: peptide.id })}>
          Create schedule
        </a>
      </div>

      <p className="muted small">
        Educational information only, not medical advice. Talk to a qualified clinician before starting, stopping or
        changing any treatment.
      </p>
    </div>
  );
}
