import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from "react";
import { STATUS_LABEL } from "../data/peptides";
import { completeOnboarding, hasCompletedOnboarding } from "../lib/onboarding";
import { isNative } from "../lib/platform";
import { SYRINGES } from "../lib/reconstitution";
import { SyringeVisual } from "./SyringeVisual";

interface Slide {
  title: string;
  body: ReactNode;
  art: ReactNode;
}

const ICON_URL = `${import.meta.env.BASE_URL}compass.svg`;

const SLIDES: Slide[] = [
  {
    title: "Welcome to Fiala",
    body: "Learn what peptides do, mix them accurately and keep track of every dose, all in one place.",
    art: <img className="onb-icon" src={ICON_URL} alt="" width={112} height={112} />,
  },
  {
    title: "Look things up in the Library",
    body: "See what each peptide is used for, how it works in the body, side effects and how strong the evidence is. Badges show whether it's an approved medicine or a research compound.",
    art: (
      <div className="onb-badges" aria-hidden>
        <span className="badge badge-approved">{STATUS_LABEL.approved}</span>
        <span className="badge badge-approved-elsewhere">{STATUS_LABEL["approved-elsewhere"]}</span>
        <span className="badge badge-investigational">{STATUS_LABEL.investigational}</span>
        <span className="badge badge-research-only">{STATUS_LABEL["research-only"]}</span>
      </div>
    ),
  },
  // Compiled out of store builds along with the converter itself.
  ...(__CONVERTER__
    ? [
        {
          title: "Measure accurately with the Converter",
          body: "Enter the mg in your vial, the bacteriostatic water you add and the dose you've been prescribed. It converts that into units on an insulin syringe, and warns you if something looks off. It never suggests a dose.",
          art: (
            <div className="onb-syringe" aria-hidden>
              <div className="onb-units">
                10 <span>units</span>
              </div>
              <SyringeVisual syringe={SYRINGES[2]} units={10} />
              <div className="muted small">5 mg vial + 2 mL water, 250 mcg dose</div>
            </div>
          ),
        },
      ]
    : []),
  {
    title: "Stay on track",
    body: (
      <>
        The <strong>Tracker</strong> logs each dose and injection site, counts down what's left in each vial, and
        holds your schedules.{" "}
        {isNative ? (
          <>Turn on reminders to get a notification when each dose is due.</>
        ) : (
          <>
            Tap <strong>Add to calendar</strong> to get reminders on your phone.
          </>
        )}
      </>
    ),
    art: (
      <div className="onb-today" aria-hidden>
        <div className="onb-today-row done">
          <span>BPC-157 · 250 mcg</span>
          <span className="check">✓</span>
        </div>
        <div className="onb-today-row">
          <span>TB-500 · 2 mg</span>
          <span className="onb-pill">Mark taken</span>
        </div>
        <div className="meter">
          <div className="meter-fill" style={{ width: "70%" }} />
        </div>
        <div className="muted small">3.5 mg left · ≈ 14 doses</div>
      </div>
    ),
  },
  {
    title: "Your data, your device",
    body: "Everything you log stays on this phone. There's no account and nothing is uploaded. Clearing your browser data will erase it.",
    art: (
      <div className="onb-lock" aria-hidden>
        🔒
      </div>
    ),
  },
];

const LAST = SLIDES.length - 1;

export function Onboarding() {
  // Replaying from the home screen: the user has already accepted the disclaimer.
  const [replay] = useState(hasCompletedOnboarding);
  const [index, setIndex] = useState(0);
  const [agreed, setAgreed] = useState(replay);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const touchX = useRef<number | null>(null);

  const go = (i: number) => setIndex(Math.max(0, Math.min(LAST, i)));
  const finish = () => {
    if (agreed) completeOnboarding();
  };

  // Move focus to each slide's heading so screen readers announce it.
  useEffect(() => headingRef.current?.focus(), [index]);

  // Lock background scroll and support arrow keys.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIndex((i) => Math.min(LAST, i + 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const onTouchStart = (e: TouchEvent) => (touchX.current = e.touches[0].clientX);
  const onTouchEnd = (e: TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
    touchX.current = null;
  };

  const slide = SLIDES[index];
  const isLast = index === LAST;

  return (
    <div className="onb-backdrop">
      <div
        className="onb"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onb-title"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="onb-top">
          <span className="muted small">
            {index + 1} of {SLIDES.length}
          </span>
          {replay ? (
            <button type="button" className="link-button neutral" onClick={finish}>
              Close
            </button>
          ) : (
            !isLast && (
              <button type="button" className="link-button neutral" onClick={() => go(LAST)}>
                Skip
              </button>
            )
          )}
        </div>

        <div className="onb-slide" key={index}>
          <div className="onb-art">{slide.art}</div>
          <h2 id="onb-title" tabIndex={-1} ref={headingRef}>
            {slide.title}
          </h2>
          <p>{slide.body}</p>

          {isLast && !replay && (
            <label className="onb-agree">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              <span>
                I understand Fiala is for education and record-keeping only, is <strong>not medical advice</strong>, and that I should speak to a qualified healthcare professional before using any peptide.
              </span>
            </label>
          )}
        </div>

        <div className="onb-dots" aria-label="Walkthrough steps">
          {SLIDES.map((s, i) => (
            <button
              key={s.title}
              type="button"
              aria-current={i === index ? "step" : undefined}
              aria-label={`Step ${i + 1}: ${s.title}`}
              className={i === index ? "dot active" : "dot"}
              onClick={() => go(i)}
            />
          ))}
        </div>

        <div className="onb-actions">
          {index > 0 ? (
            <button type="button" className="button secondary" onClick={() => go(index - 1)}>
              Back
            </button>
          ) : (
            <span />
          )}
          {isLast ? (
            <button type="button" className="button" onClick={finish} disabled={!agreed}>
              {replay ? "Done" : "Get started"}
            </button>
          ) : (
            <button type="button" className="button" onClick={() => go(index + 1)}>
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
