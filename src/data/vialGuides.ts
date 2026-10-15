// Vial guides: one page per peptide and common vial size ("BPC-157 10 mg vial").
// They show how to mix the vial and what each syringe mark holds. Like the
// converter, they never suggest a dose: the reader enters their own.
//
// Sizes are the label amounts powder vials are commonly sold in, not doses.
// Kept free of app imports so Node can run it for the static pages.

import { PEPTIDES, type Peptide } from "./peptides.ts";

export interface VialGuideSpec {
  peptideId: string;
  /** Common label amounts, in mg. */
  sizesMg: number[];
  /** Anything specific to mixing this one, shown near the top of the guide. */
  note?: string;
}

const PREFILLED_NOTE =
  "Prescription pens come ready to use and are never mixed. This guide is only for powder vials that need water added.";

export const VIAL_GUIDE_SPECS: VialGuideSpec[] = [
  { peptideId: "semaglutide", sizesMg: [2, 5, 10], note: PREFILLED_NOTE },
  { peptideId: "tirzepatide", sizesMg: [5, 10, 15, 30], note: PREFILLED_NOTE },
  { peptideId: "retatrutide", sizesMg: [5, 10, 20] },
  { peptideId: "cagrilintide", sizesMg: [5, 10] },
  { peptideId: "aod-9604", sizesMg: [2, 5] },
  { peptideId: "tesamorelin", sizesMg: [2, 5, 10] },
  { peptideId: "sermorelin", sizesMg: [2, 5] },
  { peptideId: "cjc-1295", sizesMg: [2, 5] },
  { peptideId: "ipamorelin", sizesMg: [2, 5, 10] },
  { peptideId: "hexarelin", sizesMg: [2, 5] },
  { peptideId: "ghrp-2", sizesMg: [5, 10] },
  { peptideId: "ghrp-6", sizesMg: [5, 10] },
  {
    peptideId: "igf-1-lr3",
    sizesMg: [0.1, 1],
    note: "Some suppliers specify a different liquid for this one (such as dilute acetic acid) instead of bacteriostatic water. Follow the label.",
  },
  { peptideId: "bpc-157", sizesMg: [5, 10] },
  { peptideId: "tb-500", sizesMg: [2, 5, 10] },
  { peptideId: "ghk-cu", sizesMg: [50, 100], note: "A blue colour once mixed is normal: it comes from the copper." },
  { peptideId: "pt-141", sizesMg: [10] },
  { peptideId: "melanotan-ii", sizesMg: [10] },
  { peptideId: "epitalon", sizesMg: [10, 50] },
  { peptideId: "mots-c", sizesMg: [5, 10] },
  { peptideId: "thymosin-alpha-1", sizesMg: [5, 10] },
  { peptideId: "kisspeptin-10", sizesMg: [5, 10] },
  { peptideId: "dsip", sizesMg: [5] },
  { peptideId: "kpv", sizesMg: [5, 10] },
  {
    peptideId: "cerebrolysin",
    sizesMg: [60],
    note: "The licensed medicine comes as a ready-made liquid in ampoules, measured in mL, and is never mixed. This guide is only for powder vials labelled in mg.",
  },
];

export interface VialGuide {
  /** URL slug, e.g. "bpc-157-10mg". */
  id: string;
  peptide: Peptide;
  vialMg: number;
  note?: string;
}

/** "10" → "10", 0.1 → "0-1" so it reads cleanly in a URL. */
const mgSlug = (mg: number) => String(mg).replace(".", "-");

export const guideId = (peptideId: string, mg: number) => `${peptideId}-${mgSlug(mg)}mg`;

export const VIAL_GUIDES: VialGuide[] = VIAL_GUIDE_SPECS.flatMap((spec) => {
  const peptide = PEPTIDES.find((p) => p.id === spec.peptideId);
  if (!peptide) return [];
  return spec.sizesMg.map((vialMg) => ({ id: guideId(peptide.id, vialMg), peptide, vialMg, note: spec.note }));
});

export function findGuide(id: string): VialGuide | undefined {
  return VIAL_GUIDES.find((g) => g.id === id);
}

export function guidesFor(peptideId: string): VialGuide[] {
  return VIAL_GUIDES.filter((g) => g.peptide.id === peptideId);
}

/** "0.1 mg (100 mcg)" for tiny vials, otherwise "10 mg". */
export function vialLabel(mg: number): string {
  return mg < 1 ? `${mg} mg (${Math.round(mg * 1000)} mcg)` : `${mg} mg`;
}

/** Water amounts worth showing for a vial: enough to keep doses measurable without huge volumes. */
export function waterOptions(vialMg: number): number[] {
  if (vialMg >= 50) return [3, 5, 6, 10];
  if (vialMg >= 20) return [2, 3, 5];
  return [1, 2, 3, 5];
}
