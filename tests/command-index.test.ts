import { describe, expect, it } from "vitest";
import { indexCommands } from "$lib/shell/command-index.js";
import { matchCommand, type Command } from "$lib/shell/protocol.js";
import { candidatesFor } from "$lib/shell/completion.js";

const noop = () => {};

describe("indexCommands", () => {
  it("indexes name and every alias to the command", () => {
    const cmd: Command = { name: "customer", aliases: ["c", "cust"], description: "", run: noop };
    const { byName, matchers } = indexCommands([cmd]);
    expect(byName.get("customer")).toBe(cmd);
    expect(byName.get("c")).toBe(cmd);
    expect(byName.get("cust")).toBe(cmd);
    expect(matchers).toEqual([]);
  });

  it("collects commands with a `match` predicate as matchers, in order", () => {
    const a: Command = { name: "@<n>", description: "", match: (t) => /^@\d*$/.test(t), run: noop };
    const b: Command = { name: "#<id>", description: "", match: (t) => /^#/.test(t), run: noop };
    const plain: Command = { name: "customer", description: "", run: noop };
    const { matchers } = indexCommands([plain, a, b]);
    expect(matchers).toEqual([a, b]);
  });

  it("first registration wins for duplicate names/aliases (matches Array.find precedence)", () => {
    const first: Command = { name: "dup", description: "", run: noop };
    const second: Command = { name: "dup", description: "", run: noop };
    const { byName } = indexCommands([first, second]);
    expect(byName.get("dup")).toBe(first);

    const withAliasClash: Command = { name: "other", description: "", aliases: ["dup"], run: noop };
    const { byName: byName2 } = indexCommands([first, withAliasClash]);
    expect(byName2.get("dup")).toBe(first);
  });

  it("memoises by array identity: same array reference returns the same index", () => {
    const commands: Command[] = [{ name: "a", description: "", run: noop }];
    const first = indexCommands(commands);
    const second = indexCommands(commands);
    expect(second).toBe(first);
  });

  it("does not reuse a stale index across two different array instances with the same contents", () => {
    const cmdsA: Command[] = [{ name: "a", description: "", run: noop }];
    const cmdsB: Command[] = [{ name: "b", description: "", run: noop }];
    const idxA = indexCommands(cmdsA);
    const idxB = indexCommands(cmdsB);
    expect(idxA).not.toBe(idxB);
    expect(idxA.byName.has("b")).toBe(false);
    expect(idxB.byName.has("a")).toBe(false);
  });

  it("a fresh array built with the same commands after a registry-style rebuild is indexed independently", () => {
    // Mirrors registry.svelte.ts: `[...shellCommands, ...extensions.flat()]`
    // returns a brand-new array whenever the registered set changes, so the
    // WeakMap must key on that new identity rather than stale content.
    const base: Command[] = [{ name: "a", description: "", run: noop }];
    const rebuiltSame = [...base];
    const rebuiltWithExtra = [...base, { name: "b", description: "", run: noop }];
    const idx1 = indexCommands(rebuiltSame);
    const idx2 = indexCommands(rebuiltWithExtra);
    expect(idx1.byName.has("b")).toBe(false);
    expect(idx2.byName.has("b")).toBe(true);
  });
});

describe("matchCommand precedence via the index", () => {
  const cmds: Command[] = [
    { name: "customer", description: "", aliases: ["c"], run: noop },
    { name: "@<n>", description: "", match: (t) => /^@\d*$/.test(t), run: noop },
  ];

  it("exact name/alias wins over a prefix matcher", () => {
    expect(matchCommand("c list", cmds)?.command.name).toBe("customer");
  });

  it("falls back to a prefix matcher when no exact name/alias hits", () => {
    expect(matchCommand("@2 -w 4", cmds)?.command.name).toBe("@<n>");
    expect(matchCommand("@2 -w 4", cmds)?.args).toEqual(["@2", "-w", "4"]);
  });

  it("unknown input matches nothing", () => {
    expect(matchCommand("nope", cmds)).toBeNull();
  });
});

describe("completion candidate lookup via the index", () => {
  it("still resolves the command by name/alias before falling back to match()", () => {
    const cmds: Command[] = [
      { name: "customer", aliases: ["c"], description: "", run: noop, subcommands: [{ name: "list", description: "" }] },
      { name: "@<n>", description: "", match: (t) => /^@\d*$/.test(t), run: noop },
    ];
    const out = candidatesFor("c ", cmds);
    expect(out.some((s) => s.value === "list")).toBe(true);
  });
});
