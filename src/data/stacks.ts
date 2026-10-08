// Peptide stacks and blends: combinations people take together, either mixed in
// one vial by a seller ("blend"), taken as separate products ("stack"), or
// developed as a combination medicine ("combination"). Same rules as the
// peptide library: factual, evidence-led, and no dosing recommendations.
// Example vial contents describe what sellers print on labels, not doses.

import { findPeptide } from "./peptides.ts";

export type StackKind = "blend" | "stack" | "combination";

export const STACK_KIND_LABEL: Record<StackKind, string> = {
  blend: "Pre-mixed blend",
  stack: "Taken together",
  combination: "Combination medicine",
};

export interface StackComponent {
  peptideId: string;
  /** Why it's in the mix, in a few words. */
  role: string;
}

export interface StackStatus {
  label: string;
  /** Badge colour; reuses the library's status styles. */
  tone: "approved" | "investigational" | "research-only";
}

export interface Stack {
  id: string;
  name: string;
  aliases: string[];
  kind: StackKind;
  status: StackStatus;
  summary: string;
  components: StackComponent[];
  whyCombined: string;
  evidence: string;
  regulatory: string;
  risks: string[];
  /** What a typical vial label lists, for blends sold pre-mixed. */
  exampleVial?: { totalMg: number; contents: { peptideId: string; mg: number }[] };
}

const BLEND_LABEL_NOTE =
  "Amounts vary between sellers, and the contents of grey-market vials aren't independently checked. Always go by your own vial's label.";

export { BLEND_LABEL_NOTE };

