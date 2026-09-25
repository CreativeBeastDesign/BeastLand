// Public surface of the `reading` slice — shared types plus the pure logic
// helpers behind the outline/tree/stepper components. No context API, no
// svelte/store: everything here is plain types and functions.

export type {
  HeadingLevel,
  MetricData,
  OutlineEntry,
  StackGroup,
  PipelineStep,
  Step,
  StepState,
  DecisionStatus,
  Alternative,
  TreeNode,
  CaseSummary,
  CalloutTone,
} from "./types.js";
export { clampHeading } from "./types.js";

export { collectOutline, activeEntry, scrollProgress, nearestScrollRoot, resolveSection } from "./outline.js";
export type { TreeGuide, TreeRow } from "./tree.js";
export { flattenTree } from "./tree.js";

export { stepState } from "./steps.js";
export { formatSectionNumber } from "./numbers.js";
