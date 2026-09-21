/**
 * Streaming primitives at the protocol level: a command drives the
 * `LineHandle` returned by `ctx.print` (from a loop or an async generator,
 * same thing to `runCommand`) and can be cancelled through `ctx.signal`.
 * No Terminal here — a small, real (non-mocked) `CommandContext` over a
 * plain `OutputLine[]` pins what `set`/`append` actually do, independent of
 * how the Terminal happens to implement its own handle.
 */
import { describe, expect, it } from "vitest";
import {
  runCommand,
  type Command,
  type CommandContext,
  type LineHandle,
  type OutputLine,
} from "$lib/shell/protocol.js";

function makeContext(lines: OutputLine[], signal: AbortSignal): CommandContext {
  function handleFor(line: OutputLine): LineHandle {
    return {
      set(text) {
        if (typeof text === "string") {
          line.text = text;
          line.spans = undefined;
        } else {
          line.text = text.map((s) => s.text).join("");
          line.spans = text;
        }
      },
      append(delta) {
        line.text += delta;
        if (line.spans && line.spans.length > 0) line.spans[line.spans.length - 1].text += delta;
      },
    };
  }

  return {
    print: (text, kind = "output", opts) => {
      const line: OutputLine =
        typeof text === "string"
          ? { kind, text }
          : { kind, text: text.map((s) => s.text).join(""), spans: text };
      if (opts?.hang) line.hang = opts.hang;
      lines.push(line);
      return handleFor(line);
    },
    clear: () => {
      lines.length = 0;
    },
    commands: [],
    signal,
  };
}

async function* words(...ws: string[]) {
  for (const w of ws) yield w;
}

describe("streaming via LineHandle", () => {
  it("append grows the line's text as an async generator drives it", async () => {
    const lines: OutputLine[] = [];
    const ctx = makeContext(lines, new AbortController().signal);
    const command: Command = {
      name: "stream",
      description: "",
      run: async (_args, ctx) => {
        const handle = ctx.print("", "output");
        for await (const w of words("hello", " world")) handle.append(w);
      },
    };
    await runCommand("stream", [command], ctx);
    expect(lines).toEqual([{ kind: "output", text: "hello world" }]);
  });

  it("set replaces the text (and spans) in place, keeping kind", async () => {
    const lines: OutputLine[] = [];
    const ctx = makeContext(lines, new AbortController().signal);
    const command: Command = {
      name: "stream",
      description: "",
      run: (_args, ctx) => {
        const handle = ctx.print("loading…", "system");
        handle.set([{ text: "done", tone: "bold" }]);
      },
    };
    await runCommand("stream", [command], ctx);
    expect(lines).toEqual([{ kind: "system", text: "done", spans: [{ text: "done", tone: "bold" }] }]);
  });

  it("append with spans grows the last span's text, not just the plain text", async () => {
    const lines: OutputLine[] = [];
    const ctx = makeContext(lines, new AbortController().signal);
    const command: Command = {
      name: "stream",
      description: "",
      run: (_args, ctx) => {
        const handle = ctx.print([
          { text: "#xp", tone: "id", command: "#xp" },
          { text: " engin" },
        ]);
        handle.append(" kiran");
      },
    };
    await runCommand("stream", [command], ctx);
    expect(lines[0].text).toBe("#xp engin kiran");
    expect(lines[0].spans).toEqual([
      { text: "#xp", tone: "id", command: "#xp" },
      { text: " engin kiran" },
    ]);
  });

  it("an aborted signal is the same object the command sees, and stays aborted", async () => {
    const controller = new AbortController();
    let seenAborted = false;
    const command: Command = {
      name: "check",
      description: "",
      run: (_args, ctx) => {
        seenAborted = ctx.signal.aborted;
      },
    };
    const ctx = makeContext([], controller.signal);
    controller.abort();
    await runCommand("check", [command], ctx);
    expect(seenAborted).toBe(true);
  });

  it("a command that checks ctx.signal.aborted mid-stream rejects with a distinguishable AbortError", async () => {
    const controller = new AbortController();
    const lines: OutputLine[] = [];
    const ctx = makeContext(lines, controller.signal);
    const command: Command = {
      name: "stream",
      description: "",
      run: async (_args, ctx) => {
        const handle = ctx.print("", "output");
        for (const w of ["a", "b", "c"]) {
          if (ctx.signal.aborted) throw new DOMException("cancelled", "AbortError");
          handle.append(w);
          if (w === "a") controller.abort(); // simulates Esc arriving mid-stream
        }
      },
    };
    await expect(runCommand("stream", [command], ctx)).rejects.toMatchObject({ name: "AbortError" });
    // Stopped right after the word that was in flight when the signal fired.
    expect(lines[0].text).toBe("a");
  });

  it("AbortError is distinguishable from an ordinary command failure", async () => {
    const ctx = makeContext([], new AbortController().signal);
    const aborting: Command = { name: "a", description: "", run: () => { throw new DOMException("x", "AbortError"); } };
    const failing: Command = { name: "b", description: "", run: () => { throw new Error("boom"); } };

    await expect(runCommand("a", [aborting], ctx)).rejects.toMatchObject({ name: "AbortError" });
    await expect(runCommand("b", [failing], ctx)).rejects.toMatchObject({ message: "boom" });
    await expect(runCommand("b", [failing], ctx)).rejects.not.toMatchObject({ name: "AbortError" });
  });
});