export const STACKS: Stack[] = [
  {
    id: "glow",
    name: "GLOW",
    aliases: ["GLOW blend"],
    kind: "blend",
    status: { label: "Research compounds", tone: "research-only" },
    summary: "Three-peptide blend of GHK-Cu, BPC-157 and TB-500, marketed for skin, hair and recovery.",
    components: [
      { peptideId: "ghk-cu", role: "Skin, collagen and hair" },
      { peptideId: "bpc-157", role: "Tissue healing" },
      { peptideId: "tb-500", role: "Cell migration and repair" },
    ],
    whyCombined:
      "Sellers combine a copper peptide associated with skin and collagen with two peptides popular for injury recovery, on the idea that they support repair in different ways. It is sold as one vial so all three can be taken in a single injection.",
    evidence:
      "None for the blend: there are no published studies of GLOW itself. The evidence for each ingredient is weak, mostly from animal and cell studies, and combining them hasn't been tested for benefit or safety.",
    regulatory:
      "Not approved anywhere; sold online as a 'research chemical'. It contains BPC-157 and TB-500, which are prohibited in sport by WADA.",
    risks: [
      "Each ingredient's own risks apply (see their library pages)",
      "Unknown interactions between the ingredients",
      "Mislabelled or contaminated products are a known problem with grey-market peptides",
      "Because the ratio is fixed, a dose of one ingredient always comes with the others",
    ],
    exampleVial: {
      totalMg: 70,
      contents: [
        { peptideId: "ghk-cu", mg: 50 },
        { peptideId: "bpc-157", mg: 10 },
        { peptideId: "tb-500", mg: 10 },
      ],
    },
  },
  {
    id: "klow",
    name: "KLOW",
    aliases: ["KLOW blend"],
    kind: "blend",
    status: { label: "Research compounds", tone: "research-only" },
    summary: "GLOW plus KPV: four peptides marketed for skin, recovery and inflammation.",
    components: [
      { peptideId: "ghk-cu", role: "Skin, collagen and hair" },
      { peptideId: "bpc-157", role: "Tissue healing" },
      { peptideId: "tb-500", role: "Cell migration and repair" },
      { peptideId: "kpv", role: "Calming inflammation" },
    ],
    whyCombined:
      "Adds KPV, a small anti-inflammatory fragment of alpha-MSH, to the GLOW blend, with the aim of pairing repair with reduced inflammation, particularly for skin and gut.",
    evidence:
      "None for the blend: no published studies of KLOW. Each ingredient's evidence is weak and mostly from animal or cell research.",
    regulatory:
      "Not approved anywhere; sold online as a 'research chemical'. It contains BPC-157 and TB-500, which are prohibited in sport by WADA.",
    risks: [
      "Each ingredient's own risks apply (see their library pages)",
      "Unknown interactions between four ingredients",
      "Mislabelled or contaminated products are a known problem with grey-market peptides",
      "Because the ratio is fixed, a dose of one ingredient always comes with the others",
    ],
    exampleVial: {
      totalMg: 80,
      contents: [
        { peptideId: "ghk-cu", mg: 50 },
        { peptideId: "bpc-157", mg: 10 },
        { peptideId: "tb-500", mg: 10 },
        { peptideId: "kpv", mg: 10 },
      ],
    },
  },
  {
    id: "wolverine",
    name: "Wolverine stack",
    aliases: ["BPC-157 + TB-500", "Wolverine blend"],
    kind: "blend",
    status: { label: "Research compounds", tone: "research-only" },
    summary: "BPC-157 with TB-500, the most popular combination for injury recovery.",
    components: [
      { peptideId: "bpc-157", role: "Tissue and tendon healing" },
      { peptideId: "tb-500", role: "Cell migration and repair" },
    ],
    whyCombined:
      "The two are thought to help healing in complementary ways: BPC-157 through blood-vessel growth and growth-factor signalling, TB-500 by helping cells move into injured tissue. They are sold pre-mixed or taken as separate vials.",
    evidence: "None for the combination, and weak for each peptide on its own (mostly animal studies).",
    regulatory: "Not approved anywhere. Both ingredients are prohibited in sport by WADA.",
    risks: [
      "Each ingredient's own risks apply (see their library pages)",
      "Theoretical concern about promoting blood-vessel growth in existing tumours",
      "Mislabelled or contaminated products are a known problem with grey-market peptides",
    ],
    exampleVial: {
      totalMg: 10,
      contents: [
        { peptideId: "bpc-157", mg: 5 },
        { peptideId: "tb-500", mg: 5 },
      ],
    },
  },
  {
    id: "cjc-1295-ipamorelin",
    name: "CJC-1295 + Ipamorelin",
    aliases: ["CJC/Ipa", "Mod GRF + Ipamorelin"],
    kind: "blend",
    status: { label: "Research compounds", tone: "research-only" },
    summary: "Two growth hormone releasers that work through different pathways, often sold pre-mixed.",
    components: [
      { peptideId: "cjc-1295", role: "GHRH analogue: amplifies GH pulses" },
      { peptideId: "ipamorelin", role: "Ghrelin mimic: triggers GH release" },
    ],
    whyCombined:
      "CJC-1295 acts like growth-hormone-releasing hormone, and ipamorelin acts on the ghrelin receptor. Stimulating both pathways at once releases more growth hormone than either alone, an effect seen in physiology studies of similar compounds.",
    evidence:
      "Limited: each has some human data on raising GH and IGF-1, but there are no trials of the combination for muscle, fat loss or recovery.",
    regulatory: "Not approved anywhere. Both are prohibited in sport by WADA.",
    risks: [
      "Each ingredient's own risks apply (see their library pages)",
      "Water retention, numbness or tingling, increased hunger",
      "Raised blood sugar with sustained high GH/IGF-1",
      "Mislabelled or contaminated products are a known problem with grey-market peptides",
    ],
    exampleVial: {
      totalMg: 10,
      contents: [
        { peptideId: "cjc-1295", mg: 5 },
        { peptideId: "ipamorelin", mg: 5 },
      ],
    },
  },
  {
    id: "cagrisema",
    name: "CagriSema",
    aliases: ["Cagrilintide + semaglutide"],
    kind: "combination",
    status: { label: "In clinical trials", tone: "investigational" },
    summary: "Novo Nordisk's experimental once-weekly combination of an amylin analogue and semaglutide for obesity.",
    components: [
      { peptideId: "cagrilintide", role: "Amylin analogue: fullness" },
      { peptideId: "semaglutide", role: "GLP-1 agonist: appetite and blood sugar" },
    ],
    whyCombined:
      "Amylin and GLP-1 reduce appetite through different signals in the brain, so combining them aims for more weight loss than either alone. Unlike seller-made blends, it is a single medicine being developed and tested in large trials.",
    evidence:
      "Moderate and growing: phase 3 trials (the REDEFINE programme) reported more weight loss than semaglutide alone.",
    regulatory: "Not yet approved; under regulatory review or in late-stage trials depending on the country.",
    risks: [
      "Nausea, vomiting, diarrhoea and constipation (common)",
      "The same warnings as semaglutide (see its library page)",
    ],
  },
];

export function findStack(id: string): Stack | undefined {
  return STACKS.find((s) => s.id === id);
}

/** Stacks that contain a given peptide. */
export function stacksWith(peptideId: string): Stack[] {
  return STACKS.filter((s) => s.components.some((c) => c.peptideId === peptideId));
}

/** Display name for a component (falls back to the id if the library entry is missing). */
export const componentName = (peptideId: string) => findPeptide(peptideId)?.name ?? peptideId;
