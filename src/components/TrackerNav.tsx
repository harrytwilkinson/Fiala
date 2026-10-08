import { href } from "../lib/router";

const ITEMS = [
  { path: "tracker", label: "Doses" },
  { path: "tracker/vials", label: "Vials" },
  { path: "tracker/schedules", label: "Schedules" },
  { path: "tracker/body", label: "Body" },
  { path: "tracker/symptoms", label: "Side effects" },
];

export function TrackerNav({ current }: { current: string }) {
  return (
    <nav className="segmented wide tracker-nav" aria-label="Tracker sections">
      {ITEMS.map((i) => (
        <a key={i.path} href={href(i.path)} className={current === i.path ? "active" : ""} aria-current={current === i.path ? "page" : undefined}>
          {i.label}
        </a>
      ))}
    </nav>
  );
}
