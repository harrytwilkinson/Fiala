import { href } from "../lib/router";

const ITEMS = [
  { path: "tracker", label: "Dose log" },
  { path: "tracker/vials", label: "Vials" },
  { path: "tracker/schedules", label: "Schedules" },
];

export function TrackerNav({ current }: { current: string }) {
  return (
    <nav className="segmented wide" aria-label="Tracker sections">
      {ITEMS.map((i) => (
        <a key={i.path} href={href(i.path)} className={current === i.path ? "active" : ""} aria-current={current === i.path ? "page" : undefined}>
          {i.label}
        </a>
      ))}
    </nav>
  );
}
