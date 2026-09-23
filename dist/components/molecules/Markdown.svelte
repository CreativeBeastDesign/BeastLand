<!-- src/lib/components/molecules/Markdown.svelte -->

<script lang="ts">
  /**
   * Renders a Markdown document safe by construction: `parseMarkdown` hands
   * back marked's token tree (no HTML string ever exists), and every token
   * is rendered through a Svelte snippet below — text is always Svelte text
   * interpolation (auto-escaped), never `{@html}`. A raw HTML *tag* token
   * (`` <b> `` typed inline) renders as escaped text, so it shows up
   * literally instead of being interpreted; a raw HTML *block* token (a
   * stray `<div>…</div>` at the top level) is dropped instead — a block of
   * foreign markup has no safe plain-text rendering worth showing in a tile.
   *
   * Refs (`@12`, `#xp`) inside text and fenced `beast`/`sh` command lines
   * behave exactly like the Terminal's own prose lines (`$lib/shell/prose.ts`):
   * click runs the command through `oncommand`, ⇧-click inserts it. Without
   * `oncommand` they render as plain, inert text — same fallback RecordView
   * uses for its `command` fields.
   *
   * Images are never fetched: `![alt](src)` renders as a link to `src`
   * (opens in a new tab) instead of an `<img>`, so a document rendered in a
   * tile never triggers a remote image load.
   *
   * `highlight` is an optional pluggable syntax highlighter for *non*-runnable
   * fences — the kit ships none. It returns either spans (`{ text, tone? }`)
   * or a plain string (rendered verbatim, no colour). A span's `tone` maps to
   * a CSS custom property the host app defines (`--md-hl-<tone>`); with none
   * defined the text just inherits the surrounding colour.
   */
  import { parseMarkdown } from "../../markdown/parse.js";
  import { splitRefs, isRunnableFence } from "../../markdown/refs.js";
  import type { LineVerdict } from "../../shell/prose.js";
  import type { MarkedToken, Token, Tokens } from "marked";

  import Surface from "../atoms/Surface.svelte";

  export type HighlightSpan = { text: string; tone?: string };

  type Props = {
    source: string;
    /** Activated by a ref click/⇧-click and by a runnable fence line. Absent
     * → refs and fence lines render as plain, inert text. */
    oncommand?: (command: string, mode: "run" | "insert") => void;
    /** Optional syntax highlighter for non-runnable fences. */
    highlight?: (code: string, lang: string | undefined) => HighlightSpan[] | string;
    /** Tighter spacing for tiles. */
    compact?: boolean;
    /**
     * Validate each runnable fence line before it becomes clickable (same
     * hook as `proseSpans`' `validate`). Invalid lines render struck through
     * with their reason and carry no command.
     */
    validateLine?: (line: string) => LineVerdict;
  };

  let { source, oncommand, highlight, compact = false, validateLine }: Props = $props();

  let tokens = $derived(parseMarkdown(source));

  function activate(event: MouseEvent, command: string) {
    event.stopPropagation(); // don't also select the tile
    oncommand?.(command, event.shiftKey ? "insert" : "run");
  }

  /** A fence's info string can carry more than the language (marked keeps it
   * verbatim, e.g. `beast title="demo"`); only the first word is the
   * language, matching `$lib/shell/prose.ts`'s single-word fence grammar. */
  function firstWord(info: string | undefined): string | undefined {
    const word = (info ?? "").trim().split(/\s+/)[0];
    return word ? word : undefined;
  }

  /** `href` values shaped exactly like a ref (`#xp`, `@2`) become a command
   * click instead of a navigable link — there is nothing to navigate to in a
   * tile anyway, and it is what the author almost certainly meant. */
  function bareRefHref(href: string): string | null {
    return /^@\d+$/.test(href) || /^#[a-z0-9]{2,}$/.test(href) ? href : null;
  }

  const NUMERIC_RE = /^-?\d+(\.\d+)?$/;

  function isNumericColumn(rows: Tokens.TableCell[][], col: number): boolean {
    if (rows.length === 0) return false;
    return rows.every((row) => NUMERIC_RE.test((row[col]?.text ?? "").trim()));
  }

  function cellAlign(cell: Tokens.TableCell, numericCol: boolean): "left" | "center" | "right" {
    return cell.align ?? (numericCol ? "right" : "left");
  }

  /**
   * `.tokens` fields on marked's own interfaces (`Strong.tokens`,
   * `Link.tokens`, `ListItem.tokens`, `TableCell.tokens`…) are declared as
   * the wider `Token[]`, which also includes `Tokens.Generic` — the shape a
   * custom tokenizer extension produces. `parseMarkdown` never registers an
   * extension, so every element reaching this component really is a
   * `MarkedToken`; this cast makes that narrowable again at each call site
   * instead of fighting `Generic`'s non-literal `type: string` everywhere.
   */
  function asTokens(list: Token[] | undefined): MarkedToken[] {
    return (list ?? []) as MarkedToken[];
  }
