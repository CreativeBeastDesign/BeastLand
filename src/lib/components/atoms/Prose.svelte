<!-- src/lib/components/atoms/Prose.svelte -->

<script lang="ts">
  /**
   * Thin convenience wrapper around `Markdown` for case-page body text: sets
   * a comfortable reading rhythm (measure, line-height, text colours) so
   * callers don't repeat that styling at every call site. All Markdown
   * safety properties (no `{@html}` except through an opted-in `math`
   * callback, refs/fences inert without `oncommand`) carry through unchanged.
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
  <Markdown source={text} compact {inline} {lang} {math} {oncommand} />
</div>

<style>
  .prose :global(.markdown),
  .prose :global(.markdown--inline) {
    line-height: 1.65;
    color: var(--color-text-med);
  }

  .prose :global(.markdown) {
    max-inline-size: 72ch;
  }

  .prose :global(.markdown__strong) {
    color: var(--color-text-high);
  }
</style>
