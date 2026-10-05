import { useState, type FormEvent } from "react";
import { PeptideField, choiceId, choiceName, emptyChoice, type PeptideChoice } from "../components/PeptideField";
import { TrackerNav } from "../components/TrackerNav";
import { formatDateKey, localDateKey } from "../lib/dates";
import { downloadFile, type DoseUnit } from "../lib/doseLog";
import { WEEKDAYS, describeFrequency, formatTime, schedules, toIcs, useSchedules, type Frequency, type Schedule } from "../lib/schedules";

export function SchedulesPage({ prefill }: { prefill: { peptide?: string } }) {
  const all = useSchedules();
  const [showForm, setShowForm] = useState(!!prefill.peptide || all.length === 0);

  return (
    <div className="page">
      <h1>Tracker</h1>
      <TrackerNav current="tracker/schedules" />
      <p className="muted small">
        Set up a routine and it will show on your Today screen. Tap <strong>Add to calendar</strong> to get reminders
        on your phone, even when the app is closed.
      </p>

      {showForm ? (
        <ScheduleForm prefill={prefill} onDone={() => setShowForm(false)} canCancel={all.length > 0} />
      ) : (
        <button type="button" className="button" onClick={() => setShowForm(true)}>
          + New schedule
        </button>
      )}

      <ul className="list">
        {all.map((s) => (
          <ScheduleCard key={s.id} schedule={s} />
        ))}
      </ul>
    </div>
  );
}

function ScheduleCard({ schedule: s }: { schedule: Schedule }) {
  const fileName = `${s.peptideName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-schedule.ics`;
  return (
    <li className={`card schedule-card${s.active ? "" : " finished"}`}>
      <div className="row">
        <strong>{s.peptideName}</strong>
        <span>
          {s.amount} {s.unit}
        </span>
      </div>
      <div className="muted small">
        {describeFrequency(s.frequency)} at {formatTime(s.time)}
        <br />
        From {formatDateKey(s.startDate, { month: "short", day: "numeric", year: "numeric" })}
        {s.endDate && <> to {formatDateKey(s.endDate, { month: "short", day: "numeric", year: "numeric" })}</>}
        {!s.active && <> · Paused</>}
      </div>
      {s.notes && <p className="small">{s.notes}</p>}
      <div className="actions">
        <button type="button" className="button small" onClick={() => downloadFile(fileName, toIcs(s), "text/calendar")}>
          📅 Add to calendar
        </button>
        <button type="button" className="button secondary small" onClick={() => schedules.update(s.id, { active: !s.active })}>
          {s.active ? "Pause" : "Resume"}
        </button>
        <button
          type="button"
          className="link-button"
          onClick={() => {
            if (confirm(`Delete the ${s.peptideName} schedule? Calendar events you already added need to be removed in your calendar app.`)) schedules.remove(s.id);
          }}
        >
          Delete
        </button>
      </div>
    </li>
  );
}

function ScheduleForm({ prefill, onDone, canCancel }: { prefill: { peptide?: string }; onDone: () => void; canCancel: boolean }) {
  const [peptide, setPeptide] = useState<PeptideChoice>(emptyChoice(prefill.peptide));
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<DoseUnit>("mcg");
  const [kind, setKind] = useState<Frequency["kind"]>("weekly");
  const [days, setDays] = useState<number[]>([new Date().getDay()]);
  const [everyDays, setEveryDays] = useState("1");
  const [time, setTime] = useState("08:00");
  const [startDate, setStartDate] = useState(localDateKey());
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const toggleDay = (d: number) => setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const name = choiceName(peptide);
    const value = parseFloat(amount);
    const n = parseInt(everyDays, 10);
    if (!name) return setError("Choose a peptide or enter a name.");
    if (!(value > 0)) return setError("Enter a dose greater than 0.");
    if (kind === "weekly" && days.length === 0) return setError("Pick at least one day.");
    if (kind === "interval" && !(n > 0)) return setError("Enter how many days apart doses are.");
    if (!time) return setError("Enter a time.");
    if (endDate && endDate < startDate) return setError("End date is before the start date.");
    schedules.add({
      peptideId: choiceId(peptide),
      peptideName: name,
      amount: value,
      unit,
      frequency: kind === "weekly" ? { kind, days } : { kind, everyDays: n },
      time,
      startDate,
      endDate: endDate || undefined,
      active: true,
      notes: notes.trim() || undefined,
    });
    onDone();
  };

  return (
    <form className="card form" onSubmit={submit}>
      <h2>New schedule</h2>
      <PeptideField value={peptide} onChange={setPeptide} />

      <label>
        <span>Dose</span>
        <div className="input-suffix">
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <div className="segmented" role="group" aria-label="Dose unit">
            {(["mcg", "mg", "units"] as const).map((u) => (
              <button type="button" key={u} className={unit === u ? "active" : ""} onClick={() => setUnit(u)}>
                {u}
              </button>
            ))}
          </div>
        </div>
      </label>

      <fieldset>
        <legend>How often</legend>
        <div className="segmented" role="group">
          <button type="button" className={kind === "weekly" ? "active" : ""} onClick={() => setKind("weekly")}>
            Days of the week
          </button>
          <button type="button" className={kind === "interval" ? "active" : ""} onClick={() => setKind("interval")}>
            Every X days
          </button>
        </div>
        {kind === "weekly" ? (
          <div className="chips days">
            {WEEKDAYS.map((label, d) => (
              <button type="button" key={label} className={days.includes(d) ? "chip active" : "chip"} onClick={() => toggleDay(d)} aria-pressed={days.includes(d)}>
                {label}
              </button>
            ))}
          </div>
        ) : (
          <div className="input-suffix interval">
            <em>Every</em>
            <input inputMode="numeric" value={everyDays} onChange={(e) => setEveryDays(e.target.value)} aria-label="Days between doses" />
            <em>day(s)</em>
          </div>
        )}
      </fieldset>

      <div className="two-col">
        <label>
          <span>Time</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
        <label>
          <span>Start</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
      </div>
      <label>
        <span>End (optional)</span>
        <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
      </label>
      <label>
        <span>Notes</span>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. before breakfast" />
      </label>

      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button className="button" type="submit">
          Save schedule
        </button>
        {canCancel && (
          <button type="button" className="button secondary" onClick={onDone}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
