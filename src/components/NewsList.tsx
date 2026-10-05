import { findPeptide } from "../data/peptides";
import { formatDateKey } from "../lib/dates";
import { KIND_LABEL, type NewsItem } from "../lib/newsFeed";
import { href } from "../lib/router";

export function NewsList({ items, showPeptides = true }: { items: NewsItem[]; showPeptides?: boolean }) {
  return (
    <ul className="list news-list">
      {items.map((item) => (
        <li key={item.id} className="news-item">
          <div className="news-meta">
            <span className={`badge news-${item.kind}`}>{KIND_LABEL[item.kind]}</span>
            {item.label && <span className="muted small">{item.label}</span>}
          </div>
          {item.url ? (
            <a className="news-title" href={item.url} target="_blank" rel="noopener noreferrer">
              {item.title}
              <span className="sr-only"> (opens the source)</span>
            </a>
          ) : (
            <strong className="news-title">{item.title}</strong>
          )}
          {item.summary && <p className="small">{item.summary}</p>}
          <div className="muted small">
            {item.source} · {formatDateKey(item.date, { day: "numeric", month: "short", year: "numeric" })}
          </div>
          {showPeptides && item.peptides.length > 0 && (
            <div className="chips">
              {item.peptides.map((id) => {
                const p = findPeptide(id);
                return p ? (
                  <a key={id} className="chip small-chip" href={href(`library/${id}`)}>
                    {p.name}
                  </a>
                ) : null;
              })}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function NewsDisclaimer() {
  return (
    <p className="muted small">
      Headlines are picked automatically from PubMed, ClinicalTrials.gov and the FDA. They aren't advice or an endorsement.
      Early, lab and animal studies often don't carry over to people.
    </p>
  );
}