</script>

{#snippet refButton(ref: string)}
  {#if oncommand}
    <button type="button" class="markdown__ref" onclick={(event) => activate(event, ref)}>{ref}</button>
  {:else}
    <span class="markdown__ref markdown__ref--static">{ref}</span>
  {/if}
{/snippet}

{#snippet refText(text: string)}
  {#each splitRefs(text) as part, i (i)}
    {#if "ref" in part}{@render refButton(part.ref)}{:else}{part.text}{/if}
  {/each}
{/snippet}

{#snippet inlineList(list: MarkedToken[])}
  {#each list as token, i (i)}
    {@render inlineToken(token)}
  {/each}
{/snippet}

{#snippet inlineToken(token: MarkedToken)}
  {#if token.type === "text"}
    {#if token.tokens && token.tokens.length > 0}
      {@render inlineList(asTokens(token.tokens))}
    {:else}
      {@render refText(token.text)}
    {/if}
  {:else if token.type === "strong"}
    <strong class="markdown__strong">{@render inlineList(asTokens(token.tokens))}</strong>
  {:else if token.type === "em"}
    <em class="markdown__em">{@render inlineList(asTokens(token.tokens))}</em>
  {:else if token.type === "del"}
    <del class="markdown__del">{@render inlineList(asTokens(token.tokens))}</del>
  {:else if token.type === "codespan"}
    <code class="markdown__codespan">{token.text}</code>
  {:else if token.type === "br"}
    <br />
  {:else if token.type === "escape"}
    {token.text}
  {:else if token.type === "link"}
    {@const bare = bareRefHref(token.href)}
    {#if bare}
      {@render refButton(bare)}
    {:else}
      <a class="markdown__link" href={token.href} title={token.title ?? undefined} target="_blank" rel="noopener noreferrer"
        >{@render inlineList(asTokens(token.tokens))}</a
      >
    {/if}
  {:else if token.type === "image"}
    <a class="markdown__image-link" href={token.href} title={token.title ?? undefined} target="_blank" rel="noopener noreferrer">
      <svg class="markdown__image-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 16l5-5 4 4 3-3 6 6" />
        <circle cx="8.5" cy="8.5" r="1.5" />
      </svg>
      <span>{token.text || token.href}</span>
    </a>
  {:else if token.type === "html"}
    {token.raw}
  {/if}
{/snippet}

{#snippet fenceBody(token: Tokens.Code, lang: string | undefined)}
  {#if isRunnableFence(lang)}
    {#each token.text.split("\n") as line, i (i)}{#if i > 0}{"\n"}{/if}{#if line.trim().length > 0 && oncommand}{@const verdict = validateLine?.(line) ?? { ok: true }}{#if verdict.ok}<button
          type="button"
          class="markdown__fence-line"
          onclick={(event) => activate(event, line)}>{line}</button
        >{:else}<s class="markdown__fence-line--invalid">{line}</s><span class="markdown__fence-reason">  ✗ {verdict.reason}</span>{/if}{:else}{line}{/if}{/each}
  {:else if highlight}
    {@const result = highlight(token.text, lang)}
    {#if typeof result === "string"}{result}{:else}{#each result as span, i (i)}<span
          style={span.tone ? `color: var(--md-hl-${span.tone}, inherit)` : undefined}>{span.text}</span
        >{/each}{/if}
  {:else}
    {token.text}
  {/if}
{/snippet}

{#snippet listItemBody(item: Tokens.ListItem)}
  {#each asTokens(item.tokens) as child, i (i)}
    {#if child.type === "text"}
      {@render inlineList(child.tokens && child.tokens.length > 0 ? asTokens(child.tokens) : [child])}
    {:else}
      {@render blockToken(child)}
    {/if}
  {/each}
{/snippet}

{#snippet listItem(item: Tokens.ListItem)}
  <li class="markdown__list-item" class:markdown__list-item--task={item.task}>
    {#if item.task}
      <input
        type="checkbox"
        class="markdown__task-checkbox"
        checked={item.checked ?? false}
        aria-checked={item.checked ?? false}
        disabled
      />
    {/if}
    <span class="markdown__list-item-body">{@render listItemBody(item)}</span>
  </li>
{/snippet}

{#snippet blockList(list: MarkedToken[])}
  {#each list as token, i (i)}
    {@render blockToken(token)}
  {/each}
{/snippet}

{#snippet blockToken(token: MarkedToken)}
  {#if token.type === "heading"}
    {@const depth = Math.min(Math.max(token.depth, 1), 4)}
    <svelte:element this={`h${depth}`} class="markdown__heading markdown__heading--{depth}"
      >{@render inlineList(asTokens(token.tokens))}</svelte:element
    >
  {:else if token.type === "paragraph"}
    <p class="markdown__p">{@render inlineList(asTokens(token.tokens))}</p>
  {:else if token.type === "blockquote"}
    <blockquote class="markdown__blockquote">{@render blockList(asTokens(token.tokens))}</blockquote>
  {:else if token.type === "hr"}
    <hr class="markdown__hr" />
  {:else if token.type === "list"}
    {#if token.ordered}
      <ol class="markdown__list" start={token.start === "" ? undefined : token.start}>
        {#each token.items as item, i (i)}{@render listItem(item)}{/each}
      </ol>
    {:else}
      <ul class="markdown__list">
        {#each token.items as item, i (i)}{@render listItem(item)}{/each}
      </ul>
    {/if}
  {:else if token.type === "table"}
    {@const numericCols = token.header.map((_, col) => isNumericColumn(token.rows, col))}
    <div class="markdown__table-wrap">
      <table class="markdown__table">
        <thead>
          <tr>
            {#each token.header as cell, i (i)}
              {@const align = cellAlign(cell, numericCols[i])}
              <th class="markdown__th" class:markdown__th--numeric={align === "right"} style="text-align: {align}"
                >{@render inlineList(asTokens(cell.tokens))}</th
              >
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each token.rows as row, ri (ri)}
            <tr>
              {#each row as cell, ci (ci)}
                {@const align = cellAlign(cell, numericCols[ci])}
                <td class="markdown__td" class:markdown__td--numeric={align === "right"} style="text-align: {align}"
                  >{@render inlineList(asTokens(cell.tokens))}</td
                >
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else if token.type === "code"}
    {@const lang = firstWord(token.lang)}
    <Surface radius="control" class="markdown__fence">
      {#if lang}<span class="markdown__fence-lang">{lang}</span>{/if}
      <pre class="markdown__fence-pre"><code class="markdown__fence-code">{@render fenceBody(token, lang)}</code></pre>
    </Surface>
  {:else if token.type === "space" || token.type === "def" || token.type === "html"}
    <!-- space: layout only, nothing to render. def: a link/image reference
         definition, already resolved into the link/image tokens that use
         it. html (block): dropped — see the component doc comment above. -->
  {/if}
{/snippet}

<div class="markdown" class:markdown--compact={compact}>
  {@render blockList(tokens)}
</div>

<style>
  .markdown {
    display: flex;
    flex-direction: column;
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    line-height: 1.6;
    color: var(--color-text-med);
  }

  .markdown > :global(*) {
    margin: 0 0 var(--space-3);
  }

  .markdown > :global(*:last-child) {
    margin-bottom: 0;
  }

  .markdown--compact > :global(*) {
    margin-bottom: var(--space-2);
  }

  /* --- Headings --- */
  .markdown__heading {
    margin-top: 0;
    font-family: var(--font-ui);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-high);
    line-height: 1.3;
  }

  .markdown__heading--1 {
    font-size: calc(var(--text-lg) * 1.2);
  }

  .markdown__heading--2 {
    font-size: var(--text-lg);
  }

  .markdown__heading--3 {
    font-size: calc(var(--text-base) * 1.125);
  }

  .markdown__heading--4 {
    font-size: var(--text-base);
  }

  /* --- Paragraph & inline --- */
  .markdown__p {
    margin: 0;
  }

  .markdown__strong {
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-high);
  }

  .markdown__em {
    font-style: italic;
  }

  .markdown__del {
    text-decoration: line-through;
    color: var(--color-text-low);
  }

  .markdown__codespan {
    font-family: var(--font-mono);
    font-size: 0.9em;
    padding: 0.05em 0.35em;
    border-radius: var(--radius-xs, var(--radius-control));
    background: var(--color-surface-1);
    color: var(--color-text-high);
  }

  .markdown__link {
    color: var(--color-secondary, var(--color-accent));
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 0.15em;
    text-decoration-color: color-mix(in oklab, currentColor 35%, transparent);
    transition: text-decoration-color var(--duration-normal, 0.15s) var(--ease-out, ease);
  }

  .markdown__link:hover,
  .markdown__link:focus-visible {
    text-decoration-color: currentColor;
  }

  .markdown__image-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    color: var(--color-text-low);
    text-decoration: underline dotted;
    text-underline-offset: 0.15em;
  }

  .markdown__image-link:hover,
  .markdown__image-link:focus-visible {
    color: var(--color-text-high);
  }

  .markdown__image-icon {
    flex: none;
  }

  /* Refs: same "id" treatment as elsewhere (RecordView links, Terminal id
     spans) — a real button so it is keyboard-focusable, styled as text. */
  .markdown__ref {
    all: unset;
    cursor: pointer;
    font-family: var(--font-mono);
    font-weight: var(--font-weight-semibold);
    color: var(--color-secondary, var(--color-accent));
  }

  .markdown__ref:hover,
  .markdown__ref:focus-visible {
    text-decoration: underline;
  }

  .markdown__ref--static {
    cursor: text;
  }

  .markdown__ref:focus-visible,
  .markdown__fence-line:focus-visible,
  .markdown__link:focus-visible {
    outline: 2px solid var(--color-focus, var(--color-accent));
    outline-offset: 2px;
    border-radius: var(--radius-xs, 2px);
  }

  /* --- Blockquote / hr --- */
  .markdown__blockquote {
    margin: 0;
    padding: var(--space-1) var(--space-3);
    border-left: 2px solid var(--color-border-strong);
    color: var(--color-text-low);
  }

  .markdown__blockquote > :global(*) {
    margin: 0 0 var(--space-2);
  }

  .markdown__blockquote > :global(*:last-child) {
    margin-bottom: 0;
  }

  .markdown__hr {
    border: none;
    border-top: var(--border-width, 1px) solid var(--color-border-subtle);
    margin: 0;
  }

  /* --- Lists --- */
  .markdown__list {
    margin: 0;
    padding-left: var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .markdown__list-item {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
  }

  .markdown__list-item--task {
    list-style: none;
    margin-left: calc(var(--space-5) * -1);
  }

  .markdown__list-item-body > :global(.markdown__list) {
    margin-top: var(--space-1);
  }

  .markdown__task-checkbox {
    flex: none;
    align-self: center;
    accent-color: var(--color-secondary, var(--color-accent));
  }

  /* --- Table (Table.svelte conventions: uppercase headers, tabular-nums) --- */
  .markdown__table-wrap {
    overflow-x: auto;
  }

  .markdown__table {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--font-ui);
    font-size: var(--text-sm);
  }

  .markdown__th {
    padding: var(--space-2) var(--space-3);
    border-bottom: var(--border-width, 1px) solid var(--color-border-subtle);
    font-size: var(--text-xs);
    font-weight: var(--font-weight-medium);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-low);
    white-space: nowrap;
  }

  .markdown__td {
    padding: var(--space-2) var(--space-3);
    border-bottom: var(--border-width, 1px) solid var(--color-border-subtle);
  }

  .markdown__th--numeric,
  .markdown__td--numeric {
    font-variant-numeric: tabular-nums;
    font-feature-settings: var(--font-feature-numeric);
  }

  /* --- Fenced code --- */
  .markdown :global(.markdown__fence) {
    position: relative;
    padding: var(--space-3);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    overflow-x: auto;
  }

  .markdown__fence-lang {
    position: absolute;
    top: var(--space-1);
    right: var(--space-2);
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    color: var(--color-text-low);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .markdown__fence-pre {
    margin: 0;
    white-space: pre;
    color: var(--color-text-med);
  }

  .markdown__fence-line--invalid {
    color: var(--color-danger);
    text-decoration-thickness: 1px;
  }

  .markdown__fence-reason {
    color: var(--color-text-low);
  }

  .markdown__fence-line {
    all: unset;
    display: inline;
    cursor: pointer;
    color: var(--color-accent);
  }

  .markdown__fence-line:hover {
    text-decoration: underline;
  }

  /* --- Compact --- */
  .markdown--compact {
    font-size: var(--text-xs);
    line-height: 1.5;
  }

  .markdown--compact .markdown__heading--1 {
    font-size: var(--text-lg);
  }

  .markdown--compact .markdown__heading--2 {
    font-size: calc(var(--text-base) * 1.125);
  }

  .markdown--compact .markdown__heading--3,
  .markdown--compact .markdown__heading--4 {
    font-size: var(--text-sm);
  }

  .markdown--compact :global(.markdown__fence) {
    padding: var(--space-2);
  }
</style>
