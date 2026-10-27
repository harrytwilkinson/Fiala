// Amino-acid sequences for library entries whose structure is well established, written in one-letter code
// from the N-terminus. "X" marks a non-standard residue, named in `x`. Entries with many non-standard or
// D-amino acids (e.g. leuprolide, octreotide) are left out rather than shown misleadingly.
// Check any addition against a primary source (UniProt, DrugBank or the drug's label).

export interface PeptideSequence {
  seq: string;
  /** What "X" stands for, when the sequence contains one. */
  x?: string;
  /** One plain-English line on what makes the structure notable. */
  note?: string;
}

export const SEQUENCES: Record<string, PeptideSequence> = {
  semaglutide: {
    seq: "HXEGTFTSDVSSYLEGQAAKEFIAWLVRGRG",
    x: "Aib (aminoisobutyric acid), which resists breakdown by the enzyme DPP-4",
    note: "The lysine at position 20 carries a fatty-acid chain that binds albumin in the blood, which is why one dose lasts about a week.",
  },
  tirzepatide: {
    seq: "YXEGTFTSDYSIXLDKIAQKAFVQWLIAGGPSSGAPPPS",
    x: "Aib (aminoisobutyric acid), which resists breakdown",
    note: "The lysine at position 20 carries a fatty-acid chain, stretching its half-life to about five days.",
  },
  liraglutide: {
    seq: "HAEGTFTSDVSSYLEGQAAKEFIAWLVRGRG",
    note: "Almost identical to human GLP-1. A fatty acid on the lysine at position 20 lets it bind albumin, so it lasts about a day.",
  },
  exenatide: {
    seq: "HGEGTFTSDLSKQMEEEAVRLFIEWLKNGGPSSGAPPPS",
    note: "A copy of exendin-4, first found in Gila monster saliva. The glycine at position 2 makes it resistant to DPP-4.",
  },
  lixisenatide: {
    seq: "HGEGTFTSDLSKQMEEEAVRLFIEWLKNGGPSSGAPPSKKKKKK",
    note: "Based on exendin-4 with a tail of six lysines added to the end.",
  },
  pramlintide: {
    seq: "KCNTATCATQRLANFLVHSSNNFGPILPPTNVGSNTY",
    note: "Human amylin with three prolines swapped in, which stops it clumping into fibres the way natural amylin can.",
  },
  glucagon: { seq: "HSQGTFTSDYSKYLDSRRAQDFVQWLMNT", note: "Identical to the hormone made by the pancreas." },
  teduglutide: {
    seq: "HGDGSFSDEMNTILDNLAARDFINWLIQTKITD",
    note: "Human GLP-2 with one change: glycine at position 2 instead of alanine, so it lasts longer in the body.",
  },
  secretin: { seq: "HSDGTFTSELSRLREGARLQRLLQGLV", note: "Identical to human secretin." },
  sincalide: {
    seq: "DYMGWMDF",
    note: "The last eight amino acids of cholecystokinin (CCK). The tyrosine carries a sulphate group it needs to work.",
  },
  "calcitonin-salmon": {
    seq: "CSNLSTCVLGKLSQELHKLQTYPRTNTGSGTP",
    note: "Salmon calcitonin is more potent in people than the human hormone. Cysteines 1 and 7 are bonded into a small ring.",
  },
  teriparatide: {
    seq: "SVSEIQLMHNLGKHLNSMERVEWLRKKLQDVHNF",
    note: "The first 34 amino acids of human parathyroid hormone, which carry its bone-building signal.",
  },
  linaclotide: {
    seq: "CCEYCCNPACTGCY",
    note: "Six cysteines form three internal bonds, folding it into a compact knot that survives the gut.",
  },
  plecanatide: {
    seq: "NDECELCVNVACTGCL",
    note: "Modelled on uroguanylin, a natural gut hormone; two internal bonds hold its shape.",
  },
  enfuvirtide: { seq: "YTSLIHSLIEESQNQQEKNEQELLELDKWASLWNWF", note: "Copies part of HIV's own gp41 protein, jamming the step the virus uses to fuse with cells." },
  ziconotide: {
    seq: "CKGKGAKCSRLMYDCCTGSCRSGKC",
    note: "A copy of a cone snail toxin. Six cysteines lock it into a rigid knot that fits calcium channels.",
  },
  nesiritide: { seq: "SPKMVQGSGCFGRKMDRISSSSGLGCKVLRRH", note: "Identical to human B-type natriuretic peptide; cysteines 10 and 26 close a 17-residue ring." },
  "angiotensin-ii": { seq: "DRVYIHPF", note: "Identical to the body's own angiotensin II." },
  vasopressin: { seq: "CYFQNCPRG", note: "Cysteines 1 and 6 bond to close a six-residue ring, the same shape as oxytocin with two swaps." },
  terlipressin: { seq: "GGGCYFQNCPKG", note: "Three glycines on the front are clipped off in the body, slowly releasing the active drug." },
  oxytocin: { seq: "CYIQNCPLG", note: "Cysteines 1 and 6 bond to each other, closing the first six residues into a ring." },
  cosyntropin: { seq: "SYSMEHFRWGKPVGKKRRPVKVYP", note: "The first 24 amino acids of ACTH, which hold all of its activity." },
  corticotropin: { seq: "SYSMEHFRWGKPVGKKRRPVKVYPNGAEDESAEAFPLEF", note: "Full-length ACTH (39 amino acids)." },
  vosoritide: {
    seq: "PGQEHPNARKYKGANKKGLSKGCFGLKLDRIGSMSGLGC",
    note: "A longer version of C-type natriuretic peptide, built to resist the enzyme that normally clears it within minutes.",
  },
  sermorelin: { seq: "YADAIFTNSYRKVLGQLSARKLLQDIMSR", note: "The first 29 amino acids of growth hormone-releasing hormone (GHRH), the shortest fully active piece." },
  tesamorelin: {
    seq: "YADAIFTNSYRKVLGQLSARKLLQDIMSRQQGESNQERGARARL",
    note: "Full-length human GHRH with a small fatty group on the front end that protects it from breakdown.",
  },
  "thymosin-alpha-1": { seq: "SDAAVDTSSEITTKDLKEKKEVVEEAEN", note: "Identical to the natural thymus peptide; the front end is acetylated." },
  "thymosin-beta-4": { seq: "SDKPDMAEIEKFDKSKLKKTETQEKNPLPSKETIEQEKQAGES", note: "The stretch LKKTETQ (positions 17 to 23) is the actin-binding region that TB-500 is based on." },
  "bpc-157": { seq: "GEPPPGKPADDAGLV", note: "Four prolines make this chain unusually rigid. It is a fragment of a protein found in gastric juice." },
  "ghk-cu": { seq: "GHK", note: "Just three amino acids. Glycine and histidine grip a copper ion between them, and the copper is key to its effect." },
  epitalon: { seq: "AEDG", note: "A four-amino-acid synthetic peptide based on a pineal gland extract." },
  selank: { seq: "TKPRPGP", note: "Tuftsin (TKPR), an immune peptide, with PGP added to make it more stable." },
  semax: { seq: "MEHFPGP", note: "A fragment of ACTH (MEHF) with PGP added to make it more stable." },
  kpv: { seq: "KPV", note: "The last three amino acids of alpha-MSH, which carry its anti-inflammatory effect." },
  "kisspeptin-10": { seq: "YNWNSFGLRF", note: "The last ten amino acids of kisspeptin, enough to switch on its receptor." },
  dsip: { seq: "WAGGDASGE", note: "Delta sleep-inducing peptide, first isolated from rabbits." },
  "ll-37": { seq: "LLGDFFRKSKEKIGKEFKRIVQRIKDFLRNLVPRTES", note: "Named for its first two leucines and 37 residues. Its many positive charges let it punch holes in bacterial membranes." },
  "mots-c": { seq: "MRWQEMGYIFYPRKLR", note: "Encoded by the DNA inside mitochondria rather than in the cell nucleus." },
  humanin: { seq: "MAPRGFSCLLLLTSEIDLPVKRRA", note: "Also encoded by mitochondrial DNA; named for its protective effect on human brain cells in lab studies." },
  larazotide: { seq: "GGVLVQPG", note: "Designed from a protein made by the cholera bacterium, which affects tight junctions in the gut lining." },
  davunetide: { seq: "NAPVSIPQ", note: "An eight-amino-acid piece of ADNP, a protein that helps stabilise the skeleton of nerve cells." },
  vip: { seq: "HSDAVFTDNYTRLRKQMAVKKYLNSILN", note: "Identical to human vasoactive intestinal peptide (sold as aviptadil)." },
  thymulin: { seq: "XAKSQGGSN", x: "Pyroglutamic acid, a ring-closed form of glutamine", note: "It only works when holding a zinc ion." },
  gonadorelin: {
    seq: "XHWSYGLRPG",
    x: "Pyroglutamic acid, a ring-closed form of glutamine",
    note: "Identical to natural GnRH. Drugs like leuprolide and triptorelin are modified versions of this chain.",
  },
  glutathione: {
    seq: "ECG",
    note: "Glutamate, cysteine and glycine. The glutamate is linked through its side chain, an unusual bond that protects it from normal digestion enzymes.",
  },
  "acetyl-hexapeptide-8": { seq: "EEMQRR", note: "Copies the end of SNAP-25, a protein nerves use to release signals to muscles." },
  "acetyl-octapeptide-3": { seq: "EEMQRRAD", note: "Acetyl hexapeptide-8 (Argireline) with two amino acids added." },
  "palmitoyl-pentapeptide-4": { seq: "KTTKS", note: "A fragment of type I collagen, with a fatty palmitoyl group added to help it into skin." },
  "palmitoyl-tripeptide-1": { seq: "GHK", note: "The same three amino acids as GHK-Cu, with a palmitoyl group instead of copper." },
  "palmitoyl-tetrapeptide-7": { seq: "GQPR", note: "A short fragment of an immune protein, with a palmitoyl group for skin penetration." },
  "palmitoyl-hexapeptide-12": { seq: "VGVAPG", note: "A repeating motif from elastin, the protein that gives skin its spring." },
};

