<!-- src/lib/components/molecules/MetricGrid.svelte -->

<script lang="ts">
  import type { MetricData } from "$lib/reading/types.js";
  import Metric from "$lib/components/molecules/Metric.svelte";

  type Props = {
    metrics: MetricData[];
    class?: string;
  };

  let { metrics, class: className }: Props = $props();
</script>

<div class={["metric-grid", className].filter(Boolean).join(" ")}>
  {#each metrics as metric (metric.label)}
    <Metric label={metric.label} value={metric.value} detail={metric.detail} />
  {/each}
</div>

<style>
  .metric-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: var(--space-3);
  }
</style>
