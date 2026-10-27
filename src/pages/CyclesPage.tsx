import { useRef, useState, type FormEvent, type PointerEvent } from "react";
import { PeptideField, choiceId, choiceName, emptyChoice } from "../components/PeptideField";
import { PlusGate } from "../components/PlusGate";
import { cycleState, cycles, onPeriods, overlapCounts, useCycles, type Cycle } from "../lib/cycles";
import { addDays, daysBetween, formatDateKey, localDateKey, parseDateKey } from "../lib/dates";
import { href } from "../lib/router";

const WEEKS_SHOWN = 26;

export function CyclesPage() {
  return (
    <div className="page">
      <a className="back" href={href("plus")}>
        ← Fiala Plus
      </a>
      <h1>Cycle planner</h1>
      <PlusGate feature="The cycle planner">
        <Cycles />
      </PlusGate>
    </div>
  );
}

/** Monday on or before `day`, so the timeline lines up with weeks. */
function weekStart(day: string): string {
  const dow = (parseDateKey(day).getDay() + 6) % 7;
  return addDays(day, -dow);
}

function Cycles() {
  const all = useCycles();
  const today = localDateKey();
  const from = addDays(weekStart(today), -14);
  const [adding, setAdding] = useState(all.length === 0);

  return (
    <>
      <p className="muted small">
        Plan weeks on and weeks off for each peptide and see where they overlap. Drag a row sideways to move it by whole weeks.
        Plans don't log doses or set reminders.
      </p>

      {all.length > 0 && <Timeline all={all} from={from} today={today} />}

      {all.length > 0 && (
        <ul className="list">
          {all.map((c) => (
            <CycleCard key={c.id} cycle={c} today={today} />
          ))}
        </ul>
      )}

      {adding ? (
        <CycleForm onDone={() => setAdding(false)} />
      ) : (
        <button type="button" className="button" onClick={() => setAdding(true)}>
          Plan a cycle
        </button>
      )}
    </>
  );
}

const W = 340;
const ROW = 38;
const TOP = 34;

function Timeline({ all, from, today }: { all: Cycle[]; from: string; today: string }) {
  const days = WEEKS_SHOWN * 7;
  const dayW = W / days;
  const x = (day: string) => daysBetween(from, day) * dayW;
  const counts = overlapCounts(all, from, days);
  const height = TOP + all.length * ROW + 8;
  const [drag, setDrag] = useState<{ id: string; startX: number; weeks: number } | null>(null);
  const svg = useRef<SVGSVGElement>(null);

  const weeksFor = (e: PointerEvent) => {
    const box = svg.current!.getBoundingClientRect();
    return Math.round(((e.clientX - drag!.startX) / box.width) * WEEKS_SHOWN);
  };

  // Month labels at the first of each month in view.
  const months: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(from, i);
    if (d.endsWith("-01")) months.push(d);
  }

  return (
    <section className="card cycle-card">
      <svg
        ref={svg}
        className="cycle-timeline"
        viewBox={`0 0 ${W} ${height}`}
        role="img"
        aria-label={`Timeline of ${all.length} planned cycle${all.length === 1 ? "" : "s"} over the next ${WEEKS_SHOWN} weeks`}
        onPointerMove={(e) => drag && setDrag({ ...drag, weeks: weeksFor(e) })}
        onPointerUp={() => {
          if (drag && drag.weeks !== 0) {
            const c = all.find((x) => x.id === drag.id)!;
            cycles.update(c.id, { startDate: addDays(c.startDate, drag.weeks * 7) });
          }
          setDrag(null);
        }}
        onPointerCancel={() => setDrag(null)}
      >
        {months.map((m) => (
          <g key={m}>
            <line x1={x(m)} x2={x(m)} y1={12} y2={height} className="chart-grid" />
            <text x={x(m) + 3} y={10} className="chart-axis">
              {formatDateKey(m, { month: "short" })}
            </text>
          </g>
        ))}
        {/* overlap strip: darker where more cycles run at once */}
        {counts.map((n, i) =>
          n > 0 ? <rect key={i} x={i * dayW} y={16} width={dayW + 0.3} height={8} className={`overlap-${Math.min(n, 3)}`} /> : null,
        )}
        {all.map((c, row) => {
          const shift = drag?.id === c.id ? drag.weeks * 7 : 0;
          const y = TOP + row * ROW;
          return (
            <g
              key={c.id}
              className={drag?.id === c.id ? "cycle-row dragging" : "cycle-row"}
              onPointerDown={(e) => {
                svg.current!.setPointerCapture(e.pointerId);
                setDrag({ id: c.id, startX: e.clientX, weeks: 0 });
              }}
            >
              <rect x={0} y={y} width={W} height={ROW - 4} className="cycle-hit" />
              <text x={2} y={y + 11} className="cycle-name">
                {c.peptideName}
              </text>
              {onPeriods(c).map((p) => {
                const x1 = Math.max(0, x(addDays(p.start, shift)));
                const x2 = Math.min(W, x(addDays(p.end, shift)));
                return x2 > x1 ? <rect key={p.start} x={x1} y={y + 15} width={x2 - x1} height={12} rx={6} className="cycle-bar" /> : null;
              })}
            </g>
          );
        })}
        <line x1={x(today)} x2={x(today)} y1={12} y2={height} className="level-now-line" />
      </svg>
      <div className="site-legend small">
        <span>
          <i className="swatch overlap-1" aria-hidden /> 1 on
        </span>
        <span>
          <i className="swatch overlap-2" aria-hidden /> 2 on
        </span>
        <span>
          <i className="swatch overlap-3" aria-hidden /> 3+ on
        </span>
      </div>
    </section>
  );
}

