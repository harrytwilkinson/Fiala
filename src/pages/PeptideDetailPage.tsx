import { useState } from "react";
import { Sec } from "../components/Calibre";
import { Icon } from "../components/Icon";
import { EmptyBezel, SequenceExplorer, StageLadder, StageMeter } from "../components/Sequence";
import { CATEGORY_SHORT, PEPTIDES, STATUS_LABEL, type Peptide } from "../data/peptides";
import { STAGE_LABEL, researchStage } from "../data/researchStage";
import { SEQUENCES } from "../data/sequences";
import { stacksWith } from "../data/stacks";
import { guidesFor, vialLabel } from "../data/vialGuides";
import { evidenceLinks } from "../lib/evidenceLinks";
import { HALF_LIFE_HOURS } from "../lib/levels";
import { shareLink } from "../lib/files";
import { peptidePageUrl } from "../lib/site";
import { NewsDisclaimer, NewsList } from "../components/NewsList";
import { filterNews, toggleFollow, useFollowing, useNews } from "../lib/news";
import { href } from "../lib/router";
import { STATUS_SHORT } from "./LibraryPage";

const NEWS_PREVIEW = 4;
/** Catalogue number: the entry's place in the A to Z library. */
const REF = new Map([...PEPTIDES].sort((a, b) => a.name.localeCompare(b.name)).map((p, i) => [p.id, i + 1]));

