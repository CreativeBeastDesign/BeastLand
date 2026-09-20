/**
 * Workspace store: placement, moves, swaps, resizes, previews.
 * Runs against the real rune store (compiled by the Svelte plugin).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { workspace } from "$lib/tiling/workspace.svelte.js";
import { kinds } from "$lib/tiling/kinds.svelte.js";
import { GRID_COLUMNS } from "$lib/tiling/types.js";

// A throwaway kind so sizes are predictable; no component needed for logic tests.
kinds.register({
  kind: "box",
  size: { w: 2, h: 2 },
  label: (id) => id,
  exists: () => true,
  component: (() => {}) as never,
});

beforeEach(() => workspace.closeAll());

describe("spawn", () => {
  it("first-fits row-major and restarts ids after closeAll", () => {
    const a = workspace.spawn("box", "a");
    const b = workspace.spawn("box", "b");
    const c = workspace.spawn("box", "c");
    const d = workspace.spawn("box", "d");
    expect([a.x, a.y, b.x, b.y, c.x, c.y]).toEqual([0, 0, 2, 0, 4, 0]);
    expect([d.x, d.y]).toEqual([0, 2]);
    expect(a.id).toBe(1);
  });
  it("clamps width to the grid and honours explicit sizes", () => {
    const wide = workspace.spawn("box", "w", { w: 99, h: 1 });
    expect(wide.w).toBe(GRID_COLUMNS);
  });
  it("open() reuses an existing container for the same record", () => {
    const a = workspace.spawn("box", "a");
    expect(workspace.open("box", "a").id).toBe(a.id);
    expect(workspace.containers).toHaveLength(1);
  });
});

describe("move", () => {
  it("refuses at the edge and reports it", () => {
    const a = workspace.spawn("box", "a");
    expect(workspace.move(a.id, "left")).toEqual({ ok: false, reason: "at edge" });
  });
  it("swaps with a same-size neighbour instead of overlapping", () => {
    const a = workspace.spawn("box", "a"); // (0,0)
    const b = workspace.spawn("box", "b"); // (2,0)
    expect(workspace.move(a.id, "right").ok).toBe(true);
    expect([workspace.get(a.id)!.x, workspace.get(b.id)!.x]).toEqual([2, 0]);
  });
  it("refuses to move into a differently sized neighbour", () => {
    const a = workspace.spawn("box", "a"); // 2×2 at (0,0)
    const big = workspace.spawn("box", "big", { w: 3, h: 3 }); // (2,0)
    const r = workspace.move(a.id, "right");
    expect(r.ok).toBe(false);
    expect(r.ok ? "" : r.reason).toBe(`would overlap @${big.id}`);
  });
});

describe("resize + previews", () => {
  it("peekResize matches resize and neither disagrees with the other", () => {
    const a = workspace.spawn("box", "a");
    workspace.spawn("box", "b"); // (2,0) blocks growing a to w=3
    const peek = workspace.peekResize(a.id, { w: 3 });
    const real = workspace.resize(a.id, { w: 3 });
    expect(peek.ok).toBe(false);
    expect(real.ok).toBe(false);
    expect(workspace.get(a.id)!.w).toBe(2);
  });
  it("peekSpawnFor uses the kind's size and the next free slot", () => {
    workspace.spawn("box", "a");
    expect(workspace.peekSpawnFor("box")).toEqual({ x: 2, y: 0, w: 2, h: 2 });
  });
  it("selectDirection prefers the nearest in the row/column band", () => {
    const a = workspace.spawn("box", "a"); // (0,0)
    const b = workspace.spawn("box", "b"); // (2,0)
    const c = workspace.spawn("box", "c"); // (4,0)
    const d = workspace.spawn("box", "d"); // (0,2)
    workspace.select(a.id);
    expect(workspace.selectDirection("right")).toBe(true);
    expect(workspace.selectedId).toBe(b.id);
    workspace.selectDirection("right");
    expect(workspace.selectedId).toBe(c.id);
    workspace.select(a.id);
    workspace.selectDirection("down");
    expect(workspace.selectedId).toBe(d.id);
  });
});
