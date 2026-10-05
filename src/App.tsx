import { Onboarding } from "./components/Onboarding";
import { lazy, Suspense } from "react";
import { findPeptide } from "./data/peptides";
import { useOnboardingOpen } from "./lib/onboarding";
import { href, useRoute } from "./lib/router";
import { BackupPage } from "./pages/BackupPage";
import { HomePage } from "./pages/HomePage";
import { LibraryPage } from "./pages/LibraryPage";
import { NewsPage } from "./pages/NewsPage";
import { PeptideDetailPage } from "./pages/PeptideDetailPage";
import { SchedulesPage } from "./pages/SchedulesPage";
import { TrackerPage } from "./pages/TrackerPage";
import { VialsPage } from "./pages/VialsPage";

// Loaded lazily, and compiled out completely in store builds (__CONVERTER__ is a build-time constant).
const CalculatorPage = __CONVERTER__ ? lazy(() => import("./pages/CalculatorPage").then((m) => ({ default: m.CalculatorPage }))) : null;

const TABS = [
  { path: "", label: "Home", icon: "🏠" },
  { path: "library", label: "Library", icon: "📚" },
  { path: "calculator", label: "Converter", icon: "🧮" },
  { path: "news", label: "News", icon: "📰" },
  { path: "tracker", label: "Tracker", icon: "📈" },
].filter((t) => t.path !== "calculator" || __CONVERTER__);

export function App() {
  const { path, query } = useRoute();
  const onboardingOpen = useOnboardingOpen();
  const [section = "", id] = path;
  // Remount pages when the query changes so prefilled values are applied.
  const key = `${path.join("/")}?${query.toString()}`;

  let page;
  switch (section) {
    case "library": {
      const peptide = id ? findPeptide(id) : undefined;
      page = peptide ? <PeptideDetailPage peptide={peptide} /> : <LibraryPage />;
      break;
    }
    case "calculator":
      page = __CONVERTER__ && CalculatorPage ? <CalculatorPage /> : <HomePage />;
      break;
    case "tracker": {
      const q = (k: string) => query.get(k) ?? undefined;
      if (id === "vials") page = <VialsPage prefill={{ peptide: q("peptide"), vialMg: q("vialMg"), waterMl: q("waterMl") }} />;
      else if (id === "schedules") page = <SchedulesPage prefill={{ peptide: q("peptide") }} />;
      else page = <TrackerPage prefill={{ peptide: q("peptide"), amount: q("amount"), unit: q("unit"), schedule: q("schedule") }} />;
      break;
    }
    case "news":
      page = <NewsPage peptideId={query.get("peptide") ?? undefined} />;
      break;
    case "backup":
      page = <BackupPage />;
      break;
    default:
      page = <HomePage />;
  }

  return (
    <>
      {/* inert: keep focus and screen readers inside the walkthrough while it is open */}
      <main key={key} inert={onboardingOpen}>
        <Suspense fallback={null}>{page}</Suspense>
      </main>
      <nav className="tabbar" aria-label="Main" inert={onboardingOpen}>
        {TABS.map((t) => (
          <a key={t.path} href={href(t.path)} className={section === t.path ? "active" : ""} aria-current={section === t.path ? "page" : undefined}>
            <span aria-hidden>{t.icon}</span>
            {t.label}
          </a>
        ))}
      </nav>
      {onboardingOpen && <Onboarding />}
    </>
  );
}
