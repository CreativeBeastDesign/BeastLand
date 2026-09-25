/**
 * Cases slice: the `cases` store (register/replace/unregister/get/attach)
 * and `case list`/`case open`/`case toc` output shape. Mirrors
 * `tests/project.test.ts` (store) and `tests/workspace-commands.test.ts`
 * (command dispatch against a real `KindSpec`).
 */
import { beforeEach, describe, expect, it } from "vitest";
import type { Component } from "svelte";
import { runCommand, type CommandContext, type LineHandle, type Span } from "$lib/shell/protocol.js";
import { cases } from "$lib/cases/store.svelte.js";
import { caseKind, caseContentId, slugOf } from "$lib/cases/kind.js";
import { caseCommands } from "$lib/cases/commands.js";
import { kinds } from "$lib/tiling/kinds.svelte.js";
import { workspace } from "$lib/tiling/workspace.svelte.js";
import type { CaseEntry } from "$lib/cases/types.js";

const stub = (() => {}) as unknown as Component<Record<string, never>>;

function entry(slug: string, overrides: Partial<CaseEntry> = {}): CaseEntry {
  return {
    slug,
    title: `Case ${slug}`,
    standfirst: `Standfirst for ${slug}`,
    tags: ["demo"],
    component: stub,
    ...overrides,
  };
}

const noopHandle: LineHandle = { set: () => {}, append: () => {} };

async function run(line: string): Promise<{ text: string; kind?: string; spans?: Span[] }[]> {
  const lines: { text: string; kind?: string; spans?: Span[] }[] = [];
  const ctx: CommandContext = {
    print: (text, kind) => {
      const spans = typeof text === "string" ? undefined : (text as Span[]);
      lines.push({ text: typeof text === "string" ? text : spans!.map((s) => s.text).join(""), kind, spans });
      return noopHandle;
    },
    clear: () => {},
    commands: caseCommands,
    signal: new AbortController().signal,
  };
  await runCommand(line, caseCommands, ctx);
  return lines;
}

let offKind: (() => void) | undefined;
beforeEach(() => {
  offKind?.();
  workspace.closeAll();
  offKind = kinds.register(caseKind);
});

describe("cases store", () => {
  it("registers entries and lists their slugs", () => {
    const off = cases.register([entry("swsk"), entry("reco")]);
    expect(cases.slugs().sort()).toEqual(["reco", "swsk"]);
    expect(cases.get("swsk")?.title).toBe("Case swsk");
    off();
  });

  it("register replaces an existing entry with the same slug", () => {
    const off1 = cases.register(entry("swsk", { title: "First" }));
    const off2 = cases.register(entry("swsk", { title: "Second" }));
    expect(cases.entries.filter((e) => e.slug === "swsk")).toHaveLength(1);
    expect(cases.get("swsk")?.title).toBe("Second");
    off2();
    off1();
  });

  it("unregister removes exactly the entries that call added", () => {
    const off = cases.register([entry("a"), entry("b")]);
    expect(cases.slugs()).toContain("a");
    off();
    expect(cases.slugs()).not.toContain("a");
    expect(cases.slugs()).not.toContain("b");
  });

  it("get returns undefined for an unknown slug", () => {
    expect(cases.get("nope")).toBeUndefined();
  });

  it("attach publishes an outline handle; detaching removes it", () => {
    const handle = { entries: () => [], activeId: () => null, goto: () => {} };
    const detach = cases.attach("swsk", handle);
    expect(cases.outline("swsk")).toBe(handle);
    detach();
    expect(cases.outline("swsk")).toBeUndefined();
  });

  it("detach is a no-op once a newer attach has replaced it", () => {
    const first = { entries: () => [], activeId: () => null, goto: () => {} };
    const second = { entries: () => [], activeId: () => null, goto: () => {} };
    const detachFirst = cases.attach("swsk", first);
    cases.attach("swsk", second);
    detachFirst();
    expect(cases.outline("swsk")).toBe(second);
  });
});

describe("caseKind", () => {
  it("caseContentId / slugOf round-trip", () => {
    expect(caseContentId("swsk")).toBe("case:swsk");
    expect(slugOf("case:swsk")).toBe("swsk");
  });

  it("label/exists/view read through the store", () => {
    const off = cases.register(entry("swsk", { metric: { label: "users", value: "12k" } }));
    const id = caseContentId("swsk");
    expect(caseKind.label(id)).toBe("Case swsk");
    expect(caseKind.exists(id)).toBe(true);
    expect(caseKind.exists(caseContentId("nope"))).toBe(false);
    expect(caseKind.view?.(id, "list")).toEqual([{ label: "Title", value: "Case swsk" }]);
    const full = caseKind.view?.(id, "full") ?? [];
    expect(full.map((r) => r.label)).toEqual(["Title", "Standfirst", "Tags", "users"]);
    off();
  });
});

describe("case list / open / toc", () => {
  it("case list prints (no cases) when nothing is registered", async () => {
    expect((await run("case list"))[0].text).toBe("(no cases)");
  });

  it("case list prints one row per case, id first, standfirst last", async () => {
    const off = cases.register([entry("swsk", { title: "Swiss Kiosk" }), entry("reco", { title: "Recommendation" })]);
    const lines = await run("case list");
    expect(lines).toHaveLength(2);
    expect(lines[0].text).toContain("#swsk");
    expect(lines[0].text).toContain("Swiss Kiosk");
    expect(lines[0].text).toContain("Standfirst for swsk");
    off();
  });

  it("bare `case` defaults to list", async () => {
    const off = cases.register(entry("swsk"));
    expect((await run("case"))[0].text).toContain("#swsk");
    off();
  });

  it("case open spawns/opens a container and prints a confirmation", async () => {
    const off = cases.register(entry("swsk"));
    const lines = await run("case open swsk");
    expect(lines[0].text).toMatch(/^selected #swsk @1$/);
    expect(workspace.containers[0]).toMatchObject({ kind: "case", contentId: "case:swsk" });
    off();
  });

  it("case open reports an unknown slug", async () => {
    expect((await run("case open nope"))[0]).toEqual({ text: "unknown case: nope", kind: "error", spans: undefined });
  });

  it("case toc requires a slug or a selected case tile", async () => {
    expect((await run("case toc"))[0].kind).toBe("error");
  });

  it("case toc prints the attached outline as clickable rows", async () => {
    const off = cases.register(entry("swsk"));
    const detach = cases.attach("swsk", {
      entries: () => [
        { id: "intro", label: "Introduction", level: 2, number: "01" },
        { id: "details", label: "Details", level: 2, number: "02" },
      ],
      activeId: () => null,
      goto: () => {},
    });
    const lines = await run("case toc swsk");
    expect(lines.map((l) => l.text)).toEqual(["01 Introduction", "02 Details"]);
    expect(lines[0].spans?.[0].command).toBe("#swsk goto intro");
    detach();
    off();
  });

  it("case toc prints (no outline) when the case has no attached tile", async () => {
    const off = cases.register(entry("swsk"));
    expect((await run("case toc swsk"))[0].text).toBe("(no outline)");
    off();
  });
});
