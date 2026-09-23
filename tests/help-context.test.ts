/**
 * `-h`/`--help` at any depth of any command, intercepted centrally in
 * `runCommand` before `run` — and `help <command> <args…>`, which renders
 * the exact same thing. Both go through `helpRowsFor`, the contextual
 * twin of the static `helpRows` (`help <command>` with no trailing args,
 * covered by `help.test.ts`).
 */
import { describe, expect, it } from "vitest";
import { helpRowsFor, runCommand, type Command, type CommandContext, type FlagSpec, type Span, type Suggestion } from "$lib/shell/protocol.js";
import { shellCommands } from "$lib/shell/commands.js";

function makeCtx(commands: Command[]): { ctx: CommandContext; lines: string[] } {
  const lines: string[] = [];
  const ctx: CommandContext = {
    print: (t) => {
      lines.push(typeof t === "string" ? t : (t as Span[]).map((s) => s.text).join(""));
      return { set: () => {}, append: () => {} };
    },
    clear: () => {},
    commands,
    signal: new AbortController().signal,
  };
  return { ctx, lines };
}

async function printed(line: string, commands: Command[]): Promise<string[]> {
  const { ctx, lines } = makeCtx(commands);
  await runCommand(line, commands, ctx);
  return lines;
}

/** A `doc`-shaped fixture: static subcommands/flags at the top level, plus
 * dynamic verbs (`send`) and args-dependent flags (`completeFlags`) once a
 * `#id` is given — the exact pattern real slices (`project`, `docs`) use. */
function makeDocCommand(runs: string[][]): Command {
  const sendFlags: FlagSpec[] = [{ name: "now", short: "n", description: "Send immediately" }];
  return {
    name: "doc",
    description: "Manage documents",
    usage: "doc [list|new] | doc <#id> [send]",
    flags: [{ name: "details", short: "d", description: "Show details" }],
    subcommands: [
      { name: "list", description: "List documents" },
      { name: "new", description: "Create a document", flags: [{ name: "title", short: "t", description: "Title", takesValue: true }] },
    ],
    completeFlags: (args) => (args[0]?.startsWith("#") && args[1] === "send" ? sendFlags : null),
    complete: (args): Suggestion[] => {
      if (args.length === 1) return [{ value: "#41e3", label: "Invoice #41", kind: "value" }];
      if (args.length === 2 && args[0]?.startsWith("#")) return [{ value: "send", description: "Send the document", kind: "subcommand" }];
      return [];
    },
    run: (args) => {
      runs.push(args);
    },
  };
}

describe("`-h`/`--help` interception", () => {
  it("doc -h: top-level subcommands + top-level flags", async () => {
    const runs: string[][] = [];
    const commands = [makeDocCommand(runs)];
    const rows = helpRowsFor(commands[0], [], commands);
    const names = (rows.filter((r) => "name" in r) as { name: string }[]).map((r) => r.name);
    expect(names).toEqual(["list", "new", "-d, --details"]);

    const printedLines = await printed("doc -h", commands);
    expect(printedLines[0]).toBe("usage: doc [list|new] | doc <#id> [send]");
    expect(printedLines[1]).toBe("Manage documents");
    expect(printedLines.some((l) => l.includes("list") && l.includes("List documents"))).toBe(true);
    expect(printedLines.some((l) => l.includes("-d, --details"))).toBe(true);
    expect(runs).toEqual([]); // help short-circuits — `run` never fires
  });

  it("doc #41e3 -h: context-specific verbs from `complete`, flags from `completeFlags`", async () => {
    const runs: string[][] = [];
    const commands = [makeDocCommand(runs)];
    const rows = helpRowsFor(commands[0], ["#41e3"], commands);
    const names = (rows.filter((r) => "name" in r) as { name: string }[]).map((r) => r.name);
    // No static `list`/`new` here — those only apply right after the command
    // name, not after a `#id` positional.
    expect(names).toEqual(["send", "-d, --details"]);
    expect(runs).toEqual([]);
  });

  it("doc #41e3 send -h: completeFlags depends on the preceding args", async () => {
    const runs: string[][] = [];
    const commands = [makeDocCommand(runs)];
    const rows = helpRowsFor(commands[0], ["#41e3", "send"], commands);
    const names = (rows.filter((r) => "name" in r) as { name: string }[]).map((r) => r.name);
    expect(names).toEqual(["-n, --now"]); // send's own flag, not `details`
    expect(runs).toEqual([]);
  });

  it("bundles short + long on one row, short first, with a value placeholder", () => {
    const cmd: Command = {
      name: "widgets",
      description: "d",
      flags: [
        { name: "all", short: "a", description: "Show every item (no limit)" },
        { name: "limit", short: "l", description: "Max rows", takesValue: true },
        { name: "quiet", description: "No output" },
      ],
      run: () => {},
    };
    const rows = helpRowsFor(cmd, [], [cmd]).filter((r) => "name" in r) as { name: string }[];
    expect(rows.map((r) => r.name)).toEqual(["-a, --all", "-l, --limit <value>", "--quiet"]);
  });

  it("`help <command> <args…>` matches `<command> <args…> -h` exactly", async () => {
    const runsA: string[][] = [];
    const runsB: string[][] = [];
    const commandsA = [...shellCommands, makeDocCommand(runsA)];
    const commandsB = [makeDocCommand(runsB)];
    const viaHelp = await printed("help doc #41e3", commandsA);
    const viaFlag = await printed("doc #41e3 -h", commandsB);
    expect(viaHelp).toEqual(viaFlag);
  });

  it("does not intercept a quoted -h — it's data, not a flag", async () => {
    const runs: string[][] = [];
    const commands = [makeDocCommand(runs)];
    await printed('doc "-h"', commands);
    // Falls through to normal dispatch: `run` fires with the literal arg.
    expect(runs).toEqual([["-h"]]);
  });

  it("does not hijack a command that declares its own `h` short flag", async () => {
    const runs: string[][][] = [];
    const cmd: Command = {
      name: "resize",
      description: "Resize",
      flags: [{ name: "height", short: "h", description: "Row height", takesValue: true }],
      run: (args) => {
        runs.push([args]);
      },
    };
    await printed("resize -h 4", [cmd]);
    expect(runs).toEqual([[["-h", "4"]]]);
  });

  it("does not hijack a command that declares its own `--help` flag", async () => {
    const runs: string[][] = [];
    const cmd: Command = {
      name: "overlay",
      description: "Show an overlay",
      flags: [{ name: "help", short: "H", description: "Show the in-app help overlay" }],
      run: (args) => {
        runs.push(args);
      },
    };
    await printed("overlay --help", [cmd]);
    expect(runs).toEqual([["--help"]]);
  });

  it("works on prefix commands too (`@n -h`, `#id -h`)", async () => {
    const runs: string[] = [];
    const at: Command = {
      name: "@<n>",
      description: "Select container n",
      match: (t) => /^@\d*$/.test(t),
      flags: [{ name: "width", short: "w", description: "Column width", takesValue: true }],
      subcommands: [{ name: "close", description: "Close it" }],
      run: (args) => {
        runs.push(args.join(" "));
      },
    };
    const rows = helpRowsFor(at, ["@1"], [at]);
    const names = (rows.filter((r) => "name" in r) as { name: string }[]).map((r) => r.name);
    expect(names).toEqual(["close", "-w, --width <value>"]);
    expect(await printed("@1 -h", [at])).toEqual(expect.arrayContaining([expect.stringContaining("usage:")]));
    expect(runs).toEqual([]); // intercepted, `run` never fired
  });
});
