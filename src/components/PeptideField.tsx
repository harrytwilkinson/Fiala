import { PEPTIDES, findPeptide } from "../data/peptides";

export const CUSTOM_PEPTIDE = "__custom__";

export interface PeptideChoice {
  /** Library id, CUSTOM_PEPTIDE, or "" when nothing is chosen. */
  selected: string;
  customName: string;
}

export function emptyChoice(peptideId?: string | null): PeptideChoice {
  return { selected: peptideId && findPeptide(peptideId) ? peptideId : "", customName: "" };
}

export function choiceName(c: PeptideChoice): string {
  return c.selected === CUSTOM_PEPTIDE ? c.customName.trim() : (findPeptide(c.selected)?.name ?? "");
}

export function choiceId(c: PeptideChoice): string | null {
  return c.selected && c.selected !== CUSTOM_PEPTIDE ? c.selected : null;
}

interface Props {
  value: PeptideChoice;
  onChange: (value: PeptideChoice) => void;
  label?: string;
}

/** Library peptide dropdown with an "Other" option for compounds not in the library. */
export function PeptideField({ value, onChange, label = "Peptide" }: Props) {
  return (
    <>
      <label>
        <span>{label}</span>
        <select value={value.selected} onChange={(e) => onChange({ ...value, selected: e.target.value })}>
          <option value="">Choose…</option>
          {[...PEPTIDES]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          <option value={CUSTOM_PEPTIDE}>Other / custom…</option>
        </select>
      </label>
      {value.selected === CUSTOM_PEPTIDE && (
        <label>
          <span>Name</span>
          <input value={value.customName} onChange={(e) => onChange({ ...value, customName: e.target.value })} placeholder="e.g. Kisspeptin" />
        </label>
      )}
    </>
  );
}
