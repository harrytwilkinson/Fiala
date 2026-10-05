import { findPeptide } from "./data/peptides";
import { href, useRoute } from "./lib/router";
import { CalculatorPage } from "./pages/CalculatorPage";
import { HomePage } from "./pages/HomePage";
import { LibraryPage } from "./pages/LibraryPage";
import { PeptideDetailPage } from "./pages/PeptideDetailPage";
import { TrackerPage } from "./pages/TrackerPage";

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
    case "tracker":
      page = (
        <TrackerPage
          prefill={{
            peptide: query.get("peptide") ?? undefined,
            amount: query.get("amount") ?? undefined,
            unit: query.get("unit") ?? undefined,
          }}
        />
      );
      break;
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
