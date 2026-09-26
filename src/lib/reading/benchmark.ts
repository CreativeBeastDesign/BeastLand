// Pure logic behind the Benchmark organism (small multiples comparing build
// variants across metrics with different units). No DOM, no Svelte — scale
// helpers and formatting only, so they're cheap to unit test on their own.

import type { BenchmarkMetric } from "./types.js";

export type ScaleFn = (value: number | null) => number;

function finiteValues(values: (number | null)[]): number[] {
  return values.filter((value): value is number => value !== null && Number.isFinite(value));
}

function domainMax(values: (number | null)[]): number {
  const nums = finiteValues(values);
  const max = nums.length ? Math.max(0, ...nums) : 0;
  return max > 0 ? max : 1;
}

/** value -> fraction in [0, 1], baseline at 0. Null and non-finite map to 0. */
export function linearScale(values: (number | null)[]): ScaleFn {
  const max = domainMax(values);
  return (value) => {
    if (value === null || !Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value / max));
  };
}

/**
 * value -> fraction in [0, 1] on a log10(1 + v) scale, so 0 maps cleanly to 0
 * instead of -Infinity. Use when the domain spans orders of magnitude (e.g.
 * 1138 vs 11) and a linear scale would flatten every small value to a sliver.
 */
export function logScale(values: (number | null)[]): ScaleFn {
  const max = Math.log10(1 + domainMax(values));
  const safeMax = max > 0 ? max : 1;
  return (value) => {
    if (value === null || !Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, Math.log10(1 + value) / safeMax));
  };
}

/** Picks linear/log per `metric.scale` (default linear) over that metric's own values. */
export function metricScale(metric: BenchmarkMetric): ScaleFn {
  const values = Object.values(metric.values).map((value) => (typeof value === "number" ? value : null));
  return metric.scale === "log" ? logScale(values) : linearScale(values);
}

/** A metric is numeric when every non-null value across variants is a number. */
export function isNumericMetric(metric: BenchmarkMetric): boolean {
  return Object.values(metric.values).every((value) => value === null || typeof value === "number");
}

/**
 * Formats a numeric value for display: `metric.format` when given, otherwise
 * a locale-aware thousands separator with trimmed decimals, plus the unit.
 */
export function formatValue(value: number, metric: BenchmarkMetric, locale?: string): string {
  if (metric.format) return metric.format(value);
  const formatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 1,
  });
  const formatted = formatter.format(value);
  return metric.unit ? `${formatted} ${metric.unit}` : formatted;
}

/**
 * Status tone for a yes/no fact. The icon always shows the value (✓ yes /
 * ✕ no); the colour says whether that value is good, which depends on the
 * metric: `better: "higher"` → yes is good, `"lower"` → no is good (e.g.
 * "shell in image"), unset → neutral (no judgement implied).
 */
export function factTone(value: boolean, better?: "lower" | "higher"): "success" | "danger" | "neutral" {
  if (!better) return "neutral";
  return value === (better === "higher") ? "success" : "danger";
}
