import { findGuide } from "../data/vialGuides";
import { VialGuidePage } from "./VialGuidePage";
import { VialGuidesPage } from "./VialGuidesPage";

/** One vial guide by slug, or the index if the slug is unknown. */
export function VialGuideRoute({ id }: { id: string }) {
  const guide = findGuide(id);
  return guide ? <VialGuidePage guide={guide} /> : <VialGuidesPage />;
}
