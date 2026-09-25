<!-- src/lib/components/molecules/Callout.svelte -->

<script lang="ts">
  import type { Snippet } from "svelte";
  import type { CalloutTone } from "$lib/reading/types.js";

  type Props = {
    tone?: CalloutTone;
    /** Rendered mono, lowercase, like a log level prefix (e.g. `note`). */
    label?: string;
    children: Snippet;
    class?: string;
  };

  let { tone = "neutral", label, children, class: className }: Props = $props();
</script>

<aside class={["callout", className].filter(Boolean).join(" ")} data-tone={tone}>
  {#if label}
    <span class="callout__label">{label}:</span>
  {/if}
  <div class="callout__body">
    {@render children()}
  </div>
</aside>

<style>
  .callout {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-control);
    background: color-mix(in oklab, var(--color-surface-1) 60%, transparent);
    border-left: 2px solid var(--callout-tone-color, var(--color-text-low));
    box-shadow: -1px 0 12px color-mix(in oklab, var(--callout-tone-color, transparent) 35%, transparent);
  }

  .callout__label {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    letter-spacing: 0.04em;
    text-transform: lowercase;
    color: var(--callout-tone-color, var(--color-text-low));
  }

  .callout__body {
    font-size: var(--text-sm);
    color: var(--color-text-med);
  }

  .callout[data-tone="neutral"] {
    --callout-tone-color: var(--color-text-low);
  }

  .callout[data-tone="accent"] {
    --callout-tone-color: var(--color-accent);
  }

  .callout[data-tone="info"] {
    --callout-tone-color: var(--color-info);
  }

  .callout[data-tone="success"] {
    --callout-tone-color: var(--color-success);
  }

  .callout[data-tone="warning"] {
    --callout-tone-color: var(--color-warning);
  }

  .callout[data-tone="danger"] {
    --callout-tone-color: var(--color-danger);
  }
</style>
