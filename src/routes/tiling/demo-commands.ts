/**
 * Streaming demo command
 *
 * Not part of the library — a demo, app-layer command showing how a
 * streaming command (an LLM answer, a long-running job's progress…) is
 * built on the primitives in `shell/protocol.ts`: `ctx.print` returns a
 * `LineHandle` to keep mutating one line, `ctx.signal` is aborted on Esc or
 * unmount, and `OutputLine.kind === "prose"` renders inline markdown via
 * `proseSpans`. See the README's "Streaming" section.
 */
import { parseArgs, flag, type Command, type LineHandle } from "$lib/shell/protocol.js";
import { proseSpans } from "$lib/shell/prose.js";

const PLAIN_WORDS =
  "This line is being streamed one word at a time through the handle returned by ctx.print, using append, so the block never gains a second line while it runs and the panel does not scroll on every update — only when the stream settles.".split(
    " ",
  );

const PROSE_WORDS =
  "Streaming can carry **bold** text, inline `code`, refs like #xp, and a fenced command block:\n\n```beast\nls\n```\n\nClick that line to run it, or shift-click to insert it into the prompt — the same behaviour as any other clickable command span in the terminal.".split(
    " ",
  );

/** Rejects `signal.aborted`; resolves after `ms`, cancellable mid-wait. */
function sleep(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(new DOMException("cancelled", "AbortError"));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("cancelled", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export const demoCommands: Command[] = [
  {
    name: "stream",
    description: "Stream sample text (demo of live output)",
    usage: "stream [--prose] [--fail] [--slow]",
    flags: [
      { name: "prose", description: "Stream as a prose line (bold/code/refs/fenced command)" },
      { name: "fail", description: "Throw halfway through, to show an error block" },
      { name: "slow", description: "Use a longer delay between words" },
    ],
    run: async (args, ctx) => {
      const parsed = parseArgs(args);
      const prose = flag(parsed, "prose") !== undefined;
      const fail = flag(parsed, "fail") !== undefined;
      const slow = flag(parsed, "slow") !== undefined;

      const words = prose ? PROSE_WORDS : PLAIN_WORDS;
      const failAt = Math.floor(words.length / 2);
      const delayMs = slow ? 500 : 60;

      let text = "";
      let handle: LineHandle | undefined;
      for (let i = 0; i < words.length; i++) {
        await sleep(delayMs, ctx.signal);
        if (fail && i === failAt) throw new Error("stream failed halfway through");

        text += (text ? " " : "") + words[i];
        const content = prose ? proseSpans(text) : text;
        if (!handle) handle = ctx.print(content, prose ? "prose" : "output");
        else handle.set(content);
      }

      ctx.print("done", "system");
    },
  },
];
