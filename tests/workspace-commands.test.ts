/**
 * The record-agnostic workspace commands (`@n`, `#id`, `ls`, `close`) work
 * against a kind the library has never heard of: everything they need comes
 * from `KindSpec` (`label`, `ids`, `exists`, `view`, `set`, `actions`).
 * This is the contract an app with its own data plugs into.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { runCommand, flagsFor, type CommandContext, type LineHandle, type Span } from "$lib/shell/protocol.js";
import { workspaceCommands, recordSuggestions } from "$lib/tiling/workspace-commands.js";
import { kinds, type KindSpec } from "$lib/tiling/kinds.svelte.js";
import { workspace } from "$lib/tiling/workspace.svelte.js";
import { viewFrom, type FieldDef } from "$lib/tiling/views.js";
import { storage } from "$lib/shell/storage.js";

type Widget = { id: string; name: string; colour: string };
const widgets: Widget[] = [
  { id: "widget:alpha000", name: "Alpha", colour: "red" },
  { id: "widget:beta0000", name: "Beta", colour: "blue" },
];
const widgetFields: FieldDef<Widget>[] = [
  { key: "name", label: "Name", level: "list", get: (w) => w.name },
  { key: "colour", label: "Colour", level: "details", get: (w) => w.colour },
];
const painted: string[] = [];

const widgetKind: KindSpec = {
  kind: "widget",
  size: { w: 2, h: 1 },
  label: (id) => widgets.find((w) => w.id === id)?.name ?? "?",
  exists: (id) => widgets.some((w) => w.id === id),
  component: (() => {}) as never,
  ids: () => widgets.map((w) => w.id),
  view: viewFrom(widgetFields, (id) => widgets.find((w) => w.id === id)),
  setFlags: [{ name: "colour", description: "Colour", takesValue: true }],
  set: (id, parsed) => {
    const w = widgets.find((x) => x.id === id);
    const colour = parsed.flags.colour;
    if (!w || typeof colour !== "string") return { ok: false, error: "usage: set --colour <c>" };
    w.colour = colour;
    return { ok: true, patch: { colour } };
  },
  actions: [
    {
      name: "paint",
      description: "Paint the widget",
      flags: [{ name: "coat", short: "c", description: "Coat", takesValue: true }],
      run: (id, args, ctx) => {
        painted.push(`${id}:${args.join(" ")}`);
        ctx.print("painted", "output");
      },
    },
  ],
};

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

let off: (() => void) | undefined;
beforeEach(() => {
  off?.();
  workspace.closeAll();
  off = kinds.register(widgetKind);
  painted.length = 0;
  widgets[0].colour = "red";
});

describe("workspace commands against a foreign kind", () => {
  it("imports no data slice (no demo storage keys registered)", () => {
    expect(storage.keys).not.toContain("beastland:data");
    expect(storage.keys).not.toContain("beastland:projects");
  });

  it("#id opens a container and resolves short ids", async () => {
    expect((await run("#al"))[0].text).toMatch(/^selected #alpha000 @1$/);
    expect(workspace.containers[0]).toMatchObject({ kind: "widget", contentId: "widget:alpha000", w: 2, h: 1 });
    expect((await run("#zz"))[0]).toEqual({ text: "unknown id: #zz", kind: "error" });
  });

  it("#id -d prints through `view`", async () => {
    expect((await run("#al -d")).map((l) => l.text)).toEqual(["#alpha000", "  Name    Alpha", "  Colour  red"]);
    expect((await run("#be"))[0].text).toContain("selected");
    expect(workspace.containers).toHaveLength(1); // -d did not open one
  });

  it("@n set goes through the kind's set hook", async () => {
    await run("#al");
    expect((await run("@1 set --colour green"))[0].text).toBe("updated #alpha000: colour=green");
    expect(widgets[0].colour).toBe("green");
    expect((await run("@1 set"))[0]).toEqual({ text: "usage: set --colour <c>", kind: "error" });
  });

  it("kind actions are dispatched from @n and #id, with their own flags", async () => {
    await run("#al");
    expect((await run("@1 paint --coat 2"))[0].text).toBe("painted");
    expect((await run("#be paint"))[0].text).toBe("painted");
    expect(painted).toEqual(["widget:alpha000:--coat 2", "widget:beta0000:"]);
    const at = workspaceCommands.find((c) => c.name === "@<n>")!;
    expect(at.subcommands?.map((s) => s.name)).toEqual(["move", "close", "title", "set", "paint"]);
    expect(flagsFor(at, ["@1", "paint", "--"]).map((f) => f.name)).toEqual(["coat"]);
    expect(flagsFor(at, ["@1", "set", "--"]).map((f) => f.name)).toEqual(["colour"]);
  });

  it("ls and close use the kind's label", async () => {
    await run("#al");
    await run("#be");
    const ls = (await run("ls")).map((l) => l.text);
    expect(ls[0]).toMatch(/^@1\s+#alpha000\s+widget\s+Alpha/);
    expect(ls[1]).toMatch(/^@2\s+#beta0000\s+widget\s+Beta.*\*$/);
    expect((await run("close @1"))[0].text).toBe("closed @1");
    expect(workspace.containers.map((c) => c.id)).toEqual([2]);
  });

  it("# completion offers every registered kind's records", () => {
    expect(recordSuggestions().map((s) => `${s.value} ${s.label} ${s.description}`)).toEqual([
      "#al Alpha widget",
      "#be Beta widget",
    ]);
  });
});
