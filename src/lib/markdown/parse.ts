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
import { lexer, Marked, type MarkedToken } from "marked";

export type ParseOptions = {
  /**
   * Opt-in `$…$` / `$$…$$` tokenizing (a marked extension registered on a
   * private `Marked` instance, never on the shared default export). Off by
   * default — `$…$` then stays literal text, e.g. `$5 and $10`.
   */
  math?: boolean;
};

/** A block-level `$$…$$` math token, produced only when `{ math: true }`. */
export type MathBlockToken = { type: "mathBlock"; raw: string; tex: string };
/** An inline `$…$` math token, produced only when `{ math: true }`. */
export type MathInlineToken = { type: "mathInline"; raw: string; tex: string };

/**
 * `$$…$$` must sit on its own lines (optionally on a single line). Requires
 * non-space content so an empty `$$$$` never matches.
 */
const MATH_BLOCK_MULTILINE_RE = /^ {0,3}\$\$[ \t]*\n([\s\S]+?)\n {0,3}\$\$(?:\n+|$)/;
const MATH_BLOCK_INLINE_RE = /^\$\$([^\n]+?)\$\$(?:\n+|$)/;

/**
 * `$…$`: requires a non-space character right after the opening `$` and
 * right before the closing `$` (so `$5 and $10` never pairs up — the `$`
 * before `10` has a space right before it), and the closing `$` must not be
 * immediately followed by a digit (so `$5` glued to another `$`-prefixed
 * number doesn't accidentally close early).
 */
const MATH_INLINE_RE = /^\$(?=\S)([^\n$]*?\S)\$(?!\d)/;

function mathExtension() {
  return {
    extensions: [
      {
        name: "mathBlock",
        level: "block" as const,
        start(src: string) {
          return src.match(/\$\$/)?.index;
        },
        tokenizer(src: string): MathBlockToken | undefined {
          const multiline = MATH_BLOCK_MULTILINE_RE.exec(src);
          if (multiline) return { type: "mathBlock", raw: multiline[0], tex: multiline[1].trim() };
          const inline = MATH_BLOCK_INLINE_RE.exec(src);
          if (inline) return { type: "mathBlock", raw: inline[0], tex: inline[1].trim() };
          return undefined;
        },
      },
      {
        name: "mathInline",
        level: "inline" as const,
        start(src: string) {
          return src.match(/\$/)?.index;
        },
        tokenizer(src: string): MathInlineToken | undefined {
          const match = MATH_INLINE_RE.exec(src);
          if (!match) return undefined;
          return { type: "mathInline", raw: match[0], tex: match[1] };
        },
      },
    ],
  };
}

// Built lazily, once: registering a marked extension mutates a `Marked`
// instance, so this stays off the shared default export (never `marked.use`)
// and is only constructed the first time `{ math: true }` is requested.
let mathMarked: Marked | undefined;

function getMathMarked(): Marked {
  if (!mathMarked) {
    mathMarked = new Marked();
    mathMarked.use(mathExtension());
  }
  return mathMarked;
}

/**
 * Lex `source` into marked's token tree, GFM enabled (tables, task lists,
 * strikethrough, autolinks). No HTML is produced — this only tokenizes.
 *
 * Typed as `MarkedToken[]` rather than marked's own (wider) `Token[]`:
 * `Token` also includes `Tokens.Generic`, the shape a custom tokenizer
 * extension produces, which has a non-literal `type: string` and so defeats
 * `switch`/`if` narrowing on every other token's `type` field everywhere it
 * is used. With `{ math: true }` the tree also carries `mathBlock`/
 * `mathInline` tokens (see `MathBlockToken`/`MathInlineToken`) — callers
 * that opt in narrow those out themselves (`Markdown.svelte` does).
 */
export function parseMarkdown(source: string, options?: ParseOptions): MarkedToken[] {
  if (options?.math) {
    const instance = getMathMarked();
    // `instance.lexer(src, opts)` uses `opts` verbatim instead of merging it
    // over `instance.defaults` when `opts` is given — passing `{ gfm: true }`
    // alone would silently drop the registered math extensions. Spreading
    // `instance.defaults` first (already `gfm: true`) keeps both.
    return instance.lexer(source, { ...instance.defaults, gfm: true }) as MarkedToken[];
  }
  return lexer(source, { gfm: true }) as MarkedToken[];
}
