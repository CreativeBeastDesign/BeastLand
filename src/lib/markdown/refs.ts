/**
 * Ref detection and runnable-fence languages for the `Markdown` component.
 *
 * Mirrors the same grammar `$lib/shell/prose.ts` uses for prose lines inside
 * the Terminal (`@12`, `#xp` refs; `beast`/`sh` fences whose lines are
 * commands), so a ref or a runnable line looks and behaves the same whether
 * it came from a streamed prose line or a `Markdown` document. `prose.ts`
 * does not export its regex or fence-language set, so both are duplicated
 * here verbatim — keep them in sync if that grammar ever changes.
 */

/** A ref match (`@12`, `#xp`), word-boundaried so it doesn't fire inside an
 * identifier or an email (`a@b`) and requires at least 2 chars after `#`. */
const REF_RE = /(?<!\w)(@\d+|#[a-z0-9]{2,})\b/g;

export type TextPart = { text: string };
export type RefPart = { ref: string };

/**
 * Split a text run into plain-text and ref parts, in order. A ref part's
 * `ref` is the matched token verbatim (`"@12"`, `"#xp"`), suitable for
 * passing straight to `oncommand`.
 */
export function splitRefs(text: string): Array<TextPart | RefPart> {
  const parts: Array<TextPart | RefPart> = [];
  let last = 0;
  REF_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = REF_RE.exec(text))) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index) });
    parts.push({ ref: match[0] });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

/** Fenced-block info strings whose lines are runnable commands. */
const RUNNABLE_FENCE_LANGS = new Set(["beast", "sh"]);

/**
 * Whether a fence's language (marked's `Tokens.Code.lang`, already narrowed
 * to its first word — see `firstWord` in `Markdown.svelte`) marks its lines
 * as runnable commands, exactly like the Terminal's own `beast`/`sh` fences.
 */
export function isRunnableFence(lang: string | undefined): boolean {
  return lang !== undefined && RUNNABLE_FENCE_LANGS.has(lang);
}
