import { describe, expect, it } from "vitest";
import { bareId, resolveId, shortId } from "$lib/tiling/ids.js";
import { documentTotals, formatMoney, itemLabels, resolveItemRef, splitName } from "$lib/data/format.js";
import { seedDocuments } from "$lib/data/seed.js";

describe("short ids", () => {
  const all = ["customer:xpoakahew4rsp2stfg0y", "customer:xq7lm2ndk9vbf3wh1t8e", "document:doc_fab90cb3-c39b"];
  it("strips namespace and doc_ prefix", () => {
    expect(bareId("document:doc_fab90cb3")).toBe("fab90cb3");
  });
  it("uses the shortest unique prefix, min 2 chars", () => {
    expect(shortId(all[0], all).short).toBe("xp");
    expect(shortId(all[2], all).short).toBe("fa");
  });
  it("resolves prefixes and reports ambiguity", () => {
    expect(resolveId("#xp", all)).toEqual({ id: all[0] });
    expect(resolveId("x", all)).toEqual({ ambiguous: [all[0], all[1]] });
    expect(resolveId("zz", all)).toBeNull();
  });
});

describe("format", () => {
  it("formats money with Swiss grouping", () => {
    expect(formatMoney(1621500, "CHF")).toBe("CHF 16'215.00");
    expect(formatMoney(-50)).toBe("-0.50");
  });
  it("splits names at the last space", () => {
    expect(splitName("Rob Van Der Linden")).toEqual({ firstName: "Rob Van Der", lastName: "Linden" });
    expect(splitName("Cher")).toEqual({ firstName: "", lastName: "Cher" });
  });
  it("numbers required items and letters optional ones", () => {
    const labels = itemLabels(seedDocuments[0].items);
    expect(labels.slice(0, 6)).toEqual(["1", "2", "3", "4", "5", "a"]);
    expect(resolveItemRef(seedDocuments[0].items, "b")).toBe(7);
    expect(resolveItemRef(seedDocuments[0].items, "last")).toBe(12);
    expect(resolveItemRef(seedDocuments[0].items, "z")).toBeNull();
  });
  it("computes totals with discount and tax", () => {
    const t = documentTotals(seedDocuments[1]);
    expect(t.net).toBe(820000);
    expect(t.discount).toBe(410000);
    expect(t.gross).toBe(443210);
  });
});
