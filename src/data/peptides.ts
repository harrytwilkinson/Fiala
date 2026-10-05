// Educational reference content. Keep entries factual, cite the general state
// of evidence, and avoid dosing recommendations — the app's calculator does
// math on whatever dose the user (and their clinician) has decided on.
//
// Regulatory status changes; review this file periodically.

export type Category =
  | "Metabolic & weight"
  | "Growth hormone axis"
  | "Tissue repair"
  | "Skin & cosmetic"
  | "Sexual health"
  | "Cognitive & mood"
  | "Longevity & immune";

export type ApprovalStatus = "approved" | "approved-elsewhere" | "investigational" | "research-only";

export interface Peptide {
  id: string;
  name: string;
  aliases: string[];
  category: Category;
  status: ApprovalStatus;
  /** One-line summary for list views. */
  summary: string;
  /** What people commonly use or study it for. */
  commonUses: string[];
  /** How it works in the body, in plain language. */
  mechanism: string;
  /** Short description of how strong the evidence is. */
  evidence: string;
  regulatory: string;
  sideEffects: string[];
  /** Typical lyophilized-storage / reconstituted-storage notes. */
  storage?: string;
}

export const STATUS_LABEL: Record<ApprovalStatus, string> = {
  approved: "FDA-approved drug",
  "approved-elsewhere": "Approved outside the US",
  investigational: "In clinical trials",
  "research-only": "Research compound",
};

const STANDARD_STORAGE =
  "Unreconstituted (powder) vials are usually kept refrigerated or frozen and away from light. Once mixed with bacteriostatic water, keep refrigerated and do not freeze; follow the supplier's stated beyond-use date.";

