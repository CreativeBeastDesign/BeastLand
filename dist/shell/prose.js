/** Fence info strings whose lines are commands, not code. */
export const RUNNABLE_FENCE_LANGS = new Set(["beast", "sh"]);
const RUNNABLE_FENCE_INFO = RUNNABLE_FENCE_LANGS;
/**
 * A ref (`@12`, `#xp`), word-boundaried so it doesn't fire inside an
 * identifier or an email (`a@b`), and at least 2 chars after `#`. Exported
 * as a source string because every consumer needs its own `lastIndex`; this
 * is the one definition of the grammar, shared with `$lib/markdown/refs.ts`.
 */
export const REF_SOURCE = String.raw `(?<!\w)(@\d+|#[a-z0-9]{2,})\b`;
/** A fresh global matcher for refs. */
export function refMatcher() {
    return new RegExp(REF_SOURCE, "g");
}
/** A ``` fence delimiter line, capturing the (possibly empty) info string. */
const FENCE_RE = /^```(\S*)[ \t]*$/;
/** Split `text` on fenced ``` blocks; everything else stays as prose text. */
function segment(text) {
    const lines = text.split("\n");
    const segments = [];
    let textLines = [];
    const flushText = () => {
        if (textLines.length === 0)
            return;
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
        const body = [];
        i++; // past the opening fence line
        while (i < lines.length && !FENCE_RE.test(lines[i])) {
            body.push(lines[i]);
            i++;
        }
        if (i < lines.length)
            i++; // past the closing fence line (unterminated fences just run to the end)
        segments.push({ kind: "fence", info, body: body.join("\n") });
    }
    flushText();
    return segments;
}
// Tried left-to-right at each position: inline code first, so its content
// never gets a second pass for bold/refs; refs are word-boundaried so they
// don't fire inside identifiers or emails.
const INLINE_RE = new RegExp(String.raw `\`([^\`]+)\`|\*\*([^*]+)\*\*|` + REF_SOURCE, "g");
/** Parse one prose (non-fenced) segment into spans: plain text, bold, code, refs. */
function inlineSpans(text) {
    const spans = [];
    let last = 0;
    INLINE_RE.lastIndex = 0;
    let match = INLINE_RE.exec(text);
    while (match) {
        if (match.index > last)
            spans.push({ text: text.slice(last, match.index) });
        const [full, code, bold, ref] = match;
        if (code !== undefined)
            spans.push({ text: code, tone: "code" });
        else if (bold !== undefined)
            spans.push({ text: bold, tone: "bold" });
        else if (ref !== undefined)
            spans.push({ text: ref, tone: "id", command: ref });
        last = match.index + full.length;
        match = INLINE_RE.exec(text);
    }
    if (last < text.length)
        spans.push({ text: text.slice(last) });
    return spans;
}
/** Is this fence info string one whose lines are commands? */
export function isRunnableFenceInfo(info) {
    return info !== undefined && RUNNABLE_FENCE_INFO.has(info);
}
/** Spans for one runnable fence line: clickable, or struck through with its reason. */
export function commandLineSpans(line, validate) {
    const verdict = validate?.(line) ?? { ok: true };
    if (verdict.ok)
        return [{ text: line, tone: "accent", command: line }];
    return [
        { text: line, tone: "error", strike: true },
        { text: `  ✗ ${verdict.reason}`, tone: "muted" },
    ];
}
/** Parse one fenced block into spans: verbatim `code`, or one clickable span per command line. */
function fenceSpans(info, body, opts) {
    const runnable = RUNNABLE_FENCE_INFO.has(info);
    const lines = body.split("\n");
    const spans = [];
    lines.forEach((line, i) => {
        if (runnable && line.trim().length > 0)
            spans.push(...commandLineSpans(line, opts.validate));
        else
            spans.push({ text: line, tone: "code" });
        if (i < lines.length - 1)
            spans.push({ text: "\n" });
    });
    return spans;
}
/** Turn prose `text` into the `Span[]` the Terminal renders a line from. */
export function proseSpans(text, opts = {}) {
    const spans = [];
    segment(text).forEach((seg, i) => {
        if (i > 0)
            spans.push({ text: "\n" }); // the fence delimiter line's own newline
        spans.push(...(seg.kind === "text" ? inlineSpans(seg.text) : fenceSpans(seg.info, seg.body, opts)));
    });
    return spans;
}
