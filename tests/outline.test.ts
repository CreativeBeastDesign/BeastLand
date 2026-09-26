import { describe, expect, it } from "vitest";
import {
  activeEntry,
  collectOutline,
  nearestScrollRoot,
  resolveSection,
  scrollProgress,
  sectionProgress,
} from "../src/lib/reading/outline.js";

describe("activeEntry", () => {
  it("returns null for an empty list", () => {
    expect(activeEntry([], 100)).toBeNull();
  });

  it("returns the last entry at or above the threshold", () => {
    const entries = [
      { id: "a", top: 0 },
      { id: "b", top: 50 },
      { id: "c", top: 150 },
    ];
    expect(activeEntry(entries, 100)).toBe("b");
  });

  it("falls back to the first entry when none has been passed yet", () => {
    const entries = [
      { id: "a", top: 200 },
      { id: "b", top: 300 },
    ];
    expect(activeEntry(entries, 0)).toBe("a");
  });

  it("picks the innermost (last in document order) entry at the same top", () => {
    const entries = [
      { id: "a", top: 0 },
      { id: "a.1", top: 0 },
    ];
    expect(activeEntry(entries, 0)).toBe("a.1");
  });

  it("uses the last entry when everything has been passed", () => {
    const entries = [
      { id: "a", top: 0 },
      { id: "b", top: 10 },
      { id: "c", top: 20 },
    ];
    expect(activeEntry(entries, 1000)).toBe("c");
  });
});

describe("scrollProgress", () => {
  it("is 0 at the top", () => {
    expect(scrollProgress(0, 2000, 500)).toBe(0);
  });

  it("is 1 at the bottom", () => {
    expect(scrollProgress(1500, 2000, 500)).toBe(1);
  });

  it("is proportional in between", () => {
    expect(scrollProgress(750, 2000, 500)).toBeCloseTo(0.5);
  });

  it("clamps out-of-range values", () => {
    expect(scrollProgress(-100, 2000, 500)).toBe(0);
    expect(scrollProgress(5000, 2000, 500)).toBe(1);
  });

  it("is 0 when there's nothing to scroll (content fits)", () => {
    expect(scrollProgress(0, 400, 500)).toBe(0);
  });
});

describe("sectionProgress", () => {
  const entries = [
    { id: "a", top: 0 },
    { id: "b", top: 200 },
    { id: "c", top: 500 },
  ];

  it("is 0 when there's no active entry", () => {
    expect(sectionProgress(entries, null, 50, 1000)).toBe(0);
  });

  it("is 0 when the active id isn't found", () => {
    expect(sectionProgress(entries, "nope", 50, 1000)).toBe(0);
  });

  it("is 0 for an empty entry list", () => {
    expect(sectionProgress([], "a", 50, 1000)).toBe(0);
  });

  it("is proportional within a middle entry's span", () => {
    // "b" spans 200 -> 500 (next entry's top); threshold 350 is halfway.
    expect(sectionProgress(entries, "b", 350, 1000)).toBeCloseTo(0.5);
  });

  it("is 0 at the top of the active entry's span", () => {
    expect(sectionProgress(entries, "b", 200, 1000)).toBe(0);
  });

  it("uses the entry's own top -> next entry's top for a non-last entry", () => {
    expect(sectionProgress(entries, "a", 100, 1000)).toBeCloseTo(0.5);
  });

  it("uses endTop as the span end for the last entry", () => {
    // "c" spans 500 -> endTop (1000); threshold 750 is halfway.
    expect(sectionProgress(entries, "c", 750, 1000)).toBeCloseTo(0.5);
  });

  it("clamps below the span (negative) and above it (> 1)", () => {
    expect(sectionProgress(entries, "b", -1000, 1000)).toBe(0);
    expect(sectionProgress(entries, "b", 10000, 1000)).toBe(1);
  });

  it("is 0 when the span is zero or negative (guards divide-by-zero)", () => {
    const collapsed = [
      { id: "a", top: 100 },
      { id: "b", top: 100 },
    ];
    expect(sectionProgress(collapsed, "a", 100, 1000)).toBe(0);
  });
});

