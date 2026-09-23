/**
 * Layout operations (spawn/close/move/resize) push undo entries into the
 * shared `undoStack`, with inverses that restore kind/contentId/title/rect
 * and, for a close, the same `@n` id when it's still free. Selection-only
 * changes and `prune()` must not push anything.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { workspace } from "$lib/tiling/workspace.svelte.js";
import { kinds } from "$lib/tiling/kinds.svelte.js";
import { undoStack } from "$lib/shell/undo.svelte.js";

kinds.register({
  kind: "box",
  size: { w: 2, h: 2 },
  label: (id) => id,
  exists: () => true,
  component: (() => {}) as never,
});

beforeEach(() => {
  workspace.closeAll();
  undoStack.clear();
});

describe("spawn", () => {
  it("pushes an undo entry whose inverse closes it", async () => {
    const a = workspace.spawn("box", "a");
    expect(workspace.containers).toHaveLength(1);

    const outcome = await undoStack.undo();
    expect(outcome.ok).toBe(true);
    expect(workspace.containers).toHaveLength(0);
    expect(workspace.get(a.id)).toBeUndefined();
  });
});

describe("close", () => {
  it("pushes an undo entry that respawns the same kind/contentId/title/rect/id", async () => {
    const a = workspace.spawn("box", "a", { title: "Alpha" });
    workspace.spawn("box", "b"); // occupies the next slot so @1's rect would otherwise be free either way
    undoStack.clear(); // ignore the two spawn entries; test close in isolation

    expect(workspace.close(a.id)).toBe(true);
    expect(workspace.get(a.id)).toBeUndefined();

    const outcome = await undoStack.undo();
    expect(outcome.ok).toBe(true);
    const restored = workspace.get(a.id);
    expect(restored).toMatchObject({ id: a.id, kind: "box", contentId: "a", title: "Alpha", x: a.x, y: a.y, w: a.w, h: a.h });
  });

  it("falls back to ordinary placement when the id/rect was taken since", async () => {
    const a = workspace.spawn("box", "a");
    undoStack.clear();
    workspace.close(a.id);
    const closeId = undoStack.list().at(-1)!.id;
    // Something else now sits where @<a.id>/its rect was.
    const b = workspace.spawn("box", "b");
    expect(b.id).toBe(a.id); // lowest-free reused it already

    const outcome = await undoStack.undo(closeId);
    expect(outcome.ok).toBe(true);
    // "a" is back, but not clobbering "b" — and not necessarily the same id.
    expect(workspace.findByContent("a")).toBeDefined();
    expect(workspace.findByContent("b")).toBeDefined();
    expect(workspace.containers).toHaveLength(2);
  });

  it("undoing does not itself push a new undo entry", async () => {
    const a = workspace.spawn("box", "a");
    undoStack.clear();
    workspace.close(a.id);
    expect(undoStack.list()).toHaveLength(1);
    await undoStack.undo();
    expect(undoStack.list()).toHaveLength(1); // still just the close entry, now marked undone
    expect(undoStack.list()[0].status).toBe("undone");
  });
});

describe("move", () => {
  it("pushes an undo entry that restores the previous position", async () => {
    const a = workspace.spawn("box", "a");
    undoStack.clear();
    const before = { x: a.x, y: a.y };
    expect(workspace.move(a.id, "right").ok).toBe(true);
    expect(workspace.get(a.id)).toMatchObject({ x: before.x + 1, y: before.y });

    const outcome = await undoStack.undo();
    expect(outcome.ok).toBe(true);
    expect(workspace.get(a.id)).toMatchObject(before);
  });

  it("a swap's inverse restores both containers", async () => {
    const a = workspace.spawn("box", "a"); // (0,0)
    const b = workspace.spawn("box", "b"); // (2,0)
    undoStack.clear();
    expect(workspace.move(a.id, "right").ok).toBe(true); // swaps a and b
    expect(workspace.get(a.id)?.x).toBe(2);
    expect(workspace.get(b.id)?.x).toBe(0);

    const outcome = await undoStack.undo();
    expect(outcome.ok).toBe(true);
    expect(workspace.get(a.id)?.x).toBe(0);
    expect(workspace.get(b.id)?.x).toBe(2);
  });
});

describe("resize", () => {
  it("pushes an undo entry that restores the previous size", async () => {
    const a = workspace.spawn("box", "a");
    undoStack.clear();
    expect(workspace.resize(a.id, { w: 4 }).ok).toBe(true);
    expect(workspace.get(a.id)?.w).toBe(4);

    const outcome = await undoStack.undo();
    expect(outcome.ok).toBe(true);
    expect(workspace.get(a.id)?.w).toBe(a.w);
  });
});

describe("selection-only changes and prune()", () => {
  it("select/selectNext/selectPrev/selectDirection push nothing", () => {
    workspace.spawn("box", "a");
    workspace.spawn("box", "b");
    undoStack.clear();
    workspace.selectNext();
    workspace.selectPrev();
    workspace.selectDirection("right");
    workspace.select(null);
    expect(undoStack.list()).toHaveLength(0);
  });

  it("prune() pushes nothing", () => {
    kinds.register({
      kind: "ghost",
      size: { w: 1, h: 1 },
      label: (id) => id,
      exists: () => false,
      component: (() => {}) as never,
    });
    workspace.spawn("ghost", "g");
    undoStack.clear();
    workspace.prune();
    expect(undoStack.list()).toHaveLength(0);
  });
});

describe("guard", () => {
  it("a move's inverse refuses if the container was closed since", async () => {
    const a = workspace.spawn("box", "a");
    undoStack.clear();
    workspace.move(a.id, "right");
    const moveId = undoStack.list().at(-1)!.id;
    workspace.close(a.id);

    const outcome = await undoStack.undo(moveId);
    expect(outcome.ok).toBe(false);
  });
});
