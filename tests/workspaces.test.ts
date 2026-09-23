/**
 * Multiple workspaces (layouts): create/switch/rename/remove, per-layout
 * `@n` counters, cross-layout `prune`, persistence + migration from the old
 * single-layout `beastland:workspace` key, the `ws` command, and the
 * ⌃⇧1…9 / ⌃⇧n / ⌃⇧p keymap chords. Runs against the real rune store.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { workspace } from "$lib/tiling/workspace.svelte.js";
import { kinds } from "$lib/tiling/kinds.svelte.js";
import { memoryStorage, storage } from "$lib/shell/storage.js";
import { runCommand, type CommandContext, type LineHandle, type Span } from "$lib/shell/protocol.js";
import { workspaceCommands } from "$lib/tiling/workspace-commands.js";
import { defaultKeymap, resolveKey } from "$lib/shell/keymap.js";

// A throwaway kind so sizes/existence are predictable; no component needed.
kinds.register({
  kind: "box",
  size: { w: 2, h: 2 },
  label: (id) => id,
  exists: () => true,
  component: (() => {}) as never,
});

beforeEach(() => storage.use(memoryStorage())); // fresh single "1" layout, nothing persisted

describe("layouts: create / switch / rename / remove", () => {
  it("starts with a single default layout named \"1\"", () => {
    expect(workspace.layouts).toHaveLength(1);
    expect(workspace.layouts[0]).toMatchObject({ id: "1", name: "1" });
    expect(workspace.activeId).toBe("1");
    expect(workspace.active.id).toBe("1");
  });

  it("create() auto-names (\"2\", \"3\"…) or uses the given name, and becomes active", () => {
    const two = workspace.create();
    expect(two.name).toBe("2");
    expect(workspace.activeId).toBe(two.id);

    const office = workspace.create("office");
    expect(office.name).toBe("office");
    expect(workspace.activeId).toBe(office.id);
    expect(workspace.layouts).toHaveLength(3);
  });

  it("switch() accepts a 1-based index, an id, or a name", () => {
    workspace.create("office");
    expect(workspace.switch(1)).toBe(true);
    expect(workspace.activeId).toBe(workspace.layouts[0].id);
    expect(workspace.switch("office")).toBe(true);
    expect(workspace.active.name).toBe("office");
    expect(workspace.switch(99)).toBe(false);
    expect(workspace.switch("nope")).toBe(false);
  });

  it("rename() renames by id", () => {
    expect(workspace.rename(workspace.activeId, "home")).toBe(true);
    expect(workspace.active.name).toBe("home");
    expect(workspace.rename("no-such-id", "x")).toBe(false);
  });

  it("remove() refuses the last layout", () => {
    expect(workspace.layouts).toHaveLength(1);
    expect(workspace.remove(workspace.activeId)).toBe(false);
    expect(workspace.layouts).toHaveLength(1);
  });

  it("remove() of a non-active layout leaves the active one alone", () => {
    const one = workspace.activeId;
    const two = workspace.create();
    workspace.switch(one);
    expect(workspace.remove(two.id)).toBe(true);
    expect(workspace.layouts).toHaveLength(1);
    expect(workspace.activeId).toBe(one);
  });

  it("remove() of the active layout switches to a neighbour", () => {
    const one = workspace.activeId;
    const two = workspace.create();
    const three = workspace.create();
    expect(workspace.activeId).toBe(three.id);
    expect(workspace.remove(three.id)).toBe(true);
    expect(workspace.layouts.map((l) => l.id)).toEqual([one, two.id]);
    expect(workspace.activeId).toBe(two.id); // neighbour, not necessarily "1"
  });

  it("next()/prev() cycle and wrap", () => {
    const one = workspace.activeId;
    const two = workspace.create();
    workspace.switch(one);
    workspace.next();
    expect(workspace.activeId).toBe(two.id);
    workspace.next();
    expect(workspace.activeId).toBe(one); // wraps
    workspace.prev();
    expect(workspace.activeId).toBe(two.id);
  });
});

describe("per-layout container ids", () => {
  it("each layout counts @n from 1", () => {
    const a = workspace.spawn("box", "a");
    expect(a.id).toBe(1);
    workspace.create();
    expect(workspace.containers).toHaveLength(0); // fresh layout starts empty
    const b = workspace.spawn("box", "b");
    expect(b.id).toBe(1); // its own counter, not continuing from layout 1

    workspace.switch(1);
    expect(workspace.containers.map((c) => c.contentId)).toEqual(["a"]);
    expect(workspace.get(1)?.contentId).toBe("a");
  });

  it("closeAll() only resets the active layout's counter", () => {
    workspace.spawn("box", "a");
    workspace.spawn("box", "b");
    const two = workspace.create();
    workspace.spawn("box", "c");

    workspace.switch(1);
    workspace.closeAll();
    expect(workspace.containers).toHaveLength(0);
    expect(workspace.spawn("box", "fresh").id).toBe(1);

    workspace.switch(two.id);
    expect(workspace.containers.map((c) => c.contentId)).toEqual(["c"]);
  });
});

describe("prune across layouts", () => {
  const existing = new Set<string>();
  let off: (() => void) | undefined;

  beforeEach(() => {
    existing.clear();
    existing.add("keep");
    off = kinds.register({
      kind: "widget",
      size: { w: 1, h: 1 },
      label: (id) => id,
      exists: (id) => existing.has(id),
      component: (() => {}) as never,
    });
  });
  afterEach(() => off?.());

  it("drops stale containers in every layout, not just the active one", () => {
    workspace.spawn("widget", "keep");
    workspace.spawn("widget", "gone-1");
    const two = workspace.create();
    workspace.spawn("widget", "gone-2");

    expect(workspace.prune()).toBe(2);

    workspace.switch(1);
    expect(workspace.containers.map((c) => c.contentId)).toEqual(["keep"]);
    workspace.switch(two.id);
    expect(workspace.containers).toHaveLength(0);
  });
});

describe("prune with a not-yet-ready kind", () => {
  // A plain closure variable is enough here: `ready` is just called and read
  // synchronously by `kinds.exists`/`prune`, no reactive tracking required.
  // (This file is plain `.ts`, not `.svelte.ts`, so runes aren't compiled.)
  let loaded = false;
  let off: (() => void) | undefined;

  beforeEach(() => {
    loaded = false;
    off = kinds.register({
      kind: "lazy",
      size: { w: 1, h: 1 },
      label: (id) => id,
      exists: (id) => id === "keep",
      ready: () => loaded,
      component: (() => {}) as never,
    });
  });
  afterEach(() => off?.());

  it("keeps every container of the kind while ready() is false, as if unregistered", () => {
    workspace.spawn("lazy", "keep");
    workspace.spawn("lazy", "stale");

    expect(workspace.prune()).toBe(0);
    expect(workspace.containers.map((c) => c.contentId).sort()).toEqual(["keep", "stale"]);
  });

  it("prunes normally once ready() flips to true", () => {
    workspace.spawn("lazy", "keep");
    workspace.spawn("lazy", "stale");

    loaded = true;
    expect(workspace.prune()).toBe(1);
    expect(workspace.containers.map((c) => c.contentId)).toEqual(["keep"]);
  });

  it("exists() reports true for any id while not ready, false once ready", () => {
    expect(kinds.exists("lazy", "anything")).toBe(true);
    loaded = true;
    expect(kinds.exists("lazy", "anything")).toBe(false);
    expect(kinds.exists("lazy", "keep")).toBe(true);
  });
});

describe("persistence shape + migration", () => {
  it("persists { layouts, activeId } under beastland:workspaces", () => {
    workspace.spawn("box", "a");
    workspace.create("office");

    const raw = storage.get("beastland:workspaces");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!) as { layouts: unknown[]; activeId: string };
    expect(parsed.activeId).toBe(workspace.activeId);
    expect(parsed.layouts).toHaveLength(2);
  });

  it("migrates the old single-layout beastland:workspace key into layout \"1\" and removes it", () => {
    const old = {
      containers: [{ id: 1, kind: "box", contentId: "legacy", x: 0, y: 0, w: 2, h: 2 }],
      selectedId: 1,
      nextId: 2,
    };
    storage.use(memoryStorage({ "beastland:workspace": JSON.stringify(old) }));

    expect(workspace.layouts).toHaveLength(1);
    expect(workspace.layouts[0]).toMatchObject({ id: "1", name: "1" });
    expect(workspace.containers.map((c) => c.contentId)).toEqual(["legacy"]);
    expect(workspace.selectedId).toBe(1);

    // The old key is gone; the new one holds the migrated shape.
    expect(storage.get("beastland:workspace")).toBeNull();
    const raw = storage.get("beastland:workspaces");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!) as { layouts: { containers: unknown[] }[]; activeId: string };
    expect(parsed.activeId).toBe("1");
    expect(parsed.layouts[0].containers).toHaveLength(1);
  });

  it("prefers the new key over a stale old one, without migrating", () => {
    const fresh = { layouts: [{ id: "1", name: "solo", containers: [], selectedId: null, nextId: 1 }], activeId: "1" };
    const old = { containers: [{ id: 1, kind: "box", contentId: "stale", x: 0, y: 0, w: 2, h: 2 }], selectedId: null, nextId: 2 };
    storage.use(memoryStorage({ "beastland:workspaces": JSON.stringify(fresh), "beastland:workspace": JSON.stringify(old) }));

    expect(workspace.layouts[0].name).toBe("solo");
    expect(workspace.containers).toHaveLength(0);
    // Migration did not run: the (stale, unrelated) old key is left alone.
    expect(storage.get("beastland:workspace")).not.toBeNull();
  });
});

describe("ws command", () => {
  const noopHandle: LineHandle = { set: () => {}, append: () => {} };

  async function run(line: string): Promise<{ text: string; kind?: string }[]> {
    const lines: { text: string; kind?: string }[] = [];
    const ctx: CommandContext = {
      print: (text, kind) => {
        lines.push({ text: typeof text === "string" ? text : (text as Span[]).map((s) => s.text).join(""), kind });
        return noopHandle;
      },
      clear: () => {},
      commands: workspaceCommands,
      signal: new AbortController().signal,
    };
    await runCommand(line, workspaceCommands, ctx);
    return lines;
  }

  it("ws / ws list shows every layout, the active one first-column starred", async () => {
    workspace.create("office");
    const lines = await run("ws");
    expect(lines).toHaveLength(2);
    expect(lines[0].text).toContain("ws 1");
    expect(lines[1].text.trim().startsWith("*")).toBe(true); // active ("office") is second, starred
    expect((await run("ws list")).map((l) => l.text)).toEqual(lines.map((l) => l.text));
  });

  it("ws new [name] creates and switches", async () => {
    expect((await run("ws new office"))[0].text).toBe("created workspace office (active)");
    expect(workspace.active.name).toBe("office");
    expect((await run("ws 1"))[0].text).toContain("workspace 1");
    expect(workspace.active.name).toBe("1");
  });

  it("ws rename <name> renames the active workspace", async () => {
    await run("ws rename home");
    expect(workspace.active.name).toBe("home");
    expect((await run("ws rename"))[0]).toEqual({ text: "usage: ws rename <name>", kind: "error" });
  });

  it("ws rm refuses the last workspace and removes by index otherwise", async () => {
    expect((await run("ws rm"))[0]).toEqual({ text: "cannot remove the last workspace", kind: "error" });
    await run("ws new");
    expect(workspace.layouts).toHaveLength(2);
    await run("ws rm 1");
    expect(workspace.layouts).toHaveLength(1);
  });

  it("ws next / ws prev cycle through layouts", async () => {
    await run("ws new");
    await run("ws 1");
    expect((await run("ws next"))[0].text).toBe("workspace 2");
    expect((await run("ws prev"))[0].text).toBe("workspace 1");
  });

  it("unknown workspace reference errors", async () => {
    expect((await run("ws nope"))[0]).toEqual({ text: "no such workspace: nope", kind: "error" });
  });
});

describe("keymap: workspace chords", () => {
  const ev = (init: Partial<KeyboardEvent> & { code?: string; key?: string }) =>
    ({ metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, code: "", key: "", ...init }) as KeyboardEvent;

  it("⌃⇧1…9 resolve to workspace-n, distinct from the shiftless select-n", () => {
    expect(resolveKey(ev({ ctrlKey: true, shiftKey: true, code: "Digit1" }), defaultKeymap, true)).toEqual({
      action: "workspace-n",
      n: 1,
    });
    expect(resolveKey(ev({ ctrlKey: true, code: "Digit1" }), defaultKeymap, true)).toEqual({ action: "select-n", n: 1 });
  });

  it("⌃⇧n / ⌃⇧p resolve to workspace-next/prev, distinct from ⌃n/⌃p", () => {
    expect(resolveKey(ev({ ctrlKey: true, shiftKey: true, code: "KeyN" }), defaultKeymap, true)?.action).toBe("workspace-next");
    expect(resolveKey(ev({ ctrlKey: true, shiftKey: true, code: "KeyP" }), defaultKeymap, true)?.action).toBe("workspace-prev");
    expect(resolveKey(ev({ ctrlKey: true, code: "KeyN" }), defaultKeymap, true)?.action).toBe("select-next");
  });

  it("a resolved chord drives workspace.switch()", () => {
    workspace.create();
    const hit = resolveKey(ev({ ctrlKey: true, shiftKey: true, code: "Digit1" }), defaultKeymap, true);
    expect(hit?.action).toBe("workspace-n");
    expect(workspace.switch(hit!.n!)).toBe(true);
    expect(workspace.activeId).toBe(workspace.layouts[0].id);
  });
});
