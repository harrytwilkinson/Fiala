import { Onboarding } from "./components/Onboarding";
import { lazy, Suspense } from "react";
import { findPeptide } from "./data/peptides";
import { useOnboardingOpen } from "./lib/onboarding";
import { href, useRoute } from "./lib/router";
import { BackupPage } from "./pages/BackupPage";
import { GlossaryPage } from "./pages/GlossaryPage";
import { BodyPage } from "./pages/BodyPage";
import { HomePage } from "./pages/HomePage";
import { InsightsPage } from "./pages/InsightsPage";
import { PlusPage } from "./pages/PlusPage";
import { ReportPage } from "./pages/ReportPage";
import { SpendPage } from "./pages/SpendPage";
import { SymptomsPage } from "./pages/SymptomsPage";
import { LibraryPage } from "./pages/LibraryPage";
import { NewsPage } from "./pages/NewsPage";
import { PeptideDetailPage } from "./pages/PeptideDetailPage";
import { SchedulesPage } from "./pages/SchedulesPage";
import { StackDetailPage } from "./pages/StackDetailPage";
import { StacksPage } from "./pages/StacksPage";
import { findStack } from "./data/stacks";
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
  // Stacks live under the Library tab.
  const tab = section === "stacks" || section === "glossary" ? "library" : section === "plus" ? "tracker" : section;
  // Remount pages when the query changes so prefilled values are applied.
  const key = `${path.join("/")}?${query.toString()}`;

  let page;
  switch (section) {
    case "library": {
      const peptide = id ? findPeptide(id) : undefined;
      page = peptide ? <PeptideDetailPage peptide={peptide} /> : <LibraryPage />;
      break;
    }
    case "stacks": {
      const stack = id ? findStack(id) : undefined;
      page = stack ? <StackDetailPage stack={stack} /> : <StacksPage />;
      break;
    }
    case "calculator":
      page = __CONVERTER__ && CalculatorPage ? <CalculatorPage blend={query.get("blend") ?? undefined} /> : <HomePage />;
      break;
    case "tracker": {
      const q = (k: string) => query.get(k) ?? undefined;
      if (id === "vials") page = <VialsPage prefill={{ peptide: q("peptide"), vialMg: q("vialMg"), waterMl: q("waterMl") }} />;
      else if (id === "body") page = <BodyPage />;
      else if (id === "symptoms") page = <SymptomsPage />;
      else if (id === "schedules") page = <SchedulesPage prefill={{ peptide: q("peptide") }} />;
      else page = <TrackerPage prefill={{ peptide: q("peptide"), amount: q("amount"), unit: q("unit"), schedule: q("schedule") }} />;
      break;
    }
    case "plus":
      page = id === "report" ? <ReportPage /> : id === "insights" ? <InsightsPage /> : id === "spend" ? <SpendPage /> : <PlusPage sessionId={query.get("session_id") ?? undefined} />;
      break;
    case "glossary":
      page = <GlossaryPage />;
      break;
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
      <nav className="tabbar no-print" aria-label="Main" inert={onboardingOpen}>
        {TABS.map((t) => (
          <a key={t.path} href={href(t.path)} className={tab === t.path ? "active" : ""} aria-current={tab === t.path ? "page" : undefined}>
            <span aria-hidden>{t.icon}</span>
            {t.label}
          </a>
        ))}
      </nav>
      {onboardingOpen && <Onboarding />}
    </>
  );
}
