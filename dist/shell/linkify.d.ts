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
/** A run of text, optionally a link (`href` set — always `http:`/`https:`). */
export type LinkifyPart = {
    text: string;
    href?: string;
};
/** Whether `href` is safe to render as a real, clickable link. */
export declare function isAllowedLinkHref(href: string): boolean;
/**
 * Split `text` into plain-text and link parts. Parts with no `href` are
 * plain text; parts with `href` are a detected URL (trimmed of trailing
 * punctuation) and should render as a link. Returns `[{ text }]` unchanged
 * when nothing matches.
 */
export declare function linkify(text: string): LinkifyPart[];
