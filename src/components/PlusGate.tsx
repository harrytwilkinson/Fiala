import type { ReactNode } from "react";
import { usePlus } from "../lib/plus";
import { href } from "../lib/router";

/** Shows its children with Fiala Plus, or a short invitation to unlock it. */
export function PlusGate({ feature, children }: { feature: string; children: ReactNode }) {
  const plus = usePlus();
  if (plus) return <>{children}</>;
  return (
    <section className="card plus-upsell">
      <span className="plus-badge">✦ Fiala Plus</span>
      <h2>{feature} is part of Fiala Plus</h2>
      <p>A one-off upgrade that adds a clinician report, insights and spend tracking. Everything you use now stays free.</p>
      <a className="button" href={href("plus")}>
        See Fiala Plus
      </a>
    </section>
  );
}