describe("collectOutline", () => {
  it("reads the DOM contract off [data-outline] descendants", () => {
    const root = {
      querySelectorAll(selector: string) {
        expect(selector).toBe("[data-outline]");
        return [
          fakeElement({ id: "intro", "data-outline": "", "data-outline-level": "2", "data-outline-label": "Intro" }),
          fakeElement({
            id: "deep",
            "data-outline": "",
            "data-outline-level": "3",
            "data-outline-label": "Deep dive",
            "data-outline-number": "01",
          }),
        ];
      },
    } as unknown as ParentNode;

    expect(collectOutline(root)).toEqual([
      { id: "intro", label: "Intro", level: 2, number: undefined },
      { id: "deep", label: "Deep dive", level: 3, number: "01" },
    ]);
  });

  it("skips nodes with no id", () => {
    const root = {
      querySelectorAll: () => [fakeElement({ "data-outline": "", "data-outline-label": "No id" })],
    } as unknown as ParentNode;

    expect(collectOutline(root)).toEqual([]);
  });
});

describe("nearestScrollRoot", () => {
  it("returns null when no ancestor scrolls (window is the root)", () => {
    const node = fakeAncestryElement(null);
    expect(nearestScrollRoot(node)).toBeNull();
  });

  it("finds the first scrollable ancestor", () => {
    const scrollable = fakeAncestryElement(null, { overflowY: "auto", scrollHeight: 2000, clientHeight: 500 });
    const middle = fakeAncestryElement(scrollable, { overflowY: "visible", scrollHeight: 100, clientHeight: 100 });
    const node = fakeAncestryElement(middle, { overflowY: "visible", scrollHeight: 100, clientHeight: 100 });

    expect(nearestScrollRoot(node)).toBe(scrollable);
  });

  it("accepts a scroll container that does not overflow yet", () => {
    const notOverflowingYet = fakeAncestryElement(null, {
      overflowY: "auto",
      scrollHeight: 100,
      clientHeight: 100,
    });
    const node = fakeAncestryElement(notOverflowingYet, {
      overflowY: "visible",
      scrollHeight: 100,
      clientHeight: 100,
    });

    expect(nearestScrollRoot(node)).toBe(notOverflowingYet);
  });
});

// -- fakes -------------------------------------------------------------

function fakeElement(attrs: Record<string, string>) {
  return {
    getAttribute(name: string) {
      return Object.hasOwn(attrs, name) ? attrs[name] : null;
    },
  } as unknown as Element;
}

const styles = new WeakMap<Element, CSSStyleDeclaration>();

(globalThis as { getComputedStyle: (el: Element) => CSSStyleDeclaration }).getComputedStyle = (el: Element) =>
  styles.get(el) ?? ({ overflowY: "visible" } as CSSStyleDeclaration);

function fakeAncestryElement(
  parent: Element | null,
  style?: { overflowY: string; scrollHeight: number; clientHeight: number },
): Element {
  const el = {
    parentElement: parent,
    scrollHeight: style?.scrollHeight ?? 0,
    clientHeight: style?.clientHeight ?? 0,
  } as unknown as Element;

  styles.set(el, { overflowY: style?.overflowY ?? "visible" } as CSSStyleDeclaration);
  return el;
}

describe("resolveSection", () => {
  const entries = [
    { id: "lorem-intro", label: "Introduction", level: 2, number: "01" },
    { id: "lorem-pipeline", label: "How it flows", level: 2, number: "02" },
    { id: "lorem-details", label: "Details", level: 2, number: "03" },
    { id: "lorem-detail-notes", label: "Detail notes", level: 3 },
  ];

  it("matches an exact id", () => {
    expect(resolveSection(entries, "lorem-pipeline")).toBe("lorem-pipeline");
  });

  it("matches a number with or without leading zeros", () => {
    expect(resolveSection(entries, "3")).toBe("lorem-details");
    expect(resolveSection(entries, "03")).toBe("lorem-details");
  });

  it("matches a label case-insensitively, then a unique prefix/suffix", () => {
    expect(resolveSection(entries, "how it flows")).toBe("lorem-pipeline");
    expect(resolveSection(entries, "details")).toBe("lorem-details");
    expect(resolveSection(entries, "intro")).toBe("lorem-intro");
  });

  it("returns null for ambiguous or unknown queries", () => {
    expect(resolveSection(entries, "detail")).toBeNull();
    expect(resolveSection(entries, "nope")).toBeNull();
    expect(resolveSection(entries, "  ")).toBeNull();
  });
});
