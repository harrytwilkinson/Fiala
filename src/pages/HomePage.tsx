import { backupIsDue } from "../lib/backup";
import { useLastBackupAt } from "../lib/backupDevice";
import { addDays, formatDateKey, localDateKey } from "../lib/dates";
import { doses, useDoseLog } from "../lib/doseLog";
import { replayOnboarding } from "../lib/onboarding";
import { href, navigate } from "../lib/router";
import { formatTime, isDueOn, takenOn, useSchedules, type Schedule } from "../lib/schedules";
import { defaultVialFor, useVials, vialStatus, vials } from "../lib/vials";
import { vialAlert } from "./VialsPage";

const UPCOMING_DAYS = 6;

export function HomePage() {
  const entries = useDoseLog();
  const allSchedules = useSchedules();
  const allVials = useVials();
  const today = localDateKey();

  const dueToday = allSchedules.filter((s) => isDueOn(s, today)).sort((a, b) => a.time.localeCompare(b.time));
  const upcoming = Array.from({ length: UPCOMING_DAYS }, (_, i) => addDays(today, i + 1))
    .map((day) => ({ day, items: allSchedules.filter((s) => isDueOn(s, day)).sort((a, b) => a.time.localeCompare(b.time)) }))
    .filter((d) => d.items.length > 0);
  const alerts = allVials
    .filter((v) => !v.finished)
    .map((v) => ({ vial: v, alert: vialAlert(vialStatus(v, entries, today)) }))
    .filter((a) => a.alert);
  const last = entries[0];
  const lastBackupAt = useLastBackupAt();
  const showBackupNudge = backupIsDue(lastBackupAt, entries.length + allVials.length + allSchedules.length > 0, today);

  const markTaken = (s: Schedule) => {
    const vial = defaultVialFor(vials.get(), s.peptideName);
    if (s.unit === "units" && !vial) return navigate("tracker", { schedule: s.id });
    doses.add({
      peptideId: s.peptideId,
      peptideName: s.peptideName,
      amount: s.amount,
      unit: s.unit,
      takenAt: new Date().toISOString(),
      vialId: vial?.id,
      scheduleId: s.id,
    });
  };

  return (
    <div className="page">
      <h1>Fiala</h1>
      <p className="muted">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>

      <section className="card">
        <h2>Today</h2>
        {dueToday.length === 0 ? (
          <p className="muted small">
            Nothing scheduled today. <a href={href("tracker/schedules")}>Set up a schedule</a> to see your doses here.
          </p>
        ) : (
          <ul className="list today">
            {dueToday.map((s) => {
              const taken = takenOn(s, entries, today);
              return (
                <li key={s.id} className={taken ? "today-item done" : "today-item"}>
                  <div>
                    <strong>{s.peptideName}</strong> · {s.amount} {s.unit}
                    <div className="muted small">
                      {taken ? `Taken at ${new Date(taken.takenAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}` : formatTime(s.time)}
                    </div>
                  </div>
                  {taken ? (
                    <span className="check" aria-label="Taken">
                      ✓
                    </span>
                  ) : (
                    <div className="actions">
                      <button type="button" className="button small" onClick={() => markTaken(s)}>
                        Mark taken
                      </button>
                      <a className="button secondary small" href={href("tracker", { schedule: s.id })} aria-label={`Log ${s.peptideName} with details`}>
                        Details
                      </a>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {alerts.length > 0 && (
        <section className="card">
          <h2>Vials needing attention</h2>
          <ul className="list">
            {alerts.map(({ vial, alert }) => (
              <li key={vial.id}>
                <a className={`alert ${alert!.tone} link-alert`} href={href("tracker/vials")}>
                  <strong>{vial.peptideName}</strong> ({vial.vialMg} mg, mixed {formatDateKey(vial.mixedOn)}): {alert!.text}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {showBackupNudge && (
        <a className="alert warn link-alert" href={href("backup")}>
          <strong>{lastBackupAt ? "It's been a while since your last backup." : "Your log isn't backed up yet."}</strong> Your
          data lives only on this phone. Tap to save a backup.
        </a>
      )}

      {upcoming.length > 0 && (
        <section className="card">
          <h2>Coming up</h2>
          <ul className="list upcoming">
            {upcoming.map(({ day, items }) => (
              <li key={day}>
                <span className="muted small">{formatDateKey(day, { weekday: "short", month: "short", day: "numeric" })}</span>
                <span>{items.map((s) => `${s.peptideName} ${s.amount} ${s.unit} · ${formatTime(s.time)}`).join("; ")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="tiles">
        <a className="card tile" href={href("library")}>
          <span className="tile-icon" aria-hidden>📚</span>
          <strong>Library</strong>
          <span className="muted small">What each peptide does and what the evidence says</span>
        </a>
        {__CONVERTER__ && (
          <a className="card tile" href={href("calculator")}>
            <span className="tile-icon" aria-hidden>🧮</span>
            <strong>Converter</strong>
            <span className="muted small">Turn a prescribed dose into syringe units</span>
          </a>
        )}
        <a className="card tile" href={href("tracker")}>
          <span className="tile-icon" aria-hidden>📈</span>
          <strong>Tracker</strong>
          <span className="muted small">Dose log, vials and schedules</span>
        </a>
        <a className="card tile" href={href("news")}>
          <span className="tile-icon" aria-hidden>📰</span>
          <strong>News</strong>
          <span className="muted small">New research, trials and regulatory updates</span>
        </a>
      </div>

      {last && (
        <section className="card">
          <h2>Last dose</h2>
          <p>
            <strong>{last.peptideName}</strong>: {last.amount} {last.unit}
            <br />
            <span className="muted small">{new Date(last.takenAt).toLocaleString()}</span>
          </p>
        </section>
      )}

      <div className="home-links">
        <button type="button" className="link-button neutral" onClick={replayOnboarding}>
          How Fiala works
        </button>
        <a href={href("backup")}>Backup &amp; restore</a>
        <a href="support.html">Help &amp; support</a>
        <a href="privacy.html">Privacy</a>
      </div>

      <section className="card disclaimer">
        <h2>Important</h2>
        <p className="small">
          Fiala is for education and personal record-keeping only and is not medical advice. Many peptides
          sold online are not approved for human use and may be impure or mislabeled. Always talk to a qualified
          healthcare professional before using any peptide, and double-check every calculation before you inject.
        </p>
      </section>
    </div>
  );
}