export function PeptideDetailPage({ peptide }: { peptide: Peptide }) {
  const { feed } = useNews();
  const followed = useFollowing();
  const isFollowing = followed.includes(peptide.id);
  const news = filterNews(feed?.items ?? [], "all", followed, peptide.id);
  const [shareMsg, setShareMsg] = useState("");
  const sequence = SEQUENCES[peptide.id];

  const share = async () => {
    const result = await shareLink(peptidePageUrl(peptide.id), `${peptide.name} · Fiala`);
    setShareMsg(result === "copied" ? "Link copied." : result === "failed" ? "Couldn't share this page." : "");
  };

  const stage = researchStage(peptide);
  const long = peptide.name.length;
  const header = (
    <>
      <span className={`badge badge-${peptide.status}`}>{peptide.notPeptide ? "Not a peptide" : STATUS_SHORT[peptide.status]}</span>
      <h1 className={long > 22 ? "xs" : long > 12 ? "sm" : ""}>{peptide.name}</h1>
      <span className="cal-label b">
        {CATEGORY_SHORT[peptide.category]}
        {sequence ? ` · ${sequence.seq.length} amino acids` : ""}
      </span>
    </>
  );

  return (
    <div className="page">
      <header className="pep-nav">
        <a className="pep-back" href={href("library")}>
          <Icon name="back" />
          Library
        </a>
        <span className="cal-label">Ref. {String(REF.get(peptide.id) ?? 0).padStart(3, "0")}</span>
        <button type="button" className="icon-btn" onClick={share} aria-label="Share this page">
          <Icon name="share" />
        </button>
      </header>
      {shareMsg && (
        <p className="cal-fine center" role="status">
          {shareMsg}
        </p>
      )}

      {sequence ? <SequenceExplorer sequence={sequence} header={header} /> : <EmptyBezel header={header} />}

      <p className="cal-p lead-in">{peptide.summary}</p>

      <Sec title="Specifications">
        <dl className="spec">
          <div>
            <dt>Status</dt>
            <dd>{STATUS_LABEL[peptide.status]}</dd>
          </div>
          <div>
            <dt>Research stage</dt>
            <dd>
              <StageMeter stage={stage} compact />
              {STAGE_LABEL[stage]}
            </dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{peptide.category}</dd>
          </div>
          {peptide.halfLife && (
            <div>
              <dt>Half-life</dt>
              <dd>{peptide.halfLife}</dd>
            </div>
          )}
          {peptide.route && (
            <div>
              <dt>Taken</dt>
              <dd>{peptide.route}</dd>
            </div>
          )}
          {peptide.aliases.length > 0 && (
            <div>
              <dt>Also known as</dt>
              <dd>{peptide.aliases.join(", ")}</dd>
            </div>
          )}
        </dl>
        {peptide.id in HALF_LIFE_HOURS && (
          <p className="cal-links">
            <a href={href("plus/levels", { peptide: peptide.id })}>See your estimated level curve ✦</a>
          </p>
        )}
      </Sec>

      <Sec title="What people use it for">
        <ul className="cal-list">
          {peptide.commonUses.map((u) => (
            <li key={u}>{u}</li>
          ))}
        </ul>
      </Sec>

      <Sec title="What it does">
        <p className="cal-p">{peptide.mechanism}</p>
      </Sec>

      <Sec title="Strength of evidence">
        <p className="cal-p">{peptide.evidence}</p>
        <StageLadder stage={stage} />
      </Sec>

      <Sec title="Look up the evidence">
        <ul className="list component-list">
          {evidenceLinks(peptide).map((l) => (
            <li key={l.url}>
              <a href={l.url} target="_blank" rel="noopener noreferrer">
                {l.label}
              </a>
              <span className="muted small"> · {l.note}</span>
            </li>
          ))}
        </ul>
        <p className="cal-fine">
          Live searches of official databases. New to the terms? See the <a href={href("glossary")}>glossary</a>.
        </p>
      </Sec>

      <Sec title="Reported side effects & risks">
        <ul className="cal-list">
          {peptide.sideEffects.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </Sec>

      <Sec title="Who should avoid it or take extra care">
        <ul className="cal-list">
          {peptide.avoidIf.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
        <p className="cal-note">Not a complete list. Check with a doctor or pharmacist about your own health and medicines.</p>
      </Sec>

      <Sec title="Regulatory status">
        <p className="cal-p">{peptide.regulatory}</p>
      </Sec>

      {stacksWith(peptide.id).length > 0 && (
        <Sec title="Found in these stacks">
          <ul className="list component-list">
            {stacksWith(peptide.id).map((s) => (
              <li key={s.id}>
                <a href={href(`stacks/${s.id}`)}>{s.name}</a>
                <span className="muted small"> · {s.summary}</span>
              </li>
            ))}
          </ul>
        </Sec>
      )}

      {peptide.storage && (
        <Sec title="Storage">
          <p className="cal-p">{peptide.storage}</p>
        </Sec>
      )}

      {__CONVERTER__ && guidesFor(peptide.id).length > 0 && (
        <Sec title="Mixing guides">
          <p className="cal-fine">How to mix a {peptide.name} vial and read the syringe at your dose.</p>
          <div className="chips">
            {guidesFor(peptide.id).map((g) => (
              <a key={g.id} className="chip" href={href(`guides/${g.id}`)}>
                {vialLabel(g.vialMg)} vial
              </a>
            ))}
          </div>
        </Sec>
      )}

      <Sec
        title="Latest research & news"
        right={
          <button type="button" className={isFollowing ? "pusher on" : "pusher"} aria-pressed={isFollowing} onClick={() => toggleFollow(peptide.id)}>
            {isFollowing ? "Following" : "Follow"}
          </button>
        }
      >
        {news.length > 0 ? (
          <>
            <NewsList items={news.slice(0, NEWS_PREVIEW)} showPeptides={false} />
            {news.length > NEWS_PREVIEW && (
              <p className="cal-links">
                <a href={href("news", { peptide: peptide.id })}>See all {news.length}</a>
              </p>
            )}
            <NewsDisclaimer />
          </>
        ) : (
          <p className="cal-fine">{feed ? "No recent stories about this peptide." : "News will appear here once it has loaded."}</p>
        )}
      </Sec>

      <div className="cal-cta">
        <a className="button" href={href("tracker", { peptide: peptide.id })}>
          Log a dose
        </a>
        <a className="button secondary" href={href("library/compare", { a: peptide.id })}>
          Compare
        </a>
        <a className="button secondary wide" href={href("tracker/schedules", { peptide: peptide.id })}>
          Create schedule
        </a>
      </div>

      <p className="cal-fine">
        Educational information only, not medical advice. Talk to a qualified clinician before starting, stopping or
        changing any treatment.
      </p>
    </div>
  );
}
