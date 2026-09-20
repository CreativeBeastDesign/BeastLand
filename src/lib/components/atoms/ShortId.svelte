<!-- src/lib/components/atoms/ShortId.svelte -->

<script lang="ts">
  import { shortId } from "$lib/tiling/ids.js";

  type Props = {
    id: string;
    all: string[];
    prefix?: string;
  };

  let { id, all, prefix = "#" }: Props = $props();

  let parts = $derived(shortId(id, all));
</script>

<span class="short-id" title={id}>
  <b>{prefix}{parts.short}</b><span class="short-id__rest">{parts.rest}</span>
</span>

<style>
  .short-id {
    font-family: var(--font-mono);
    white-space: nowrap;
  }

  .short-id b {
    font-weight: var(--font-weight-semibold);
    color: var(--color-secondary);
  }

  .short-id__rest {
    color: var(--color-text-low);
  }
</style>
