import { PEPTIDES, findPeptide } from "../data/peptides";
import { STACKS, findStack } from "../data/stacks";

export const CUSTOM_PEPTIDE = "__custom__";

export interface PeptideChoice {
  /** Library id, CUSTOM_PEPTIDE, or "" when nothing is chosen. */
  selected: string;
  customName: string;
}

/** Stacks are offered as "stack:<id>"; they're saved by name, like a custom entry. */
const STACK_PREFIX = "stack:";
const stackFor = (value: string) => (value.startsWith(STACK_PREFIX) ? findStack(value.slice(STACK_PREFIX.length)) : undefined);

export function emptyChoice(peptideId?: string | null): PeptideChoice {
  const known = peptideId && (findPeptide(peptideId) || stackFor(peptideId));
  return { selected: known ? peptideId : "", customName: "" };
}

export function choiceName(c: PeptideChoice): string {
  if (c.selected === CUSTOM_PEPTIDE) return c.customName.trim();
  return stackFor(c.selected)?.name ?? findPeptide(c.selected)?.name ?? "";
}

/** Library peptide id, or null for custom entries and stacks. */
export function choiceId(c: PeptideChoice): string | null {
  return c.selected && c.selected !== CUSTOM_PEPTIDE && !stackFor(c.selected) ? c.selected : null;
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
          <optgroup label="Peptides">
            {[...PEPTIDES]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </optgroup>
          <optgroup label="Stacks & blends">
            {STACKS.map((s) => (
              <option key={s.id} value={`${STACK_PREFIX}${s.id}`}>
                {s.name}
              </option>
            ))}
          </optgroup>
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
