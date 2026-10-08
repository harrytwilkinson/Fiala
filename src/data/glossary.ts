// Plain-English glossary of terms used across the library, converter and tracker.

export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  /** Other spellings or abbreviations people search for. */
  aka?: string[];
}

export const GLOSSARY: GlossaryTerm[] = [
  { id: "agonist", term: "Agonist", definition: "A substance that switches a receptor on, mimicking a natural hormone or signal. Semaglutide is a GLP-1 receptor agonist." },
  { id: "amino-acid", term: "Amino acid", definition: "The building blocks of peptides and proteins. Peptides are short chains of amino acids; proteins are long ones." },
  { id: "analogue", term: "Analogue", definition: "A modified version of a natural molecule, changed to last longer or work more strongly. Tesamorelin is an analogue of growth-hormone-releasing hormone.", aka: ["Analog"] },
  { id: "bacteriostatic-water", term: "Bacteriostatic water", definition: "Sterile water with a small amount of benzyl alcohol that stops bacteria growing, so a mixed vial can be used more than once. Not the same as plain sterile water.", aka: ["BAC water"] },
  { id: "beyond-use-date", term: "Beyond-use date", definition: "The date after which a mixed (reconstituted) vial shouldn't be used, because the peptide may break down or the vial may become contaminated." },
  { id: "blend", term: "Blend", definition: "A vial that contains more than one peptide, such as GLOW. Every dose drawn from it contains all of them, in the same ratio." },
  { id: "compounding", term: "Compounding", definition: "When a pharmacy makes a version of a medicine itself instead of using a manufacturer's product. Rules on which substances can be compounded vary by country and change over time." },
  { id: "concentration", term: "Concentration", definition: "How much peptide is in each mL of liquid after mixing, in mg/mL. It equals the amount in the vial divided by the water added." },
  { id: "contraindication", term: "Contraindication", definition: "A reason not to use a medicine, such as a medical condition or another medicine that makes it unsafe." },
  { id: "glp-1", term: "GLP-1", definition: "Glucagon-like peptide-1, a gut hormone released after eating. It increases insulin when blood sugar is high, slows the stomach and reduces appetite. Drugs like semaglutide copy it.", aka: ["Glucagon-like peptide-1"] },
  { id: "gh-secretagogue", term: "Growth hormone secretagogue", definition: "Anything that makes the pituitary gland release growth hormone, such as ipamorelin, GHRP-2 or MK-677.", aka: ["GHS"] },
  { id: "half-life", term: "Half-life", definition: "How long it takes for the amount in the body to fall by half. A longer half-life usually means less frequent doses." },
  { id: "igf-1", term: "IGF-1", definition: "Insulin-like growth factor 1, made mainly by the liver in response to growth hormone. It drives many of growth hormone's effects on muscle and bone.", aka: ["Insulin-like growth factor 1"] },
  { id: "intramuscular", term: "Intramuscular (IM)", definition: "An injection into a muscle, such as the thigh or shoulder.", aka: ["IM"] },
  { id: "lyophilised", term: "Lyophilised", definition: "Freeze-dried. Many peptides come as a dry powder or 'cake' in the vial, which keeps them stable until water is added.", aka: ["Lyophilized", "Freeze-dried"] },
  { id: "mcg-mg", term: "mcg and mg", definition: "Units of weight. 1 mg (milligram) = 1,000 mcg (micrograms). Peptide doses are often in mcg; vial sizes are usually in mg.", aka: ["Microgram", "Milligram", "µg"] },
  { id: "off-label", term: "Off-label", definition: "Using an approved medicine for a condition, dose or group of people it isn't officially licensed for. Doctors can prescribe off-label, but the evidence is often weaker." },
  { id: "peptide", term: "Peptide", definition: "A short chain of amino acids, usually 2 to 50. Many hormones, such as insulin and oxytocin, are peptides." },
  { id: "phases", term: "Phase 1, 2 and 3 trials", definition: "The stages of testing a new medicine in people. Phase 1 checks safety in small groups, phase 2 tests whether it works and at what dose, and phase 3 compares it with existing treatment or placebo in large groups.", aka: ["Clinical trial phases"] },
  { id: "placebo", term: "Placebo", definition: "A dummy treatment with no active ingredient, used in trials to show whether a medicine works better than expectation alone." },
  { id: "rct", term: "Randomised controlled trial (RCT)", definition: "A study where people are randomly given the treatment or a comparison (often placebo). It is the strongest single type of evidence for whether a treatment works.", aka: ["RCT", "Randomized controlled trial"] },
  { id: "receptor", term: "Receptor", definition: "A protein on or in a cell that a hormone or drug binds to, triggering an effect. Each peptide works through specific receptors." },
  { id: "reconstitution", term: "Reconstitution", definition: "Mixing a freeze-dried powder with a liquid, usually bacteriostatic water, so it can be injected." },
  { id: "research-chemical", term: "Research chemical", definition: "A label sellers use for compounds that aren't approved as medicines. They aren't made or checked to medicine standards, so purity and contents can vary." },
  { id: "subcutaneous", term: "Subcutaneous (SC)", definition: "An injection into the fatty layer just under the skin, such as the belly or thigh. Most peptides are given this way.", aka: ["SC", "SubQ"] },
  { id: "u-100", term: "U-100 insulin syringe", definition: "A syringe marked in units, where 100 units = 1 mL. So 1 unit is 0.01 mL, whatever the syringe's total size (30, 50 or 100 units).", aka: ["Insulin syringe", "Units"] },
  { id: "wada", term: "WADA", definition: "The World Anti-Doping Agency, which publishes the list of substances banned in sport. Many peptides, including BPC-157 and growth hormone releasers, are on it.", aka: ["World Anti-Doping Agency"] },
];

export const sortedGlossary = () => [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term));
