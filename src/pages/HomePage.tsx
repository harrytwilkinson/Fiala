import { useEffect, useState } from "react";
import { ReserveGauge, Sec, VialMark } from "../components/Calibre";
import { DoseDial } from "../components/DoseDial";
import { Icon } from "../components/Icon";
import { backupIsDue } from "../lib/backup";
import { useLastBackupAt } from "../lib/backupDevice";
import { addDays, formatDateKey, localDateKey } from "../lib/dates";
import { doses, useDoseLog } from "../lib/doseLog";
import { replayOnboarding } from "../lib/onboarding";
import { isNative } from "../lib/platform";
import { SUPPORT_URL } from "../lib/site";
import { href, navigate } from "../lib/router";
import { formatTime, isDueOn, takenOn, useSchedules, type Schedule } from "../lib/schedules";
import { doseStreak, weekProgress } from "../lib/streak";
import { defaultVialFor, runsOutOn, useVials, vialStatus, vials } from "../lib/vials";
import { vialAlert } from "./VialsPage";
import { tapFeedback } from "../lib/haptics";

const UPCOMING_DAYS = 6;

export function HomePage() {
  const entries = useDoseLog();
  const allSchedules = useSchedules();
  const allVials = useVials();
  const today = localDateKey();
  // Re-render twice a minute so the "next dose" countdown stays current.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const dueToday = allSchedules.filter((s) => isDueOn(s, today)).sort((a, b) => a.time.localeCompare(b.time));
  const upcoming = Array.from({ length: UPCOMING_DAYS }, (_, i) => addDays(today, i + 1))
    .map((day) => ({ day, items: allSchedules.filter((s) => isDueOn(s, day)).sort((a, b) => a.time.localeCompare(b.time)) }))
    .filter((d) => d.items.length > 0);
  const alerts = allVials
    .filter((v) => !v.finished)
    .map((v) => ({ vial: v, alert: vialAlert(vialStatus(v, entries, today)) }))
    .filter((a) => a.alert);
  const gauges = allVials
    .filter((v) => !v.finished)
    .map((vial) => {
      const status = vialStatus(vial, entries, today);
      return { vial, status, runsOut: runsOutOn(vial, status.dosesLeft, allSchedules, entries, today) };
    });
  const lowest = [...gauges].sort((a, b) => a.status.remainingFraction - b.status.remainingFraction)[0];
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
    tapFeedback("success");
  };

  const todayItems = dueToday.map((s) => ({ s, taken: takenOn(s, entries, today) }));
  const pending = todayItems.filter((t) => !t.taken);
  const nowDate = new Date();
  const nowHour = nowDate.getHours() + nowDate.getMinutes() / 60;
  const hourOf = (s: Schedule) => Number(s.time.slice(0, 2)) + Number(s.time.slice(3, 5)) / 60;
  let nextTone = "idle";
  let nextText = "Nothing scheduled today";
  if (todayItems.length > 0 && pending.length === 0) {
    nextTone = "ok";
    nextText = "All doses logged today";
  } else if (pending.length > 0) {
    const next = pending[0].s;
    const mins = Math.round((hourOf(next) - nowHour) * 60);
    nextTone = "due";
    nextText =
      mins > 0
        ? `Next · ${next.peptideName} · in ${mins >= 60 ? `${Math.floor(mins / 60)} h ${String(mins % 60).padStart(2, "0")} m` : `${mins} min`}`
        : `Due · ${next.peptideName} · since ${formatTime(next.time)}`;
  }
  const week = weekProgress(allSchedules, entries, today);

  return (
    <div className="page home">
      <header className="cal-top">
        <h1 className="brand">
          <VialMark />
          <span>Fiala</span>
        </h1>
        <div className="date-window" role="img" aria-label={nowDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}>
          <span>{nowDate.toLocaleDateString(undefined, { weekday: "short" })}</span>
          <b>{String(nowDate.getDate()).padStart(2, "0")}</b>
        </div>
      </header>

      <DoseDial
        doses={todayItems.map(({ s, taken }) => ({ hour: hourOf(s), taken: !!taken }))}
        reserve={
          lowest
            ? {
                fraction: lowest.status.remainingFraction,
                text: lowest.status.dosesLeft !== undefined ? `${lowest.status.dosesLeft} LEFT` : `${Math.round(lowest.status.remainingFraction * 100)}% LEFT`,
              }
            : undefined
        }
        week={week.days}
        todayIndex={week.todayIndex}
        streak={doseStreak(allSchedules, entries, today)}
      />
      <p className={`dial-next ${nextTone}`}>
        <i aria-hidden />
        <span className="cal-label b">{nextText}</span>
      </p>

      <Sec title="Today's doses">
        {todayItems.length === 0 ? (
          <p className="cal-empty">
            Nothing scheduled today. <a href={href("tracker/schedules")}>Set up a schedule</a> to see your doses here.
          </p>
        ) : (
          <ul className="dose-list">
            {todayItems.map(({ s, taken }, i) => (
              <li key={s.id} className={taken ? "dose-row done" : "dose-row"}>
                <span className="dose-idx" aria-hidden>
                  {i + 1}
                </span>
                {taken ? (
                  <span className="dose-main">
                    <strong>{s.peptideName}</strong>
                    <span>
                      {s.amount} {s.unit} · {formatTime(s.time)}
                    </span>
                  </span>
                ) : (
                  <a className="dose-main" href={href("tracker", { schedule: s.id })} aria-label={`Log ${s.peptideName} with details`}>
                    <strong>{s.peptideName}</strong>
                    <span>
                      {s.amount} {s.unit} · {formatTime(s.time)}
                    </span>
                  </a>
                )}
                {taken ? (
                  <span className="dose-took" aria-label={`Taken at ${new Date(taken.takenAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`}>
                    <Icon name="check" />
                    <b>{new Date(taken.takenAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</b>
                  </span>
                ) : (
                  <button type="button" className="pusher" onClick={() => markTaken(s)} aria-label={`Mark ${s.peptideName} taken`}>
                    Log
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Sec>

      {gauges.length > 0 && (
        <Sec
          title="Vial reserve"
          right={
            <a className="cal-label" href={href("tracker/vials")}>
              {gauges.length} active
            </a>
          }
        >
          <div className="reserve-grid">
            {gauges.map(({ vial, status, runsOut }) => {
              const d = status.daysUntilDiscard;
              return (
                <a key={vial.id} className="reserve" href={href("tracker/vials")}>
                  <ReserveGauge fraction={status.remainingFraction} low={status.low || status.empty} />
                  <strong>{vial.peptideName}</strong>
                  <span className="reserve-num">
                    {status.dosesLeft !== undefined && status.dosesTotal ? (
                      <>
                        {status.dosesLeft}
                        <i> / {status.dosesTotal}</i>
                      </>
                    ) : (
                      <>
                        {Math.round(status.remainingFraction * 100)}
                        <i>%</i>
                      </>
                    )}
                  </span>
                  <span className={d <= 3 ? "cal-label warn" : "cal-label"}>{d < 0 ? "Past discard" : d === 0 ? "Discard today" : `Discard · ${d} d`}</span>
                  {runsOut && <span className="cal-label">Out · {formatDateKey(runsOut, { month: "short", day: "numeric" })}</span>}
                </a>
              );
            })}
          </div>
        </Sec>
      )}

      {alerts.length > 0 && (
        <Sec title="Needs attention">
          <ul className="list">
            {alerts.map(({ vial, alert }) => (
              <li key={vial.id}>
                <a className={`alert ${alert!.tone} link-alert`} href={href("tracker/vials")}>
                  <strong>{vial.peptideName}</strong> ({vial.vialMg} mg, mixed {formatDateKey(vial.mixedOn)}): {alert!.text}
                </a>
              </li>
            ))}
          </ul>
        </Sec>
      )}

      {showBackupNudge && (
        <a className="alert warn link-alert" href={href("backup")}>
          <strong>{lastBackupAt ? "It's been a while since your last backup." : "Your log isn't backed up yet."}</strong> Your
          data lives only on this phone. Tap to save a backup.
        </a>
      )}

      {upcoming.length > 0 && (
        <Sec title="Coming up">
          <dl className="spec">
            {upcoming.map(({ day, items }) => (
              <div key={day}>
                <dt>{formatDateKey(day, { weekday: "short", month: "short", day: "numeric" })}</dt>
                <dd>{items.map((s) => `${s.peptideName} ${s.amount} ${s.unit} · ${formatTime(s.time)}`).join("; ")}</dd>
              </div>
            ))}
          </dl>
        </Sec>
      )}

      {last && (
        <Sec title="Last dose">
          <dl className="spec">
            <div>
              <dt>{last.peptideName}</dt>
              <dd>
                {last.amount} {last.unit} · {new Date(last.takenAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </dd>
            </div>
          </dl>
        </Sec>
      )}

      <div className="home-links">
        <button type="button" className="link-button neutral" onClick={replayOnboarding}>
          How Fiala works
        </button>
        <a href={href("backup")}>Backup &amp; restore</a>
        <a href="support.html">Help &amp; support</a>
        <a href={href("plus")}>Fiala Plus ✦</a>
        <a href="privacy.html">Privacy</a>
        {/* Tip jar on the website only: app stores require their own payment systems for tips. */}
        {SUPPORT_URL && !isNative && (
          <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">
            Support Fiala ♥
          </a>
        )}
      </div>

      <p className="cal-note">
        <strong>Important.</strong> Fiala is for education and personal record-keeping only and is not medical advice. Many
        peptides sold online are not approved for human use and may be impure or mislabeled. Always talk to a qualified
        healthcare professional before using any peptide, and double-check every calculation before you inject.
      </p>
    </div>
  );
}
