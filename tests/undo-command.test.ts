/**
 * The `undo` shell command: latest/`<id>`, `-l/--list`, completion, and how
 * it reports a refusal (irreversible/expired/guard) with the next-undoable
 * hint.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { runCommand, type CommandContext, type LineHandle, type Span } from "$lib/shell/protocol.js";
import { shellCommands } from "$lib/shell/commands.js";
import { undoStack } from "$lib/shell/undo.svelte.js";

beforeEach(() => undoStack.clear());

const noopHandle: LineHandle = { set: () => {}, append: () => {} };

async function run(line: string): Promise<{ text: string; kind?: string; spans?: Span[] }[]> {
  const lines: { text: string; kind?: string; spans?: Span[] }[] = [];
  const ctx: CommandContext = {
    print: (text, kind) => {
      if (typeof text === "string") lines.push({ text, kind });
      else lines.push({ text: text.map((s) => s.text).join(""), kind, spans: text });
      return noopHandle;
    },
    clear: () => {},
    commands: shellCommands,
    signal: new AbortController().signal,
  };
  await runCommand(line, shellCommands, ctx);
  return lines;
}

describe("undo command", () => {
  it("undoes the latest entry", async () => {
    let undone = false;
    undoStack.push({ label: "close @2 (Acme)", undo: () => { undone = true; } });
    const out = await run("undo");
    expect(undone).toBe(true);
    expect(out[0].text).toBe("undone: close @2 (Acme)");
  });

  it("undoes a specific id, `#`-prefixed or not", async () => {
    const calls: string[] = [];
    const a = undoStack.push({ label: "a", undo: () => { calls.push("a"); } });
    undoStack.push({ label: "b", undo: () => { calls.push("b"); } });
    const out = await run(`undo #${a}`);
    expect(calls).toEqual(["a"]);
    expect(out[0].text).toBe("undone: a");
  });

  it("reports an invalid id", async () => {
    const out = await run("undo not-a-number");
    expect(out[0].kind).toBe("error");
  });

  it("reports irreversible/expired refusals with the next-undoable hint", async () => {
    const olderId = undoStack.push({ label: "older", undo: () => {} });
    undoStack.irreversible("sent email", "can't unsend");
    const out = await run("undo");
    expect(out[0].kind).toBe("error");
    expect(out[0].text).toBe(`cannot undo "sent email": can't unsend (try \`undo ${olderId}\`)`);
  });

  it("-l/--list shows id, label, age and status, muting non-undoable rows", async () => {
    const id = undoStack.push({ label: "move @3", undo: () => {} });
    undoStack.irreversible("sent email", "can't unsend");
    const out = await run("undo -l");
    expect(out.length).toBeGreaterThanOrEqual(2);
    const movedRow = out.find((l) => l.text.includes(`#${id}`))!;
    expect(movedRow.spans?.[0].tone).toBeUndefined();
    const emailRow = out.find((l) => l.text.includes("sent email"))!;
    expect(emailRow.spans?.[0].tone).toBe("muted");
  });

  it("--list is an alias understood the same as -l", async () => {
    undoStack.push({ label: "x", undo: () => {} });
    const out = await run("undo --list");
    expect(out.some((l) => l.text.includes("x"))).toBe(true);
  });

  it("prints a message when there is no history", async () => {
    const out = await run("undo -l");
    expect(out[0].text).toBe("no undo history");
  });

  it("completion offers only undoable ids, with labels", () => {
    const cmd = shellCommands.find((c) => c.name === "undo")!;
    const a = undoStack.push({ label: "alpha", undo: () => {} });
    undoStack.irreversible("beta", "nope");
    const suggestions = cmd.complete!([""], shellCommands);
    expect(suggestions).toEqual([{ value: String(a), label: "alpha", kind: "value" }]);
  });
});
