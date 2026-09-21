/**
 * Prose lines
 *
 * `OutputLine.kind === "prose"` renders in the UI font with light inline
 * markdown instead of the terminal's monospace/pre-wrap output. This module
 * turns that text into the same `Span[]` shape every other output line
 * uses, so the Terminal needs no separate rendering path. Pure — no Svelte
 * imports — so it is unit-testable in Node and reusable outside the
 * Terminal.
 *
 * Handled, deliberately little more: `**bold**`, `` `inline code` `` (mono),
 * fenced ``` blocks (mono/pre; a `beast`/`sh` info string makes each
 * non-empty line a runnable command span, like the existing `beast`/`sh`
 * fences), and refs (`@12`, `#xp`) turned into clickable `id` spans exactly
 * like ids in data output. Not a markdown renderer — no nesting, no lists,
 * no links.
 */
import type { Span } from "./protocol.js";

/** A fenced block's info string that marks its lines as runnable commands. */
const RUNNABLE_FENCE_INFO = new Set(["beast", "sh"]);

/** A ``` fence delimiter line, capturing the (possibly empty) info string. */
const FENCE_RE = /^```(\S*)[ \t]*$/;

type Segment = { kind: "text"; text: string } | { kind: "fence"; info: string; body: string };

/** Split `text` on fenced ``` blocks; everything else stays as prose text. */
function segment(text: string): Segment[] {
  const lines = text.split("\n");
  const segments: Segment[] = [];
  let textLines: string[] = [];

  const flushText = () => {
    if (textLines.length === 0) return;
    segments.push({ kind: "text", text: textLines.join("\n") });
    textLines = [];
  };

  let i = 0;
  while (i < lines.length) {
    const open = FENCE_RE.exec(lines[i]);
    if (!open) {
      textLines.push(lines[i]);
      i++;
      continue;
    }

    flushText();
    const info = open[1] ?? "";
    const body: string[] = [];
    i++; // past the opening fence line
    while (i < lines.length && !FENCE_RE.test(lines[i])) {
      body.push(lines[i]);
      i++;
    }
    if (i < lines.length) i++; // past the closing fence line (unterminated fences just run to the end)
    segments.push({ kind: "fence", info, body: body.join("\n") });
  }
  flushText();
  return segments;
}

// Tried left-to-right at each position: inline code first, so its content
// never gets a second pass for bold/refs; refs are word-boundaried so they
// don't fire inside identifiers or emails.
const INLINE_RE = /`([^`]+)`|\*\*([^*]+)\*\*|(?<!\w)(@\d+|#[a-z0-9]{2,})\b/g;

/** Parse one prose (non-fenced) segment into spans: plain text, bold, code, refs. */
function inlineSpans(text: string): Span[] {
  const spans: Span[] = [];
  let last = 0;
  INLINE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = INLINE_RE.exec(text))) {
    if (match.index > last) spans.push({ text: text.slice(last, match.index) });
    const [full, code, bold, ref] = match;
    if (code !== undefined) spans.push({ text: code, tone: "code" });
    else if (bold !== undefined) spans.push({ text: bold, tone: "bold" });
    else if (ref !== undefined) spans.push({ text: ref, tone: "id", command: ref });
    last = match.index + full.length;
  }
  if (last < text.length) spans.push({ text: text.slice(last) });
  return spans;
}

/** Parse one fenced block into spans: verbatim `code`, or one clickable span per command line. */
function fenceSpans(info: string, body: string): Span[] {
  const runnable = RUNNABLE_FENCE_INFO.has(info);
  const lines = body.split("\n");
  const spans: Span[] = [];
  lines.forEach((line, i) => {
    spans.push(
      runnable && line.trim().length > 0
        ? { text: line, tone: "accent", command: line }
        : { text: line, tone: "code" },
    );
    if (i < lines.length - 1) spans.push({ text: "\n" });
  });
  return spans;
}

/** Turn prose `text` into the `Span[]` the Terminal renders a line from. */
export function proseSpans(text: string): Span[] {
  const spans: Span[] = [];
  segment(text).forEach((seg, i) => {
    if (i > 0) spans.push({ text: "\n" }); // the fence delimiter line's own newline
    spans.push(...(seg.kind === "text" ? inlineSpans(seg.text) : fenceSpans(seg.info, seg.body)));
  });
  return spans;
}
