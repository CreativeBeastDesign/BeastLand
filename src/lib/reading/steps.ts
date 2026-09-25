// Pure step-state logic for `Stepper` — kept free of the DOM so it can be
// unit tested in isolation.

import type { StepState } from "./types.js";

/**
 * Resolves a step's visual/ARIA state: completed ids win over the current
 * id (a step can be marked both, e.g. while replaying a finished flow),
 * then the current id, else upcoming.
 */
export function stepState(id: string, current: string | undefined, completed: string[] = []): StepState {
  if (completed.includes(id)) return "complete";
  if (current !== undefined && id === current) return "current";
  return "upcoming";
}
