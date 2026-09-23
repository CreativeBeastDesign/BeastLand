<!-- src/lib/components/atoms/Kbd.svelte -->

<script lang="ts">
  import type { Snippet } from "svelte";

  type Props = {
    children: Snippet;
  };

  let { children }: Props = $props();
</script>

<kbd class="kbd">
  {@render children()}
</kbd>

<style>
  .kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.5rem;
    height: 1.5rem;
    padding: 0 0.4rem;
    border-radius: var(--radius-control);
    border: var(--border-width) solid var(--color-border-strong);
    border-bottom-width: 2px;
    background: var(--color-surface-2);
    color: var(--color-text-med);

    font-family: var(--font-mono);
    font-size: 0.75rem;
    line-height: 1;
  }
</style>
