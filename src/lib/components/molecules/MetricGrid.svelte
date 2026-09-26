<!-- src/lib/components/molecules/MetricGrid.svelte -->

<script lang="ts">
  import type { MetricData } from "$lib/reading/types.js";
  import Metric, { longestWordLength } from "$lib/components/molecules/Metric.svelte";

  type Props = {
    metrics: MetricData[];
    class?: string;
  };

  let { metrics, class: className }: Props = $props();

  // One value size for the whole grid: fitted to the longest word of any
  // card, so "Bit-for-bit" and "0" don't end up in different type sizes.
  const sharedChars = $derived(Math.max(1, ...metrics.map((metric) => longestWordLength(metric.value))));
</script>

<div class={["metric-grid", className].filter(Boolean).join(" ")} style:--metric-grid-chars={sharedChars}>
  {#each metrics as metric (metric.label)}
    <Metric label={metric.label} value={metric.value} detail={metric.detail} />
  {/each}
</div>

<style>
  .metric-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    /* Three named row tracks — value / label / detail — shared by every
       card via subgrid below, so a short value ("0") and a two-line one
       ("Bit-for-bit") still line up their labels on the same row. */
    grid-template-rows: repeat(3, auto);
    grid-auto-rows: auto;
    gap: var(--space-3);
    row-gap: var(--space-2);
  }

  /* Reach into Metric's own root (a child component, so it needs :global)
     and turn it into a 3-row subgrid item only while it's inside a
     MetricGrid. Metric itself stays a plain flex column when used
     standalone, so it still renders sensibly outside a grid — this is a
     one-line CSS override from the parent rather than a prop, since the
     grid is the thing that knows it wants alignment across siblings. */
  .metric-grid > :global(.metric) {
    grid-row: span 3;
    display: grid;
    grid-template-rows: subgrid;
    row-gap: 0.15rem;
    align-content: start;
  }

  /* Values sit on the bottom of the shared value row, directly above their
     label, however many lines the tallest value in the row needs. */
  .metric-grid > :global(.metric) > :global(.metric__value) {
    align-self: end;
  }
</style>
