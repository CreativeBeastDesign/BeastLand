/**
 * Auto-linkify plain text
 *
 * Pure, no DOM: detects absolute `http://`/`https://` URLs inside a string
 * and splits it into plain-text and link parts. The Terminal renders the
 * link parts as real `<a target="_blank" rel="noopener noreferrer">`
 * elements — this module only decides *what* counts as a URL and where it
 * ends.
 *
 * Scheme allowlist: `isAllowedLinkHref` is the single gate the Terminal (and
 * `Span.href`) checks at render time. Only `http:`/`https:` are ever
 * honoured — never `javascript:`, `data:`, or anything else — so a command
 * cannot smuggle a dangerous scheme into a clickable line, whether through
 * `linkify` (which only ever matches those two schemes to begin with) or an
 * explicit `Span.href` a command sets by hand.
 */
/** Whether `href` is safe to render as a real, clickable link. */
export function isAllowedLinkHref(href) {
    return /^https?:\/\//i.test(href);
}
// `\b` before the scheme keeps "xhttps://…" (part of a larger word) from
// matching; `[^\s<>]+` stops at whitespace and angle brackets (never part of
// a bare URL, and how it'd be wrapped in `<…>` autolink notation).
const URL_RE = /\bhttps?:\/\/[^\s<>]+/g;
const TRAILING_CHARS = new Set([".", ",", ";", ":", "!", "?", "'", '"', "*"]);
/**
 * Trim trailing punctuation that reads as prose, not URL — `.`, `,`, `)`
 * after a sentence, etc. `)`/`]` use a balanced-count rule (GitHub's): a
 * trailing close is kept when the URL itself has at least as many opens as
 * closes (e.g. `en.wikipedia.org/wiki/Foo_(bar)`), and stripped otherwise
 * (e.g. the URL was itself inside `(…)` in the surrounding prose).
 */
function trimTrailingPunctuation(url) {
    let end = url.length;
    while (end > 0) {
        const ch = url[end - 1];
        if (ch === ")" || ch === "]") {
            const open = ch === ")" ? "(" : "[";
            const slice = url.slice(0, end);
            const opens = (slice.match(new RegExp(`\\${open}`, "g")) ?? []).length;
            const closes = (slice.match(new RegExp(`\\${ch}`, "g")) ?? []).length;
            if (closes <= opens)
                break;
            end--;
            continue;
        }
        if (TRAILING_CHARS.has(ch)) {
            end--;
            continue;
        }
        break;
    }
    return url.slice(0, end);
}
/**
 * Split `text` into plain-text and link parts. Parts with no `href` are
 * plain text; parts with `href` are a detected URL (trimmed of trailing
 * punctuation) and should render as a link. Returns `[{ text }]` unchanged
 * when nothing matches.
 */
export function linkify(text) {
    const parts = [];
    let lastIndex = 0;
    for (const match of text.matchAll(URL_RE)) {
        const start = match.index ?? 0;
        const raw = match[0];
        const url = trimTrailingPunctuation(raw);
        if (url.length === 0)
            continue;
        if (start > lastIndex)
            parts.push({ text: text.slice(lastIndex, start) });
        parts.push({ text: url, href: url });
        const trailing = raw.slice(url.length);
        if (trailing.length > 0)
            parts.push({ text: trailing });
        lastIndex = start + raw.length;
    }
    if (lastIndex < text.length)
        parts.push({ text: text.slice(lastIndex) });
    return parts.length > 0 ? parts : [{ text }];
}
