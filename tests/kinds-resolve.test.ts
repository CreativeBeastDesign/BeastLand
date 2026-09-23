/**
 * `kinds.resolve` runs on every keystroke (completion, previews), so it uses
 * the registry's cached entries instead of rescanning. This pins the
 * behaviour it must keep: full ids, short prefixes, ambiguity, and the kind
 * that comes back with the id.
 */
import { afterEach, describe, expect, it } from "vitest";
import { kinds, type KindSpec } from "$lib/tiling/kinds.svelte.js";

const spec = (kind: string, ids: string[]): KindSpec => ({
  kind,
  size: { w: 2, h: 2 },
  label: (id) => id,
  exists: (id) => ids.includes(id),
  component: (() => {}) as never,
  ids: () => ids,
});

let offs: (() => void)[] = [];
afterEach(() => {
  offs.forEach((off) => off());
  offs = [];
});

describe("kinds.resolve", () => {
  it("resolves full ids, short prefixes and reports the kind", () => {
    offs.push(kinds.register(spec("alpha", ["alpha:inv_9001", "alpha:inv_9002"])));
    offs.push(kinds.register(spec("beta", ["beta:prj_7700"])));

    expect(kinds.resolve("beta:prj_7700")).toEqual({ kind: "beta", id: "beta:prj_7700" });
    expect(kinds.resolve("#77")).toEqual({ kind: "beta", id: "beta:prj_7700" });
    expect(kinds.resolve("7700")).toEqual({ kind: "beta", id: "beta:prj_7700" });
    expect(kinds.resolve("#90")).toEqual({ ambiguous: ["alpha:inv_9001", "alpha:inv_9002"] });
    expect(kinds.resolve("#9001")).toEqual({ kind: "alpha", id: "alpha:inv_9001" });
    expect(kinds.resolve("#zz")).toBeNull();
    expect(kinds.resolve("#")).toBeNull();
  });

  it("follows registration: a kind's records disappear with it", () => {
    const off = kinds.register(spec("gamma", ["gamma:cat_5500"]));
    expect(kinds.resolve("#55")).toEqual({ kind: "gamma", id: "gamma:cat_5500" });
    off();
    expect(kinds.resolve("#55")).toBeNull();
  });

  it("agrees with the short-id index on what to type", () => {
    offs.push(kinds.register(spec("delta", ["delta:inv_abcd", "delta:inv_abce"])));
    const short = kinds.shortIdOf("delta:inv_abcd");
    expect(short.short).toBe("abcd"); // shared `abc` prefix forces the 4th char
    expect(kinds.resolve(`#${short.short}`)).toEqual({ kind: "delta", id: "delta:inv_abcd" });
  });
});
