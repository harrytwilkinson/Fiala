import type { TitrationProduct } from "../data/titration";
import { addDays, daysBetween, localDateKey } from "./dates";
import { createCollection } from "./store";

// Where someone is on their product's label schedule. Steps only move when the user says their prescriber has
// moved them on; Fiala never advances a plan by itself.

export interface TitrationPlan {
  id: string;
  productId: string;
  /** Index into the product's steps. */
  stepIndex: number;
  /** Local date the current step started. */
  stepStartedOn: string;
  /** Earlier steps, oldest first. */
  history: { stepIndex: number; startedOn: string }[];
}

export const titrations = createCollection<TitrationPlan>("fiala:titrations:v1", (items) => [...items]);
export const useTitrations = () => titrations.use();

export interface TitrationStatus {
  weeksOnStep: number;
  /** Earliest date the label allows the next step; undefined on the last step. */
  earliestNext?: string;
  /** True once the minimum time on this step has passed. */
  nextAllowed: boolean;
  isLast: boolean;
}

export function titrationStatus(plan: TitrationPlan, product: TitrationProduct, today = localDateKey()): TitrationStatus {
  const step = product.steps[plan.stepIndex];
  const days = Math.max(0, daysBetween(plan.stepStartedOn, today));
  const isLast = plan.stepIndex >= product.steps.length - 1 || step?.minWeeks === undefined;
  const earliestNext = isLast ? undefined : addDays(plan.stepStartedOn, step.minWeeks! * 7);
  return {
    weeksOnStep: Math.floor(days / 7),
    earliestNext,
    nextAllowed: !!earliestNext && daysBetween(earliestNext, today) >= 0,
    isLast,
  };
}

/** Move a plan to another step (up or down), keeping the history. */
export function moveToStep(plan: TitrationPlan, stepIndex: number, on = localDateKey()): TitrationPlan {
  return {
    ...plan,
    stepIndex,
    stepStartedOn: on,
    history: [...plan.history, { stepIndex: plan.stepIndex, startedOn: plan.stepStartedOn }],
  };
}
