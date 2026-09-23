/**
 * Ref detection and runnable-fence languages for the `Markdown` component.
 *
 * The grammar itself lives in `$lib/shell/prose.ts` (`REF_SOURCE`,
 * `RUNNABLE_FENCE_LANGS`) and is imported here, so a ref or a runnable line
 * behaves the same whether it came from a streamed prose line in the
 * Terminal or from a `Markdown` document — there is one definition to change.
 */
import { REF_SOURCE, RUNNABLE_FENCE_LANGS, refMatcher } from "../shell/prose.js";
const REF_RE = refMatcher();
/**
 * Split a text run into plain-text and ref parts, in order. A ref part's
 * `ref` is the matched token verbatim (`"@12"`, `"#xp"`), suitable for
 * passing straight to `oncommand`.
 */
export function splitRefs(text) {
    const parts = [];
    let last = 0;
    REF_RE.lastIndex = 0;
    let match = REF_RE.exec(text);
    while (match) {
        if (match.index > last)
            parts.push({ text: text.slice(last, match.index) });
        parts.push({ ref: match[0] });
        last = match.index + match[0].length;
        match = REF_RE.exec(text);
    }
    if (last < text.length)
        parts.push({ text: text.slice(last) });
    return parts;
}
/**
 * Whether a fence's language (marked's `Tokens.Code.lang`, already narrowed
 * to its first word — see `firstWord` in `Markdown.svelte`) marks its lines
 * as runnable commands, exactly like the Terminal's own `beast`/`sh` fences.
 */
export function isRunnableFence(lang) {
    return lang !== undefined && RUNNABLE_FENCE_LANGS.has(lang);
}
