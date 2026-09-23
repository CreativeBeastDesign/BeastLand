/**
 * `KindSpec.preview`: how `@n <verb> …` / `#id <verb> …` previews a kind's
 * own verbs (e.g. `item 3`), which the generic dispatcher can't describe.
 */
import { afterEach, describe, expect, it } from "vitest";
import { type KindSpec, kinds } from "$lib/tiling/kinds.svelte.js";
import type { Container } from "$lib/tiling/types.js";
import { previewContainerArgs } from "$lib/tiling/workspace-commands.js";

const container: Container = {
  id: 2,
  kind: "previewdoc",
  contentId: "previewdoc:a",
  x: 0,
  y: 0,
  w: 4,
  h: 3,
};

let unregister: (() => void) | undefined;
afterEach(() => unregister?.());

function register(preview?: KindSpec["preview"]) {
  unregister = kinds.register({
    kind: "previewdoc",
    size: { w: 4, h: 3 },
    label: (id) => id,
    exists: () => true,
    component: (() => {}) as unknown as KindSpec["component"],
    actions: [{ name: "item", description: "edit an item", run: () => {} }],
    preview,
  });
}

describe("KindSpec.preview", () => {
  it("merges the kind's intent (hint + detail) over the target", () => {
    register((contentId, args) =>
      args[0] === "item" ? { hint: `item ${args[1]}`, detail: { contentId, row: args[1] } } : null,
    );
    expect(previewContainerArgs(container, ["item", "3"])).toEqual({
      target: "@2",
      hint: "item 3",
      detail: { contentId: "previewdoc:a", row: "3" },
    });
  });

  it("is asked before flag shorthands, so `item 3 -h` is not a resize", () => {
    register((_, args) => ({ hint: args.join(" ") }));
    expect(previewContainerArgs(container, ["item", "3", "-h"])).toEqual({
      target: "@2",
      hint: "item 3 -h",
    });
  });

  it("null (or no hook) falls back to target-only; built-in verbs are untouched", () => {
    register(() => null);
    expect(previewContainerArgs(container, ["item", "3"])).toEqual({ target: "@2" });
    expect(previewContainerArgs(container, ["close"])).toEqual({ target: "@2", hint: "close" });
    unregister?.();
    register();
    expect(previewContainerArgs(container, ["item", "3"])).toEqual({ target: "@2" });
  });
});
