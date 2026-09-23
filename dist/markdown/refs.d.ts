/**
 * Ref detection and runnable-fence languages for the `Markdown` component.
 *
 * The grammar itself lives in `$lib/shell/prose.ts` (`REF_SOURCE`,
 * `RUNNABLE_FENCE_LANGS`) and is imported here, so a ref or a runnable line
 * behaves the same whether it came from a streamed prose line in the
 * Terminal or from a `Markdown` document — there is one definition to change.
 */
export type TextPart = {
    text: string;
};
export type RefPart = {
    ref: string;
};
/**
 * Split a text run into plain-text and ref parts, in order. A ref part's
 * `ref` is the matched token verbatim (`"@12"`, `"#xp"`), suitable for
 * passing straight to `oncommand`.
 */
export declare function splitRefs(text: string): Array<TextPart | RefPart>;
/**
 * Whether a fence's language (marked's `Tokens.Code.lang`, already narrowed
 * to its first word — see `firstWord` in `Markdown.svelte`) marks its lines
 * as runnable commands, exactly like the Terminal's own `beast`/`sh` fences.
 */
export declare function isRunnableFence(lang: string | undefined): boolean;