const STATE_TEXT = { upcoming: "Starts", on: "On until", off: "Break until", done: "Finished" } as const;

function CycleCard({ cycle, today }: { cycle: Cycle; today: string }) {
  const s = cycleState(cycle, today);
  const last = s.state === "done" ? formatDateKey(addDays(s.until, -1)) : formatDateKey(s.until, { weekday: "short", month: "short", day: "numeric" });
  return (
    <li className="card">
      <div className="row">
        <strong>{cycle.peptideName}</strong>
        <span className={`badge cycle-${s.state}`}>
          {STATE_TEXT[s.state]} {last}
        </span>
      </div>
      <p className="muted small">
        {cycle.weeksOn} week{cycle.weeksOn === 1 ? "" : "s"} on
        {cycle.weeksOff > 0 && `, ${cycle.weeksOff} off`} · {cycle.repeats} cycle{cycle.repeats === 1 ? "" : "s"} from{" "}
        {formatDateKey(cycle.startDate, { day: "numeric", month: "short", year: "numeric" })}
      </p>
      <button
        type="button"
        className="link-button"
        onClick={() => {
          if (confirm(`Delete the ${cycle.peptideName} cycle plan?`)) cycles.remove(cycle.id);
        }}
      >
        Delete
      </button>
    </li>
  );
}

function CycleForm({ onDone }: { onDone: () => void }) {
  const [peptide, setPeptide] = useState(emptyChoice());
  const [startDate, setStartDate] = useState(localDateKey());
  const [weeksOn, setWeeksOn] = useState("8");
  const [weeksOff, setWeeksOff] = useState("4");
  const [repeats, setRepeats] = useState("2");
  const [error, setError] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const name = choiceName(peptide);
    const on = Number(weeksOn);
    const off = Number(weeksOff);
    const reps = Number(repeats);
    if (!name) return setError("Choose a peptide.");
    if (!Number.isInteger(on) || on < 1 || !Number.isInteger(off) || off < 0 || !Number.isInteger(reps) || reps < 1)
      return setError("Use whole numbers: at least 1 week on and 1 cycle.");
    cycles.add({ peptideId: choiceId(peptide), peptideName: name, startDate, weeksOn: on, weeksOff: off, repeats: reps });
    onDone();
  };

  return (
    <form className="card form" onSubmit={submit}>
      <h2>Plan a cycle</h2>
      <PeptideField value={peptide} onChange={setPeptide} />
      <label>
        <span>First day on</span>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </label>
      <div className="two-col">
        <label>
          <span>Weeks on</span>
          <input inputMode="numeric" value={weeksOn} onChange={(e) => setWeeksOn(e.target.value)} />
        </label>
        <label>
          <span>Weeks off</span>
          <input inputMode="numeric" value={weeksOff} onChange={(e) => setWeeksOff(e.target.value)} />
        </label>
      </div>
      <label>
        <span>Number of cycles</span>
        <input inputMode="numeric" value={repeats} onChange={(e) => setRepeats(e.target.value)} />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button type="submit" className="button">
          Add to timeline
        </button>
        <button type="button" className="button secondary" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}