export type ResidueClass = "hydrophobic" | "polar" | "positive" | "negative" | "special" | "modified";

export const RESIDUE_CLASS: Record<string, ResidueClass> = {
  A: "hydrophobic", V: "hydrophobic", L: "hydrophobic", I: "hydrophobic", M: "hydrophobic", F: "hydrophobic", W: "hydrophobic",
  Y: "polar", S: "polar", T: "polar", N: "polar", Q: "polar", C: "polar",
  K: "positive", R: "positive", H: "positive",
  D: "negative", E: "negative",
  G: "special", P: "special",
  X: "modified",
};

export const CLASS_LABEL: Record<ResidueClass, string> = {
  hydrophobic: "Water-avoiding",
  polar: "Water-loving",
  positive: "Positively charged",
  negative: "Negatively charged",
  special: "Flexible or structural",
  modified: "Non-standard",
};

export const AMINO_ACID: Record<string, string> = {
  A: "Alanine", V: "Valine", L: "Leucine", I: "Isoleucine", M: "Methionine", F: "Phenylalanine", W: "Tryptophan",
  Y: "Tyrosine", S: "Serine", T: "Threonine", N: "Asparagine", Q: "Glutamine", C: "Cysteine",
  K: "Lysine", R: "Arginine", H: "Histidine", D: "Aspartic acid", E: "Glutamic acid", G: "Glycine", P: "Proline",
  X: "Non-standard residue",
};
