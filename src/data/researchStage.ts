import type { Peptide } from "./peptides.ts";

// How far research on each peptide has got, from lab work to an approved medicine. This is the furthest
// stage reached, not a verdict on whether it works: a peptide can reach large trials and fail them.
// The written `evidence` text on each entry gives the detail.

export type ResearchStage = 1 | 2 | 3 | 4 | 5;

export const STAGE_LABEL: Record<ResearchStage, string> = {
  1: "Lab studies",
  2: "Animal studies",
  3: "Small human studies",
  4: "Large human trials",
  5: "Approved medicine",
};

/** Stages for entries that aren't approved anywhere. Approved entries are stage 5. */
const STAGES: Record<string, ResearchStage> = {
  // In clinical trials
  retatrutide: 4,
  cagrilintide: 4,
  survodutide: 4,
  "thymosin-beta-4": 3,
  "ara-290": 3,
  amycretin: 3,
  efpeglenatide: 4,
  pemvidutide: 3,
  petrelintide: 3,
  apraglutide: 4,
  glepaglutide: 4,
  larazotide: 4,
  "pn-943": 3,
  selepressin: 4,
  murepavadin: 3,
  brilacidin: 3,
  balixafortide: 4,
  "ltx-315": 3,
  "nnz-2591": 3,
  davunetide: 4,
  nangibotide: 3,

  // Research compounds
  "aod-9604": 4,
  sermorelin: 4,
  "cjc-1295": 3,
  ipamorelin: 3,
  "bpc-157": 2,
  "tb-500": 2,
  "ghk-cu": 3,
  "melanotan-ii": 3,
  epitalon: 3,
  "mots-c": 2,
  hexarelin: 3,
  "ghrp-6": 3,
  "igf-1-lr3": 2,
  "kisspeptin-10": 3,
  gonadorelin: 4,
  dsip: 3,
  "ll-37": 3,
  kpv: 2,
  dihexa: 2,
  "igf-1-des": 2,
  "mk-677": 3,
  mgf: 2,
  "follistatin-344": 2,
  "pe-22-28": 2,
  pinealon: 2,
  humanin: 2,
  "foxo4-dri": 2,
  "5-amino-1mq": 2,
  "fragment-176-191": 2,
  "melanotan-i": 3,
  thymulin: 2,

  // Supplements and cosmetic ingredients
  glutathione: 3,
  "acetyl-hexapeptide-8": 3,
  "acetyl-octapeptide-3": 1,
  "acetyl-tetrapeptide-5": 1,
  carnosine: 1,
  "syn-ake": 1,
  "hexapeptide-9": 1,
  "nonapeptide-1": 1,
  "oligopeptide-1": 3,
  "palmitoyl-hexapeptide-12": 1,
  "palmitoyl-pentapeptide-4": 3,
  "palmitoyl-tetrapeptide-7": 1,
  "palmitoyl-tripeptide-1": 1,
  "palmitoyl-tripeptide-38": 1,
  "pentapeptide-18": 1,
  "tripeptide-10-citrulline": 1,
};

export function researchStage(p: Pick<Peptide, "id" | "status">): ResearchStage {
  if (p.status === "approved" || p.status === "approved-elsewhere") return 5;
  return STAGES[p.id] ?? 1;
}

/** Ids with an explicit stage, for tests. */
export const STAGED_IDS = Object.keys(STAGES);
