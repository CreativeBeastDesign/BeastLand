import { describe, expect, it } from "vitest";
import {
  factTone,
  formatValue,
  isNumericMetric,
  linearScale,
  logScale,
  metricScale,
} from "../src/lib/reading/benchmark.js";
import type { BenchmarkMetric } from "../src/lib/reading/types.js";

describe("linearScale", () => {
  it("maps the max value to 1 and 0 to 0", () => {
    const scale = linearScale([1138.5, 165.3, 159.9, 137.8]);
    expect(scale(1138.5)).toBe(1);
    expect(scale(0)).toBe(0);
    expect(scale(137.8)).toBeCloseTo(137.8 / 1138.5);
  });

  it("treats null and non-finite values as 0", () => {
    const scale = linearScale([10, null, Number.NaN]);
    expect(scale(null)).toBe(0);
    expect(scale(Number.NaN)).toBe(0);
  });

  it("does not divide by zero when every value is 0", () => {
    const scale = linearScale([0, 0, 0]);
    expect(scale(0)).toBe(0);
  });

  it("clamps to [0, 1]", () => {
    const scale = linearScale([10]);
    expect(scale(20)).toBe(1);
    expect(scale(-5)).toBe(0);
  });
});

describe("logScale", () => {
  it("maps the max value to 1 and 0 to 0", () => {
    const scale = logScale([580, 13, 6, 0]);
    expect(scale(580)).toBe(1);
    expect(scale(0)).toBe(0);
  });

  it("compresses a wide domain less harshly than linear would", () => {
    const values = [1138.5, 11];
    const linear = linearScale(values);
    const log = logScale(values);
    // On a linear scale 11 is nearly invisible next to 1138.5; log gives it
    // meaningfully more of the track.
    expect(log(11)).toBeGreaterThan(linear(11));
  });

  it("treats null and non-finite values as 0", () => {
    const scale = logScale([10, null, Number.NaN]);
    expect(scale(null)).toBe(0);
    expect(scale(Number.NaN)).toBe(0);
  });

  it("does not divide by zero when every value is 0", () => {
    const scale = logScale([0, 0]);
    expect(scale(0)).toBe(0);
  });
});

describe("metricScale", () => {
  it("picks log scale only when metric.scale is 'log'", () => {
    const metric: BenchmarkMetric = {
      id: "size",
      label: "Image size",
      unit: "MB",
      scale: "log",
      values: { naive: 1138.5, pokkum: 137.8 },
    };
    const log = metricScale(metric);
    const linear = linearScale([1138.5, 137.8]);
    expect(log(137.8)).not.toBeCloseTo(linear(137.8), 3);
  });

  it("defaults to linear when scale is unset", () => {
    const metric: BenchmarkMetric = {
      id: "cves",
      label: "CVEs",
      values: { naive: 580, pokkum: 0 },
    };
    const scale = metricScale(metric);
    expect(scale(580)).toBe(1);
    expect(scale(0)).toBe(0);
  });
});

describe("isNumericMetric", () => {
  it("is true when every non-null value is a number", () => {
    expect(isNumericMetric({ id: "m", label: "M", values: { a: 1, b: null, c: 2 } })).toBe(true);
  });

  it("is false when any value is a boolean or string", () => {
    expect(isNumericMetric({ id: "m", label: "M", values: { a: true, b: false } })).toBe(false);
    expect(isNumericMetric({ id: "m", label: "M", values: { a: "yes", b: 1 } })).toBe(false);
  });
});

describe("formatValue", () => {
  it("uses metric.format when provided", () => {
    const metric: BenchmarkMetric = {
      id: "m",
      label: "M",
      values: {},
      format: (value) => `${value}x`,
    };
    expect(formatValue(3, metric)).toBe("3x");
  });

  it("applies a thousands separator and appends the unit", () => {
    const metric: BenchmarkMetric = { id: "m", label: "M", unit: "MB", values: {} };
    expect(formatValue(1138.5, metric, "en-US")).toBe("1,138.5 MB");
  });

  it("trims decimals for whole numbers", () => {
    const metric: BenchmarkMetric = { id: "m", label: "M", unit: "CVEs", values: {} };
    expect(formatValue(580, metric, "en-US")).toBe("580 CVEs");
  });

  it("omits the unit when the metric has none", () => {
    const metric: BenchmarkMetric = { id: "m", label: "M", values: {} };
    expect(formatValue(19, metric, "en-US")).toBe("19");
  });
});

describe("factTone", () => {
  it("colours by whether the value is good, not by yes/no", () => {
    expect(factTone(true, "higher")).toBe("success");
    expect(factTone(false, "higher")).toBe("danger");
    expect(factTone(false, "lower")).toBe("success");
    expect(factTone(true, "lower")).toBe("danger");
  });

  it("stays neutral without a direction", () => {
    expect(factTone(true)).toBe("neutral");
    expect(factTone(false)).toBe("neutral");
  });
});
