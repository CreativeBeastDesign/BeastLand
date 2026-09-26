// Shared types for the reading (long-form / case study) components.

export type HeadingLevel = 2 | 3 | 4 | 5 | 6;
export type MetricData = { label: string; value: string; detail?: string };
export type OutlineEntry = { id: string; label: string; level: number; number?: string };
export type StackGroup = { category: string; items: string[]; note?: string; section?: string };
export type PipelineStep = { label: string; detail?: string; muted?: boolean };
export type Step = { id: string; label: string; detail?: string };
export type StepState = "complete" | "current" | "upcoming";
export type DecisionStatus = "proposed" | "accepted" | "final" | "rejected" | "superseded" | "deprecated";
export type Alternative = { option: string; rejectedBecause: string };
export type TreeNode = {
  id: string;
  label: string;
  note?: string;
  children?: TreeNode[];
  open?: boolean;
  disabled?: boolean;
};
export type CaseSummary = {
  slug: string;
  href?: string;
  title: string;
  standfirst: string;
  tags: string[];
  metric?: MetricData;
};
export type CalloutTone = "neutral" | "accent" | "info" | "success" | "warning" | "danger";

export function clampHeading(level: number): HeadingLevel {
  return Math.min(6, Math.max(2, Math.round(level))) as HeadingLevel;
}

// Benchmark (small multiples comparing build variants across metrics with
// different units — see components/organisms/Benchmark.svelte).
export type BenchmarkVariant = { id: string; label: string };
export type BenchmarkMetric = {
  id: string;
  label: string;
  unit?: string;
  /** Numeric: which direction is better. Yes/no facts: "higher" → yes is good, "lower" → no is good. */
  better?: "lower" | "higher";
  scale?: "linear" | "log";
  format?: (value: number) => string;
  values: Record<string, number | boolean | string | null>;
};
