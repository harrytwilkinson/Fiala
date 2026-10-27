import { describe, expect, it } from "vitest";
import { PEPTIDES, findPeptide } from "./peptides";
import { STAGED_IDS, researchStage } from "./researchStage";
import { RESIDUE_CLASS, SEQUENCES } from "./sequences";

describe("sequences", () => {
  it("only cover library entries", () => {
    for (const id of Object.keys(SEQUENCES)) expect(findPeptide(id), id).toBeDefined();
  });

  it("use one-letter codes, and name X wherever it appears", () => {
    for (const [id, s] of Object.entries(SEQUENCES)) {
      for (const c of s.seq) expect(RESIDUE_CLASS[c], `${id}: ${c}`).toBeDefined();
      expect(s.seq.includes("X"), id).toBe(!!s.x);
    }
  });

  it("match known lengths", () => {
    expect(SEQUENCES.semaglutide.seq).toHaveLength(31);
    expect(SEQUENCES.tirzepatide.seq).toHaveLength(39);
    expect(SEQUENCES.exenatide.seq).toHaveLength(39);
    expect(SEQUENCES["bpc-157"].seq).toHaveLength(15);
    expect(SEQUENCES["ll-37"].seq).toHaveLength(37);
    expect(SEQUENCES["thymosin-beta-4"].seq).toHaveLength(43);
    expect(SEQUENCES.tesamorelin.seq).toHaveLength(44);
  });
});

describe("research stage", () => {
  it("gives every unapproved entry an explicit stage", () => {
    const unapproved = PEPTIDES.filter((p) => p.status !== "approved" && p.status !== "approved-elsewhere").map((p) => p.id);
    expect([...unapproved].sort()).toEqual([...STAGED_IDS].sort());
  });

  it("puts approved medicines at the top", () => {
    expect(researchStage(findPeptide("semaglutide")!)).toBe(5);
    expect(researchStage(findPeptide("bpc-157")!)).toBe(2);
  });
});
