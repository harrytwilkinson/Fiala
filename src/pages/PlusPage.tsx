import { useEffect, useState, type FormEvent } from "react";
import { LicenceError, claimPurchase, hasPlus, plusAvailable, removePlus, unlockWithCode, usePlus } from "../lib/plus";
import { href } from "../lib/router";
import { PLUS } from "../lib/site";

const FEATURES = [
  { path: "plus/report", icon: "📄", title: "Clinician report", text: "A tidy PDF of your doses, schedules, adherence, side effects and weight for any period, ready to print or share at appointments." },
  { path: "plus/insights", icon: "📊", title: "Insights", text: "How consistently you've kept to each schedule, your streaks and missed days, and which side effects followed a change in dose." },
  { path: "plus/spend", icon: "💷", title: "Spend tracker", text: "What you spend each month and the cost of each dose, from the vial costs you enter." },
];

export function PlusPage({ sessionId }: { sessionId?: string }) {
  const plus = usePlus();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Coming back from Stripe Checkout: swap the session id for an unlock code.
  useEffect(() => {
    if (!sessionId || hasPlus()) return;
    setBusy(true);
    claimPurchase(sessionId)
      .then(() => setMessage({ tone: "ok", text: "Payment received. Fiala Plus is unlocked. Thank you for supporting Fiala!" }))
      .catch((err) => setMessage({ tone: "error", text: err instanceof LicenceError ? err.message : "Something went wrong. Please try again." }))
      .finally(() => setBusy(false));
  }, [sessionId]);

  const enterCode = (e: FormEvent) => {
    e.preventDefault();
    try {
      unlockWithCode(code);
      setCode("");
      setMessage({ tone: "ok", text: "Fiala Plus is unlocked on this device." });
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof LicenceError ? err.message : "That code couldn't be used." });
    }
  };

  const copy = async () => {
    if (!plus) return;
    try {
      await navigator.clipboard.writeText(plus.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage({ tone: "error", text: "Couldn't copy. Use Email it to me instead." });
    }
  };

  const remove = () => {
    if (!confirm("Remove Fiala Plus from this device? Keep your unlock code so you can add it again.")) return;
    removePlus();
    setMessage({ tone: "ok", text: "Removed from this device." });
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

      {busy && (
        <p className="notice" role="status">
          Unlocking Fiala Plus…
        </p>
      )}
      {message && (
        <p className={message.tone === "ok" ? "notice" : "alert danger"} role="status">
          {message.text}
        </p>
      )}

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
              <a className="button" href={PLUS.checkoutUrl}>
                Buy Fiala Plus
              </a>
              <small className="hint">
                Secure checkout by Stripe. After paying you'll come straight back here and Plus unlocks. 14-day refunds; see
                the <a href="terms.html">terms of sale</a>.
              </small>
            </>
          ) : (
            <p>
              <strong>Coming soon.</strong> Fiala Plus isn't on sale yet. Everything else in Fiala is free and stays free.
            </p>
          )}
        </section>
      )}

      {!plus && (
        <form className="card form" onSubmit={enterCode}>
          <h2>Have an unlock code?</h2>
          <p className="muted small">Bought Plus on another device? Paste the code you saved after buying.</p>
          <label>
            <span>Unlock code</span>
            <textarea rows={3} value={code} onChange={(e) => setCode(e.target.value)} placeholder="FIALA1.…" autoComplete="off" spellCheck={false} />
          </label>
          <button className="button secondary" type="submit" disabled={!code.trim()}>
            Unlock
          </button>
        </form>
      )}

      {plus && (
        <section className="card form">
          <h2>Your unlock code</h2>
          <p className="small">
            Keep this safe: it unlocks Plus on your other devices, or this one if you reinstall or clear your browser.
          </p>
          <textarea className="code-box" rows={3} readOnly value={plus.code} aria-label="Your unlock code" onFocus={(e) => e.target.select()} />
          <div className="actions">
            <button type="button" className="button small" onClick={copy}>
              {copied ? "Copied ✓" : "Copy code"}
            </button>
            <a className="button secondary small" href={`mailto:${plus.claim.email ?? ""}?subject=${encodeURIComponent("My Fiala Plus unlock code")}&body=${encodeURIComponent(`Paste this into Fiala Plus to unlock it on another device:\n\n${plus.code}\n\nhttps://getfiala.com/#/plus`)}`}>
              Email it to me
            </a>
          </div>
          <p className="muted small">
            {plus.claim.email ? `Bought with ${plus.claim.email}. ` : ""}Lost it? Email support@getfiala.com with your Stripe receipt.
          </p>
          <button type="button" className="link-button neutral" onClick={remove}>
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
