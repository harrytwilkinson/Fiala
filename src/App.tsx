import { findPeptide } from "./data/peptides";
import { href, useRoute } from "./lib/router";
import { CalculatorPage } from "./pages/CalculatorPage";
import { HomePage } from "./pages/HomePage";
import { LibraryPage } from "./pages/LibraryPage";
import { PeptideDetailPage } from "./pages/PeptideDetailPage";
import { SchedulesPage } from "./pages/SchedulesPage";
import { TrackerPage } from "./pages/TrackerPage";
import { VialsPage } from "./pages/VialsPage";

const TABS = [
  { path: "", label: "Home", icon: "🧭" },
  { path: "library", label: "Library", icon: "📚" },
  { path: "calculator", label: "Calculator", icon: "🧮" },
  { path: "tracker", label: "Tracker", icon: "📈" },
];

export function App() {
  const { path, query } = useRoute();
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
      page = <CalculatorPage initialPeptideId={query.get("peptide") ?? undefined} />;
      break;
    case "tracker": {
      const q = (k: string) => query.get(k) ?? undefined;
      if (id === "vials") page = <VialsPage prefill={{ peptide: q("peptide"), vialMg: q("vialMg"), waterMl: q("waterMl") }} />;
      else if (id === "schedules") page = <SchedulesPage prefill={{ peptide: q("peptide") }} />;
      else page = <TrackerPage prefill={{ peptide: q("peptide"), amount: q("amount"), unit: q("unit"), schedule: q("schedule") }} />;
      break;
    }
    default:
      page = <HomePage />;
  }

  return (
    <>
      <main key={key}>{page}</main>
      <nav className="tabbar" aria-label="Main">
        {TABS.map((t) => (
          <a key={t.path} href={href(t.path)} className={section === t.path ? "active" : ""} aria-current={section === t.path ? "page" : undefined}>
            <span aria-hidden>{t.icon}</span>
            {t.label}
          </a>
        ))}
      </nav>
    </>
  );
}
