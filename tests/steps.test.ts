import { describe, expect, it } from "vitest";
import { stepState } from "$lib/reading/steps.js";

describe("stepState", () => {
  it("marks a step in the completed list as complete", () => {
    expect(stepState("a", "b", ["a"])).toBe("complete");
  });

  it("marks the current id as current", () => {
    expect(stepState("b", "b", ["a"])).toBe("current");
  });

  it("marks everything else as upcoming", () => {
    expect(stepState("c", "b", ["a"])).toBe("upcoming");
  });

  it("defaults completed to empty and current to undefined", () => {
    expect(stepState("a", undefined)).toBe("upcoming");
  });

  it("prefers completed over current when a step is marked both", () => {
    expect(stepState("a", "a", ["a"])).toBe("complete");
  });

  it("treats an empty completed list as no completions", () => {
    expect(stepState("a", "a", [])).toBe("current");
  });
});
