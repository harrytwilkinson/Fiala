// Dose-escalation steps exactly as printed in each product's US prescribing information (label). Fiala shows
// where someone is on their prescribed product's label schedule; it never suggests moving on. Prescribers often
// keep people on a step longer, or at a lower maintenance dose. Re-check these against the current labels when
// they are revised.

export interface TitrationStep {
  mg: number;
  /** Minimum weeks on this step before the label allows the next one; undefined for the last step. */
  minWeeks?: number;
}

export interface TitrationProduct {
  id: string;
  brand: string;
  peptideId: string;
  frequency: "weekly" | "daily";
  steps: TitrationStep[];
  /** One line on how the label describes the steps. */
  note: string;
}

export const TITRATION_PRODUCTS: TitrationProduct[] = [
  {
    id: "wegovy",
    brand: "Wegovy",
    peptideId: "semaglutide",
    frequency: "weekly",
    steps: [{ mg: 0.25, minWeeks: 4 }, { mg: 0.5, minWeeks: 4 }, { mg: 1, minWeeks: 4 }, { mg: 1.7, minWeeks: 4 }, { mg: 2.4 }],
    note: "The label raises the dose every 4 weeks to a maintenance dose, and allows delaying a step if side effects aren't tolerated.",
  },
  {
    id: "ozempic",
    brand: "Ozempic",
    peptideId: "semaglutide",
    frequency: "weekly",
    steps: [{ mg: 0.25, minWeeks: 4 }, { mg: 0.5, minWeeks: 4 }, { mg: 1, minWeeks: 4 }, { mg: 2 }],
    note: "The label starts at 0.25 mg for 4 weeks, then 0.5 mg. Higher steps are only for people who need more blood-sugar control, after at least 4 weeks on the current dose.",
  },
  {
    id: "zepbound",
    brand: "Zepbound",
    peptideId: "tirzepatide",
    frequency: "weekly",
    steps: [
      { mg: 2.5, minWeeks: 4 },
      { mg: 5, minWeeks: 4 },
      { mg: 7.5, minWeeks: 4 },
      { mg: 10, minWeeks: 4 },
      { mg: 12.5, minWeeks: 4 },
      { mg: 15 },
    ],
    note: "The label starts at 2.5 mg for 4 weeks, then 5 mg, with increases of 2.5 mg after at least 4 weeks on the current dose.",
  },
  {
    id: "mounjaro",
    brand: "Mounjaro",
    peptideId: "tirzepatide",
    frequency: "weekly",
    steps: [
      { mg: 2.5, minWeeks: 4 },
      { mg: 5, minWeeks: 4 },
      { mg: 7.5, minWeeks: 4 },
      { mg: 10, minWeeks: 4 },
      { mg: 12.5, minWeeks: 4 },
      { mg: 15 },
    ],
    note: "The label starts at 2.5 mg for 4 weeks, then 5 mg, with increases of 2.5 mg after at least 4 weeks on the current dose if more control is needed.",
  },
  {
    id: "saxenda",
    brand: "Saxenda",
    peptideId: "liraglutide",
    frequency: "daily",
    steps: [{ mg: 0.6, minWeeks: 1 }, { mg: 1.2, minWeeks: 1 }, { mg: 1.8, minWeeks: 1 }, { mg: 2.4, minWeeks: 1 }, { mg: 3 }],
    note: "The label raises the daily dose by 0.6 mg each week to 3 mg, and allows delaying a step by about a week if it isn't tolerated.",
  },
];

export const findTitrationProduct = (id: string) => TITRATION_PRODUCTS.find((p) => p.id === id);
