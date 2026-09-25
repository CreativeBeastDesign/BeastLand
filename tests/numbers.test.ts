import { describe, expect, it } from "vitest";
import { formatSectionNumber } from "../src/lib/reading/numbers.js";

describe("formatSectionNumber", () => {
  it("pads single-digit segments to two digits", () => {
    expect(formatSectionNumber(1)).toBe("01");
    expect(formatSectionNumber("2.1")).toBe("02.01");
    expect(formatSectionNumber("02.1")).toBe("02.01");
    expect(formatSectionNumber("1.2.3")).toBe("01.02.03");
  });

  it("keeps wider and non-numeric segments as given", () => {
    expect(formatSectionNumber(12)).toBe("12");
    expect(formatSectionNumber("3.12")).toBe("03.12");
    expect(formatSectionNumber("A.1")).toBe("A.01");
    expect(formatSectionNumber("1–3")).toBe("1–3");
  });

  it("passes undefined through", () => {
    expect(formatSectionNumber(undefined)).toBeUndefined();
  });
});
