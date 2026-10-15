import { href } from "../lib/router";

/** Switch between the free-form converter and the per-vial guides. */
export function ConverterNav({ active }: { active: "converter" | "guides" }) {
  return (
    <nav className="segmented wide" aria-label="Converter sections">
      <a href={href("calculator")} className={active === "converter" ? "active" : ""} aria-current={active === "converter" ? "page" : undefined}>
        Converter
      </a>
      <a href={href("guides")} className={active === "guides" ? "active" : ""} aria-current={active === "guides" ? "page" : undefined}>
        Vial guides
      </a>
    </nav>
  );
}
