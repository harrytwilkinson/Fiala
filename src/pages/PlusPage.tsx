import { useEffect, useState, type FormEvent } from "react";
import { LicenceError, activatePlus, deactivatePlus, plusAvailable, revalidatePlus, usePlus } from "../lib/plus";
import { href } from "../lib/router";
import { PLUS } from "../lib/site";

const FEATURES = [
  { path: "plus/report", icon: "📄", title: "Clinician report", text: "A tidy PDF of your doses, schedules, adherence, side effects and weight for any period, ready to print or share at appointments." },
  { path: "plus/insights", icon: "📊", title: "Insights", text: "How consistently you've kept to each schedule, your streaks and missed days, and which side effects followed a change in dose." },
  { path: "plus/spend", icon: "💷", title: "Spend tracker", text: "What you spend each month and the cost of each dose, from the vial costs you enter." },
];

export function PlusPage() {
  const plus = usePlus();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    void revalidatePlus();
  }, []);

  const activate = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await activatePlus(key);
      setKey("");
      setMessage({ tone: "ok", text: "Fiala Plus is unlocked on this device. Thank you for supporting Fiala!" });
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof LicenceError ? err.message : "Something went wrong. Please try again." });
    }
    setBusy(false);
  };

  const remove = async () => {
    if (!confirm("Remove Fiala Plus from this device? You can enter your key again here or on another device.")) return;
    setBusy(true);
    try {
      await deactivatePlus();
      setMessage({ tone: "ok", text: "Removed from this device." });
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof LicenceError ? err.message : "Something went wrong." });
    }
    setBusy(false);
  };

  return (
    <div className="page">
      <span className="plus-badge">✦ Fiala Plus</span>
      <h1>{plus ? "Fiala Plus" : "Get more from your log"}</h1>
      <p className="muted">
        {plus
          ? "Thanks for supporting Fiala. Your Plus features are below."
          : "A one-off upgrade for reports, insights and spend tracking. No subscription, no account, and your data still never leaves your phone."}
      </p>

      <ul className="list">
        {FEATURES.map((f) => (
          <li key={f.path}>
            <a className="card link-card plus-feature" href={href(f.path)}>
              <span className="tile-icon" aria-hidden>
                {f.icon}
              </span>
              <div>
                <strong>{f.title}</strong>
                <p className="small">{f.text}</p>
              </div>
            </a>
          </li>
        ))}
      </ul>

      {!plus && (
        <section className="card form">
          {plusAvailable() ? (
            <>
              <p className="lead">
                <strong>{PLUS.price}</strong> <span className="muted small">one-off · yours to keep</span>
              </p>
              <a className="button" href={PLUS.checkoutUrl} target="_blank" rel="noopener noreferrer">
                Buy Fiala Plus
              </a>
              <small className="hint">
                Checkout is handled by Lemon Squeezy, who email you a licence key. 14-day refund policy; see the{" "}
                <a href="terms.html">terms of sale</a>.
              </small>
            </>
          ) : (
            <p>
              <strong>Coming soon.</strong> Fiala Plus isn't on sale yet. Everything else in Fiala is free and stays free.
            </p>
          )}
        </section>
      )}

      {!plus && plusAvailable() && (
        <form className="card form" onSubmit={activate}>
          <h2>Already bought it?</h2>
          <label>
            <span>Licence key</span>
            <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="Paste the key from your email" autoComplete="off" spellCheck={false} />
          </label>
          <button className="button secondary" type="submit" disabled={busy || !key.trim()}>
            {busy ? "Checking…" : "Unlock"}
          </button>
        </form>
      )}

      {message && (
        <p className={message.tone === "ok" ? "notice" : "alert danger"} role="status">
          {message.text}
        </p>
      )}

      {plus && (
        <section className="card">
          <h2>Your licence</h2>
          <p className="small">
            Unlocked on this device since {new Date(plus.activatedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
            {plus.customerEmail ? ` for ${plus.customerEmail}` : ""}.
          </p>
          <p className="muted small">
            Moving to a new phone? Remove it here first, then enter your key on the new device. Your key is in your purchase
            email from Lemon Squeezy.
          </p>
          <button type="button" className="button secondary small" onClick={remove} disabled={busy}>
            Remove from this device
          </button>
        </section>
      )}

      <p className="muted small">
        Questions? <a href="support.html">Help &amp; support</a> · <a href="terms.html">Terms of sale</a> ·{" "}
        <a href="privacy.html">Privacy</a>
      </p>
    </div>
  );
}
