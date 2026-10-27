import { href } from "../lib/router";

const ITEMS = [
  { id: "converter", path: "calculator", label: "Converter" },
  { id: "guides", path: "guides", label: "Vial guides" },
  { id: "mixing", path: "mixing", label: "How to mix" },
] as const;

/** Switch between the free-form converter, the per-vial guides and the mixing walkthrough. */
export function ConverterNav({ active }: { active: (typeof ITEMS)[number]["id"] }) {
  return (
    <nav className="segmented wide" aria-label="Converter sections">
      {ITEMS.map((i) => (
        <a key={i.id} href={href(i.path)} className={active === i.id ? "active" : ""} aria-current={active === i.id ? "page" : undefined}>
          {i.label}
        </a>
      ))}
    </nav>
  );
}
