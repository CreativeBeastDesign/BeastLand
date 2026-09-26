<!-- src/lib/components/atoms/Prose.svelte -->

<script lang="ts">
  /**
   * Thin convenience wrapper around `Markdown` for case-page body text: sets
   * a comfortable reading rhythm (measure, size, leading, text colours) so
   * callers don't repeat that styling at every call site. All Markdown
   * safety properties (no `{@html}` except through an opted-in `math`
   * callback, refs/fences inert without `oncommand`) carry through unchanged.
   *
   * Renders through Markdown's default (non-`compact`) mode — Prose is
   * always long-form reading copy, never a tile's tight rhythm; a caller
   * that wants the tight look reaches for `Markdown` directly with
   * `compact`.
   */
  import Markdown from "$lib/components/molecules/Markdown.svelte";

  type Props = {
    text: string;
    /** Unwraps a single-paragraph `text` into inline flow — see `Markdown`'s `inline`. */
    inline?: boolean;
    lang?: string;
    math?: (tex: string, display: boolean) => string;
    oncommand?: (command: string, mode: "run" | "insert") => void;
    class?: string;
  };

  let { text, inline = false, lang, math, oncommand, class: className }: Props = $props();
</script>

<div class={["prose", className].filter(Boolean).join(" ")}>
  <Markdown source={text} {inline} {lang} {math} {oncommand} />
</div>

<style>
  /* Size, leading, colour and strong/em/link treatment all come from
     Markdown's own non-`compact` rules (components.css's `--reading-*`
     tokens) — Prose never passes `compact`, so it gets those for free.
     The one thing that's Prose's own job, not Markdown's: the measure cap
     for a full case-page column. It applies to each direct child rather
     than the `.markdown` root itself, so a table (which may be wider than
     66ch of prose) isn't squeezed down to it — Markdown.svelte's own
     `.markdown__table-wrap` already handles overflow on its own terms. */
  .prose :global(.markdown > *:not(.markdown__table-wrap)) {
    max-inline-size: var(--reading-measure);
  }
</style>
