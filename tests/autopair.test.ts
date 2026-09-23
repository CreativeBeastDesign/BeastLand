import { describe, expect, it } from "vitest";
import { applyAutoPair, applyAutoPairBackspace } from "$lib/shell/autopair.js";

describe("applyAutoPair", () => {
  it('inserts "" with the caret between, for double quotes', () => {
    expect(applyAutoPair("ask ", 4, 4, '"')).toEqual({ value: 'ask ""', caret: 5 });
  });

  it("steps over an existing closing quote instead of inserting another", () => {
    // caret is between the quotes of `""`
    expect(applyAutoPair('ask ""', 5, 5, '"')).toEqual({ value: 'ask ""', caret: 6 });
  });

  it("wraps a selection in quotes instead of pairing", () => {
    const value = "ask hello";
    expect(applyAutoPair(value, 4, 9, '"')).toEqual({ value: 'ask "hello"', caret: 11 });
  });

  it("does not pair when the next char is a word character", () => {
    // caret sits between "foo" and "bar": typing a quote there just inserts it
    expect(applyAutoPair("foobar", 3, 3, '"')).toBeNull();
  });

  it("pairs when the next char is punctuation or whitespace, not a word char", () => {
    expect(applyAutoPair("foo)", 3, 3, '"')).toEqual({ value: 'foo"")', caret: 4 });
  });

  it("pairs a single quote only at a token boundary", () => {
    expect(applyAutoPair("ask ", 4, 4, "'")).toEqual({ value: "ask ''", caret: 5 });
    expect(applyAutoPair("", 0, 0, "'")).toEqual({ value: "''", caret: 1 });
  });

  it("does not pair a single quote mid-word (apostrophes in prose)", () => {
    // "don" + caret + "t" -> typing ' should not pair, letting "don't" form
    expect(applyAutoPair("dont", 3, 3, "'")).toBeNull();
  });

  it("steps over a single-quote pair the same way as double quotes", () => {
    expect(applyAutoPair("ask ''", 5, 5, "'")).toEqual({ value: "ask ''", caret: 6 });
  });

  it("returns null for keys other than a quote", () => {
    expect(applyAutoPair("ask ", 4, 4, "a")).toBeNull();
  });
});

describe("applyAutoPairBackspace", () => {
  it("deletes both sides of an empty double-quote pair", () => {
    expect(applyAutoPairBackspace('ask ""', 5)).toEqual({ value: "ask ", caret: 4 });
  });

  it("deletes both sides of an empty single-quote pair", () => {
    expect(applyAutoPairBackspace("ask ''", 5)).toEqual({ value: "ask ", caret: 4 });
  });

  it("does nothing when the pair isn't empty", () => {
    expect(applyAutoPairBackspace('ask "x"', 6)).toBeNull();
  });

  it("does nothing at the start of the input", () => {
    expect(applyAutoPairBackspace('""', 0)).toBeNull();
  });

  it("does nothing when the surrounding characters aren't a matching quote pair", () => {
    expect(applyAutoPairBackspace('a"b', 2)).toBeNull();
  });
});
