/**
 * Settings registry: section ordering, the active tab, and the `settings`
 * command opening the tile through the real workspace + kind registry — the
 * same rig `workspace-commands.test.ts` uses for a kind the library has
 * never seen (`CommandContext.print` returns a `LineHandle`, `signal` is
 * required — the `noopHandle` pattern is copied from there).
 *
 * This file deliberately imports `$lib/settings/registry.svelte.js`,
 * `kind.js` and `commands.js` directly rather than `$lib/settings/index.js`,
 * so the library's own "Appearance" section (which self-registers when
 * `index.js` is imported) never enters the registry here — the assertions
 * below stay exact instead of "at least these ids".
 */
import { beforeEach, describe, expect, it } from "vitest";
import { runCommand, type CommandContext, type LineHandle, type Span } from "$lib/shell/protocol.js";
import { settings, type SettingsSection } from "$lib/settings/registry.svelte.js";
import { settingsCommands } from "$lib/settings/commands.js";
import { SETTINGS_CONTENT_ID, settingsKind } from "$lib/settings/kind.js";
import { kinds } from "$lib/tiling/kinds.svelte.js";
import { workspace } from "$lib/tiling/workspace.svelte.js";

const StubComponent = (() => {}) as unknown as SettingsSection["component"];

const noopHandle: LineHandle = { set: () => {}, append: () => {} };

async function run(line: string): Promise<{ text: string; kind?: string }[]> {
  const lines: { text: string; kind?: string }[] = [];
  const ctx: CommandContext = {
    print: (text, kind) => {
      lines.push({ text: typeof text === "string" ? text : (text as Span[]).map((s) => s.text).join(""), kind });
      return noopHandle;
    },
    clear: () => {},
    commands: settingsCommands,
    signal: new AbortController().signal,
  };
  await runCommand(line, settingsCommands, ctx);
  return lines;
}

describe("settings registry", () => {
  it("sorts by order, then label", () => {
    const offB = settings.register({ id: "b-section", label: "Bbb", component: StubComponent, order: 1 });
    const offA = settings.register({ id: "a-section", label: "Aaa", component: StubComponent, order: 1 });
    const offZ = settings.register({ id: "z-section", label: "Zzz", component: StubComponent, order: 0 });

    const ids = settings.all.map((s) => s.id);
    expect(ids.indexOf("z-section")).toBeLessThan(ids.indexOf("a-section"));
    expect(ids.indexOf("a-section")).toBeLessThan(ids.indexOf("b-section"));

    offA();
    offB();
    offZ();
  });

  it("the first registered section becomes active; select() switches it", () => {
    const offA = settings.register({ id: "active-a", label: "A", component: StubComponent });
    expect(settings.active).toBe("active-a");

    const offB = settings.register({ id: "active-b", label: "B", component: StubComponent });
    expect(settings.active).toBe("active-a"); // registering doesn't steal an existing active tab

    expect(settings.select("active-b")).toBe(true);
    expect(settings.active).toBe("active-b");
    expect(settings.select("no-such-section")).toBe(false);
    expect(settings.active).toBe("active-b"); // unchanged on failure

    offB();
    offA();
  });

  it("unregistering the active section falls back to another registered one, then to null", () => {
    const offA = settings.register({ id: "fallback-a", label: "A", component: StubComponent });
    const offB = settings.register({ id: "fallback-b", label: "B", component: StubComponent });
    settings.select("fallback-a");

    offA();
    expect(settings.active).toBe("fallback-b");

    offB();
    expect(settings.active).toBeNull();
  });
});

describe("`settings` command", () => {
  let off: (() => void) | undefined;

  beforeEach(() => {
    workspace.closeAll();
    off = kinds.register(settingsKind);
  });

  it("opens the settings tile via the real workspace + kind registry", async () => {
    const lines = await run("settings");
    expect(lines).toEqual([]); // opening prints nothing on success

    const container = workspace.containers.find((c) => c.kind === "settings");
    expect(container).toBeDefined();
    expect(container?.contentId).toBe(SETTINGS_CONTENT_ID);
    expect(container?.w).toBe(4);
    expect(container?.h).toBe(3);
    expect(workspace.selectedId).toBe(container?.id);

    off?.();
  });

  it("the `prefs` alias re-selects the same tile instead of spawning a second one", async () => {
    await run("settings");
    await run("prefs");
    expect(workspace.containers.filter((c) => c.kind === "settings")).toHaveLength(1);

    off?.();
  });

  it("selects a section by id when given, and errors on an unknown one", async () => {
    const offSection = settings.register({ id: "billing", label: "Billing", component: StubComponent });

    expect(await run("settings billing")).toEqual([]);
    expect(settings.active).toBe("billing");

    expect(await run("settings no-such-section")).toEqual([
      { text: "no such settings section: no-such-section", kind: "error" },
    ]);

    offSection();
    off?.();
  });
});
