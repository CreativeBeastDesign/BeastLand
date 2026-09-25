<!-- src/lib/components/molecules/Metric.svelte -->

<script lang="ts">
  type Props = {
    label: string;
    value: string;
    detail?: string;
    class?: string;
  };

  let { label, value, detail, class: className }: Props = $props();
</script>

<div class={["metric", "surface", "surface--glass", "grain", className].filter(Boolean).join(" ")}>
  <span class="metric__value">{value}</span>
  <span class="metric__label">{label}</span>
  {#if detail}
    <span class="metric__detail">{detail}</span>
  {/if}
</div>

<style>
  .metric {
    border-radius: var(--radius-control);
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    padding: var(--space-3) var(--space-4);
  }

  .metric__value {
    font-family: var(--font-mono);
    font-size: calc(var(--text-lg) * 1.4);
    font-feature-settings: var(--font-feature-numeric);
    font-variant-numeric: tabular-nums;
    color: var(--color-text-high);
    line-height: 1.1;
  }

  .metric__label {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    text-transform: lowercase;
    color: var(--color-text-low);
  }

  .metric__detail {
    font-size: var(--text-xs);
    color: var(--color-text-med);
  }
</style>
