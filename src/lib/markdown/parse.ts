/**
 * Markdown parsing for the `Markdown` component — pure, no Svelte imports.
 *
 * Wraps `marked`'s lexer so the component (and anything else) works with a
 * plain token tree (`Token[]`) instead of an HTML string. The component
 * renders that tree through Svelte snippets, so nothing here ever touches
 * `{@html}`: raw HTML tokens are handled (escaped or dropped — see
 * `Markdown.svelte`) at render time, not at parse time.
 *
 * `mangle`/`headerIds` do not need to be disabled — marked removed both
 * legacy options years ago (mailto autolinks are never obfuscated, headings
 * never get an `id`, and `Markdown.svelte` renders headings with no `id`
 * regardless).
 */
import { lexer, type MarkedToken } from "marked";

/**
 * Lex `source` into marked's token tree, GFM enabled (tables, task lists,
 * strikethrough, autolinks). No HTML is produced — this only tokenizes.
 *
 * Typed as `MarkedToken[]` rather than marked's own (wider) `Token[]`:
 * `Token` also includes `Tokens.Generic`, the shape a custom tokenizer
 * extension produces, which has a non-literal `type: string` and so defeats
 * `switch`/`if` narrowing on every other token's `type` field everywhere it
 * is used. Nothing here registers an extension (no `options.extensions`),
 * so every token this lexer ever produces is a `MarkedToken` — the cast is
 * exact, not a lie.
 */
export function parseMarkdown(source: string): MarkedToken[] {
  return lexer(source, { gfm: true }) as MarkedToken[];
}
