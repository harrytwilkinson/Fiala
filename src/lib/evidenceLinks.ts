// "Look up the evidence" links for a library entry. These are searches on
// official databases rather than hand-picked citations, so they stay current
// and never point at a paper we haven't checked. Kept free of app imports so
// the static page builder can use it too.

import type { Peptide } from "../data/peptides.ts";

export interface EvidenceLink {
  label: string;
  url: string;
  note: string;
}

/** Search words for names that are ambiguous on their own. */
const SEARCH_TERMS: Record<string, string> = {
  mgf: "mechano growth factor",
  "igf-1-des": "des(1-3) IGF-1",
  vip: "vasoactive intestinal peptide",
  kpv: "KPV peptide",
  "mk-677": "ibutamoren",
  dsip: "delta sleep-inducing peptide",
  "ll-37": "LL-37 cathelicidin",
  "ghk-cu": "GHK-Cu copper peptide",
  "tb-500": "thymosin beta-4",
  "pt-141": "bremelanotide",
  "aod-9604": "AOD9604",
};

export function searchTerm(p: Pick<Peptide, "id" | "name">): string {
  return SEARCH_TERMS[p.id] ?? p.name;
}

export function evidenceLinks(p: Pick<Peptide, "id" | "name" | "status">): EvidenceLink[] {
  const q = encodeURIComponent(searchTerm(p));
  const links: EvidenceLink[] = [
    { label: "Reviews on PubMed", url: `https://pubmed.ncbi.nlm.nih.gov/?term=${q}&filter=pubt.review`, note: "Summaries of the published research" },
    { label: "Clinical trials on PubMed", url: `https://pubmed.ncbi.nlm.nih.gov/?term=${q}&filter=pubt.clinicaltrial`, note: "Published studies in people" },
    { label: "ClinicalTrials.gov", url: `https://clinicaltrials.gov/search?intr=${q}`, note: "Registered trials, past and ongoing" },
  ];
  if (p.status === "approved" || p.status === "approved-elsewhere") {
    links.push(
      { label: "Prescribing information (DailyMed, US)", url: `https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=${q}`, note: "Official US label" },
      { label: "Patient leaflets (emc, UK)", url: `https://www.medicines.org.uk/emc/search?q=${q}`, note: "Official UK product information" },
    );
  }
  return links;
}
