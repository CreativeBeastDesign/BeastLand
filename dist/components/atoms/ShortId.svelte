<!-- src/lib/components/atoms/ShortId.svelte -->

<script lang="ts">
  import { shortId, type ShortId as ShortIdParts } from "../../tiling/ids.js";

  type Props = {
    id: string;
    /** Every known id, to derive the shortest unique prefix from. */
    all?: string[];
    /**
     * A precomputed short id (`kinds.shortIdOf(id)`), which skips the scan
     * over `all` — what callers with many records should pass.
     */
    short?: ShortIdParts;
    prefix?: string;
  };

  let { id, all = [], short, prefix = "#" }: Props = $props();

  let parts = $derived(short ?? shortId(id, all));
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