export const PEPTIDES: Peptide[] = [
  {
    id: "semaglutide",
    name: "Semaglutide",
    aliases: ["Ozempic", "Wegovy", "Rybelsus"],
    category: "Metabolic & weight",
    status: "approved",
    summary: "Once-weekly GLP-1 receptor agonist for type 2 diabetes and chronic weight management.",
    commonUses: ["Type 2 diabetes (blood-sugar control)", "Chronic weight management", "Cardiovascular risk reduction in eligible patients"],
    mechanism:
      "Mimics the gut hormone GLP-1. It increases glucose-dependent insulin release, reduces glucagon, slows stomach emptying and acts on appetite centres in the brain, which lowers hunger and food intake. A fatty-acid side chain lets it bind albumin, giving it a half-life of about a week.",
    evidence: "Strong: multiple large randomized controlled trials (SUSTAIN, STEP, SELECT programs).",
    regulatory: "FDA-approved as Ozempic and Rybelsus (diabetes) and Wegovy (weight management). Compounded versions are subject to changing FDA rules.",
    sideEffects: [
      "Nausea, vomiting, diarrhea, constipation (most common, usually during dose increases)",
      "Gallbladder problems and pancreatitis (uncommon)",
      "Boxed warning: thyroid C-cell tumors in rodents; contraindicated with a personal/family history of medullary thyroid cancer or MEN2",
      "Low blood sugar when combined with insulin or sulfonylureas",
    ],
    storage: "Branded pens: refrigerate before first use. Compounded vials: follow pharmacy guidance.",
  },
  {
    id: "tirzepatide",
    name: "Tirzepatide",
    aliases: ["Mounjaro", "Zepbound"],
    category: "Metabolic & weight",
    status: "approved",
    summary: "Once-weekly dual GIP and GLP-1 receptor agonist for type 2 diabetes and weight management.",
    commonUses: ["Type 2 diabetes", "Chronic weight management", "Obstructive sleep apnea in adults with obesity"],
    mechanism:
      "Activates both GIP and GLP-1 receptors. Together these boost insulin secretion when glucose is high, reduce appetite and slow gastric emptying. In trials it produced greater average weight loss than GLP-1-only agonists.",
    evidence: "Strong: large randomized controlled trials (SURPASS, SURMOUNT programs).",
    regulatory: "FDA-approved as Mounjaro (diabetes) and Zepbound (weight management, sleep apnea).",
    sideEffects: [
      "Nausea, diarrhea, vomiting, constipation, reduced appetite",
      "Gallbladder disease and pancreatitis (uncommon)",
      "Boxed warning for thyroid C-cell tumors (same class warning as semaglutide)",
      "May reduce effectiveness of oral contraceptives during dose changes",
    ],
  },
  {
    id: "retatrutide",
    name: "Retatrutide",
    aliases: ["LY3437943"],
    category: "Metabolic & weight",
    status: "investigational",
    summary: "Experimental triple GIP / GLP-1 / glucagon receptor agonist being studied for obesity.",
    commonUses: ["Obesity and weight loss (clinical trials)", "Type 2 diabetes and fatty liver disease (clinical trials)"],
    mechanism:
      "Adds glucagon-receptor activity to GIP and GLP-1 agonism. Glucagon signalling is thought to increase energy expenditure and liver fat burning, on top of the appetite and insulin effects of the other two pathways.",
    evidence: "Moderate and growing: phase 2 results showed large weight reductions; phase 3 trials are ongoing.",
    regulatory: "Not approved. Products sold online as \"research peptides\" are unregulated.",
    sideEffects: ["Gastrointestinal effects similar to other incretin drugs", "Increased heart rate observed in trials", "Long-term safety not yet established"],
  },
  {
    id: "aod-9604",
    name: "AOD-9604",
    aliases: ["hGH fragment 176-191 (modified)"],
    category: "Metabolic & weight",
    status: "research-only",
    summary: "Modified fragment of human growth hormone once developed as an anti-obesity drug.",
    commonUses: ["Fat loss (popular use)", "Joint and cartilage repair (limited research)"],
    mechanism:
      "Based on the C-terminal end of growth hormone, the region thought to drive fat breakdown (lipolysis). It was designed to keep this effect without growth hormone's impact on blood sugar or IGF-1.",
    evidence: "Weak: human trials did not show meaningful weight loss versus placebo, and development as an obesity drug was stopped.",
    regulatory: "Not approved as a drug in the US.",
    sideEffects: ["Injection-site reactions", "Headache", "Limited long-term human safety data"],
    storage: STANDARD_STORAGE,
  },
  {
    id: "tesamorelin",
    name: "Tesamorelin",
    aliases: ["Egrifta"],
    category: "Growth hormone axis",
    status: "approved",
    summary: "GHRH analog approved to reduce excess abdominal fat in people with HIV-associated lipodystrophy.",
    commonUses: ["HIV-associated abdominal fat (approved use)", "Visceral fat reduction and body composition (off-label interest)"],
    mechanism:
      "A stabilized version of growth hormone–releasing hormone (GHRH). It signals the pituitary to release more of the body's own growth hormone in natural pulses, which raises IGF-1 and preferentially reduces visceral (deep belly) fat.",
    evidence: "Strong for its approved indication (randomized controlled trials).",
    regulatory: "FDA-approved as Egrifta for HIV-associated lipodystrophy.",
    sideEffects: ["Joint pain, muscle aches, swelling", "Injection-site reactions", "Raised blood sugar", "Not for use in pregnancy"],
  },
  {
    id: "sermorelin",
    name: "Sermorelin",
    aliases: ["GRF 1-29", "Geref"],
    category: "Growth hormone axis",
    status: "research-only",
    summary: "Short GHRH fragment that stimulates natural growth hormone release.",
    commonUses: ["Growth hormone deficiency (historic approved use in children)", "Anti-aging and sleep/recovery (popular use)"],
    mechanism:
      "Consists of the first 29 amino acids of GHRH — the active portion. It prompts the pituitary to release growth hormone, which preserves the body's normal feedback loops. Its effect is short-lived.",
    evidence: "Moderate for GH deficiency in children; limited for anti-aging uses in adults.",
    regulatory: "Was FDA-approved (Geref) but the branded product was discontinued by its manufacturer. Now mainly available through compounding pharmacies.",
    sideEffects: ["Injection-site pain, redness or swelling", "Flushing, headache", "Dizziness"],
    storage: STANDARD_STORAGE,
  },
  {
    id: "cjc-1295",
    name: "CJC-1295",
    aliases: ["CJC-1295 with DAC", "Mod GRF 1-29 (no DAC)"],
    category: "Growth hormone axis",
    status: "research-only",
    summary: "Long-acting GHRH analog, often paired with ipamorelin in popular protocols.",
    commonUses: ["Raising growth hormone and IGF-1", "Body composition, recovery and sleep (popular use)"],
    mechanism:
      "A modified GHRH analog. The \"DAC\" (drug affinity complex) version binds to albumin in the blood, extending its action to several days; the version without DAC (Mod GRF 1-29) is short-acting. Both stimulate pituitary growth hormone release.",
    evidence: "Limited: small early-phase human studies showed sustained rises in GH and IGF-1; clinical development was discontinued.",
    regulatory: "Not approved. Prohibited in sport by WADA.",
    sideEffects: ["Injection-site reactions", "Flushing, headache", "Water retention", "Theoretical risks of chronically elevated GH/IGF-1"],
    storage: STANDARD_STORAGE,
  },
  {
    id: "ipamorelin",
    name: "Ipamorelin",
    aliases: [],
    category: "Growth hormone axis",
    status: "research-only",
    summary: "Selective growth hormone secretagogue (ghrelin-receptor agonist).",
    commonUses: ["Raising growth hormone (popular use, often with CJC-1295)", "Postoperative ileus (studied in clinical trials)"],
    mechanism:
      "Activates the ghrelin receptor (GHS-R1a) in the pituitary, triggering a pulse of growth hormone. It is considered more selective than older secretagogues, with less effect on cortisol and prolactin.",
    evidence: "Limited: animal data and small human trials; a phase 2 trial for postoperative ileus did not meet its goals.",
    regulatory: "Not approved. Prohibited in sport by WADA.",
    sideEffects: ["Increased hunger", "Headache, flushing", "Injection-site reactions"],
    storage: STANDARD_STORAGE,
  },
  {
    id: "bpc-157",
    name: "BPC-157",
    aliases: ["Body Protection Compound-157"],
    category: "Tissue repair",
    status: "research-only",
    summary: "Synthetic 15-amino-acid peptide studied in animals for tendon, ligament and gut healing.",
    commonUses: ["Tendon, ligament and muscle injuries (popular use)", "Gut lining and inflammatory bowel conditions (animal research)"],
    mechanism:
      "Derived from a protein found in gastric juice. Animal studies suggest it promotes new blood-vessel growth (angiogenesis), interacts with the nitric-oxide system and growth-factor signalling, and speeds healing of several tissue types.",
    evidence: "Weak in humans: most data come from rodent studies, largely from one research group; very few published human studies.",
    regulatory: "Not approved. FDA has listed it among bulk substances that raise significant safety concerns for compounding. Prohibited in sport by WADA.",
    sideEffects: ["Injection-site reactions", "Unknown long-term effects", "Theoretical concern about promoting blood-vessel growth in existing tumors"],
    storage: STANDARD_STORAGE,
  },
  {
    id: "tb-500",
    name: "TB-500",
    aliases: ["Thymosin Beta-4 (fragment)"],
    category: "Tissue repair",
    status: "research-only",
    summary: "Synthetic peptide based on thymosin beta-4, studied for wound and soft-tissue repair.",
    commonUses: ["Soft-tissue and muscle injury recovery (popular use)", "Wound healing (research)"],
    mechanism:
      "Thymosin beta-4 is a natural protein that binds actin, a building block of the cell skeleton. This helps cells migrate to injured areas, and research links it to new blood-vessel formation and reduced inflammation. TB-500 products are typically a short active fragment or synthetic version.",
    evidence: "Weak in humans: mostly animal and cell studies; some small human trials of full thymosin beta-4 for wounds and eye conditions.",
    regulatory: "Not approved. FDA has flagged it for compounding safety concerns. Prohibited in sport by WADA.",
    sideEffects: ["Injection-site reactions", "Fatigue, headache", "Unknown long-term effects"],
    storage: STANDARD_STORAGE,
  },
  {
    id: "ghk-cu",
    name: "GHK-Cu",
    aliases: ["Copper peptide", "Copper tripeptide-1"],
    category: "Skin & cosmetic",
    status: "research-only",
    summary: "Naturally occurring copper-binding tripeptide widely used in skincare.",
    commonUses: ["Skin firmness, fine lines and wound healing (topical)", "Hair growth (topical, limited evidence)"],
    mechanism:
      "GHK is found naturally in blood plasma and declines with age. Bound to copper, it is thought to stimulate collagen and elastin production, support skin remodelling and have antioxidant and anti-inflammatory effects.",
    evidence: "Moderate for topical cosmetic use in small studies; very limited for injected use.",
    regulatory: "Common cosmetic ingredient in topical products. Injectable forms are not approved.",
    sideEffects: ["Skin irritation (topical)", "Injection-site reactions and pain (injected)", "Copper excess is a theoretical concern at high amounts"],
    storage: STANDARD_STORAGE,
  },
  {
    id: "pt-141",
    name: "PT-141",
    aliases: ["Bremelanotide", "Vyleesi"],
    category: "Sexual health",
    status: "approved",
    summary: "Melanocortin receptor agonist approved for low sexual desire in premenopausal women.",
    commonUses: ["Hypoactive sexual desire disorder in premenopausal women (approved use)", "Low libido or erectile difficulties (off-label interest)"],
    mechanism:
      "Activates melanocortin receptors (mainly MC4R) in the brain involved in sexual arousal and desire. Unlike PDE5 inhibitors such as sildenafil, it acts on the nervous system rather than on blood flow.",
    evidence: "Moderate: phase 3 trials (RECONNECT) showed modest improvements in desire versus placebo.",
    regulatory: "FDA-approved as Vyleesi (as-needed autoinjector) for HSDD in premenopausal women.",
    sideEffects: ["Nausea (common)", "Flushing, headache", "Temporary rise in blood pressure", "Darkening of skin or gums with repeated use"],
  },
  {
    id: "melanotan-ii",
    name: "Melanotan II",
    aliases: ["MT-2", "MT-II"],
    category: "Skin & cosmetic",
    status: "research-only",
    summary: "Non-selective melanocortin agonist used unofficially for tanning.",
    commonUses: ["Skin tanning (popular use)", "Libido (side effect that led to PT-141)"],
    mechanism:
      "Activates several melanocortin receptors. Stimulating MC1R increases melanin production (tanning), while effects on MC3R/MC4R influence appetite and sexual function.",
    evidence: "Limited: small early studies; no approved medical use.",
    regulatory: "Not approved. Health regulators in several countries have issued public warnings against its use.",
    sideEffects: [
      "Nausea, flushing, reduced appetite",
      "New or darkening moles — have changing moles checked by a doctor",
      "Spontaneous erections / priapism",
      "Unknown long-term skin-cancer risk",
    ],
    storage: STANDARD_STORAGE,
  },
  {
    id: "semax",
    name: "Semax",
    aliases: ["ACTH(4-10) analog"],
    category: "Cognitive & mood",
    status: "approved-elsewhere",
    summary: "Synthetic ACTH fragment used in Russia for stroke recovery and cognition.",
    commonUses: ["Stroke and brain-injury recovery (Russia)", "Focus, memory and mental performance (popular use)"],
    mechanism:
      "A modified fragment of adrenocorticotropic hormone that does not stimulate the adrenal glands. Research suggests it increases brain-derived neurotrophic factor (BDNF) and influences dopamine and serotonin signalling.",
    evidence: "Limited outside Russia: most studies are Russian-language and small.",
    regulatory: "Approved in Russia and some neighbouring countries (usually as a nasal spray). Not approved in the US or EU.",
    sideEffects: ["Nasal irritation", "Headache", "Limited safety data outside Russian studies"],
  },
  {
    id: "selank",
    name: "Selank",
    aliases: [],
    category: "Cognitive & mood",
    status: "approved-elsewhere",
    summary: "Synthetic tuftsin analog studied as an anti-anxiety agent.",
    commonUses: ["Anxiety (Russia)", "Stress resilience and focus (popular use)"],
    mechanism:
      "Based on tuftsin, a small immune peptide. It appears to modulate GABA signalling and the breakdown of enkephalins (natural pain/mood peptides), producing calming effects without strong sedation in studies.",
    evidence: "Limited: mostly small Russian studies.",
    regulatory: "Approved in Russia. Not approved in the US or EU.",
    sideEffects: ["Nasal irritation", "Fatigue", "Limited long-term data"],
  },
  {
    id: "epitalon",
    name: "Epitalon",
    aliases: ["Epithalon", "AEDG peptide"],
    category: "Longevity & immune",
    status: "research-only",
    summary: "Synthetic four-amino-acid peptide researched for anti-aging effects.",
    commonUses: ["Longevity and anti-aging (popular use)", "Sleep and circadian rhythm (research)"],
    mechanism:
      "Modelled on epithalamin, an extract of the pineal gland. Laboratory studies report effects on telomerase activity and melatonin production, though how this translates to people is unclear.",
    evidence: "Weak: mostly cell, animal and small human studies from a single research group.",
    regulatory: "Not approved.",
    sideEffects: ["Injection-site reactions", "Long-term effects unknown"],
    storage: STANDARD_STORAGE,
  },
  {
    id: "mots-c",
    name: "MOTS-c",
    aliases: [],
    category: "Longevity & immune",
    status: "research-only",
    summary: "Mitochondria-derived peptide studied for metabolism and exercise capacity.",
    commonUses: ["Metabolic health and insulin sensitivity (research)", "Exercise performance (popular use)"],
    mechanism:
      "Encoded in mitochondrial DNA. In animal studies it activates AMPK, a cellular energy sensor, improving glucose uptake and insulin sensitivity and acting somewhat like an \"exercise mimetic\".",
    evidence: "Weak in humans: promising animal data, minimal human trials.",
    regulatory: "Not approved. Prohibited in sport by WADA.",
    sideEffects: ["Injection-site reactions", "Long-term effects unknown"],
    storage: STANDARD_STORAGE,
  },
  {
    id: "thymosin-alpha-1",
    name: "Thymosin Alpha-1",
    aliases: ["Thymalfasin", "Zadaxin", "Tα1"],
    category: "Longevity & immune",
    status: "approved-elsewhere",
    summary: "Thymus-derived immune-modulating peptide approved in several countries.",
    commonUses: ["Chronic hepatitis B and C (approved in some countries)", "Immune support (popular use)"],
    mechanism:
      "A natural peptide produced by the thymus. It enhances T-cell maturation and function and modulates immune signalling (including toll-like receptors), helping the immune system respond to infections.",
    evidence: "Moderate: clinical trials for hepatitis and as a vaccine adjunct; mixed results in other conditions.",
    regulatory: "Approved as Zadaxin in a number of countries outside the US. Not FDA-approved.",
    sideEffects: ["Injection-site discomfort", "Generally well tolerated in trials"],
    storage: STANDARD_STORAGE,
  },
];

export const CATEGORIES: Category[] = [...new Set(PEPTIDES.map((p) => p.category))];

export function findPeptide(id: string): Peptide | undefined {
  return PEPTIDES.find((p) => p.id === id);
}
