<!-- src/lib/components/organisms/Benchmark.svelte -->
<!-- Small multiples with emphasis: compares a handful of build variants
     across metrics that each carry their own unit (MB, package count, CVE
     count, ...), with one variant (usually the author's own tool) picked out
     in the accent hue and the rest de-emphasised. Each metric gets its own
     mini bar chart on its own scale — never a shared or dual axis — plus a
     `<table>` fallback so nothing is ever cut off on narrow screens. -->

<script lang="ts">
  import type { BenchmarkMetric, BenchmarkVariant } from "$lib/reading/types.js";
  import { factTone, formatValue, isNumericMetric, metricScale } from "$lib/reading/benchmark.js";
  import { overflowFade } from "$lib/actions/overflowFade.js";

  type Props = {
    title?: string;
    variants: BenchmarkVariant[];
    metrics: BenchmarkMetric[];
    /** Variant id emphasised in the accent hue; every other variant is de-emphasised. */
    highlight?: string;
    caption?: string;
    class?: string;
  };

  let { title, variants, metrics, highlight, caption, class: className }: Props = $props();

  let view = $state<"chart" | "table">("chart");
  let hoveredId = $state<string | null>(null);

  const numericMetrics = $derived(metrics.filter(isNumericMetric));
  const factMetrics = $derived(metrics.filter((metric) => !isNumericMetric(metric)));

  function cellText(value: number | boolean | string | null | undefined, metric: BenchmarkMetric): string {
    if (value === null || value === undefined) return "no data";
    if (typeof value === "boolean") return value ? "yes" : "no";
    if (typeof value === "number") return formatValue(value, metric);
    return value;
  }

  function toggleView() {
    view = view === "chart" ? "table" : "chart";
  }

  function setHovered(id: string | null) {
    hoveredId = id;
  }
</script>

<figure class={["benchmark", className].filter(Boolean).join(" ")}>
  <div class="benchmark__titlebar">
    {#if title}
      <span class="benchmark__title">{title}</span>
    {/if}
    <button
      type="button"
      class="benchmark__toggle"
      aria-pressed={view === "table"}
      onclick={toggleView}
    >
      {view === "chart" ? "table" : "chart"}
    </button>
  </div>

  {#if variants.length > 1}
    <div class="benchmark__legend">
      {#if highlight}
        <span class="benchmark__legend-item">
          <span class="benchmark__swatch benchmark__swatch--highlight" aria-hidden="true"></span>
          {variants.find((variant) => variant.id === highlight)?.label ?? highlight}
        </span>
        <span class="benchmark__legend-item">
          <span class="benchmark__swatch benchmark__swatch--other" aria-hidden="true"></span>
          others
        </span>
      {:else}
        <span class="benchmark__legend-item">
          <span class="benchmark__swatch benchmark__swatch--other" aria-hidden="true"></span>
          all variants
        </span>
      {/if}
    </div>
  {/if}

  {#if view === "chart"}
    <div class="benchmark__body">
      {#if numericMetrics.length > 0}
        <div class="benchmark__multiples">
          {#each numericMetrics as metric (metric.id)}
            {@const scale = metricScale(metric)}
            <section class="benchmark__metric">
              <header class="benchmark__metric-header">
                <span class="benchmark__metric-label">
                  {metric.label}
                  {#if metric.unit}<span class="benchmark__metric-unit">({metric.unit})</span>{/if}
                </span>
                {#if metric.better}
                  <span class="benchmark__metric-hint">
                    {metric.better === "lower" ? "↓ lower is better" : "↑ higher is better"}
                  </span>
                {/if}
              </header>

              <div class="benchmark__rows" role="list">
                {#each variants as variant (variant.id)}
                  {@const raw = metric.values[variant.id]}
                  {@const numeric = typeof raw === "number" ? raw : null}
                  {@const fraction = scale(numeric)}
                  {@const isHighlight = variant.id === highlight}
                  <!-- svelte-ignore a11y_no_noninteractive_tabindex -- focusable so hover-to-highlight is keyboard-reachable -->
                  <!-- svelte-ignore a11y_no_static_element_interactions -- hover/focus only highlight the row, no click semantics -->
                  <div
                    class="benchmark__row"
                    role="listitem"
                    tabindex="0"
                    data-highlight={isHighlight}
                    data-dim={hoveredId !== null && hoveredId !== variant.id}
                    aria-label={`${variant.label}: ${cellText(raw, metric)}`}
                    onmouseenter={() => setHovered(variant.id)}
                    onmouseleave={() => setHovered(null)}
                    onfocus={() => setHovered(variant.id)}
                    onblur={() => setHovered(null)}
                  >
                    <span class="benchmark__row-label">{variant.label}</span>
                    <span class="benchmark__track">
                      <span
                        class="benchmark__bar"
                        data-highlight={isHighlight}
                        style={`--benchmark-frac: ${fraction}`}
                      ></span>
                    </span>
                    <span class="benchmark__row-value">{cellText(raw, metric)}</span>
                  </div>
                {/each}
              </div>
            </section>
          {/each}
        </div>
      {/if}

      {#if factMetrics.length > 0}
        <div class="benchmark__facts">
          {#each factMetrics as metric (metric.id)}
            <div class="benchmark__fact-row">
              <span class="benchmark__fact-label">{metric.label}</span>
              <div class="benchmark__fact-chips">
                {#each variants as variant (variant.id)}
                  {@const raw = metric.values[variant.id]}
                  {@const isHighlight = variant.id === highlight}
                  <!-- svelte-ignore a11y_no_noninteractive_tabindex -- focusable so hover-to-highlight is keyboard-reachable -->
                  <!-- svelte-ignore a11y_no_static_element_interactions -- hover/focus only highlight the chip, no click semantics -->
                  <div
                    class="benchmark__fact-chip"
                    role="group"
                    tabindex="0"
                    data-highlight={isHighlight}
                    data-dim={hoveredId !== null && hoveredId !== variant.id}
                    aria-label={`${variant.label}: ${cellText(raw, metric)}`}
                    onmouseenter={() => setHovered(variant.id)}
                    onmouseleave={() => setHovered(null)}
                    onfocus={() => setHovered(variant.id)}
                    onblur={() => setHovered(null)}
                  >
                    <span class="benchmark__fact-variant">{variant.label}</span>
                    {#if typeof raw === "boolean"}
                      <span class="benchmark__fact-status" data-tone={factTone(raw, metric.better)}>
                        {raw ? "✓ yes" : "✕ no"}
                      </span>
                    {:else}
                      <span class="benchmark__fact-muted">{raw ?? "—"}</span>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {:else}
    <div class="benchmark__table-wrap" use:overflowFade>
      <table class="benchmark__table">
        <caption class="benchmark__sr-only">{title ?? "Benchmark data"}</caption>
        <thead>
          <tr>
            <th scope="col">metric</th>
            {#each variants as variant (variant.id)}
              <th scope="col" data-highlight={variant.id === highlight}>{variant.label}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each metrics as metric (metric.id)}
            <tr>
              <th scope="row">
                {metric.label}
                {#if metric.unit}<span class="benchmark__table-unit">({metric.unit})</span>{/if}
              </th>
              {#each variants as variant (variant.id)}
                {@const raw = metric.values[variant.id]}
                <td data-highlight={variant.id === highlight}>{cellText(raw, metric)}</td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  {#if caption}
    <figcaption class="benchmark__caption">{caption}</figcaption>
  {/if}
</figure>

<style>
  .benchmark {
    margin: 0;
    border-radius: var(--radius-window);
    background: var(--color-glass);
    border: var(--border-width) solid var(--color-border);
    box-shadow: var(--shadow-window);
    backdrop-filter: blur(var(--fx-blur-md)) saturate(var(--fx-glass-saturation));
  }

  .benchmark__titlebar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-4);
    border-bottom: var(--border-width) solid var(--color-border-subtle);
  }

  .benchmark__title {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    letter-spacing: 0.04em;
    text-transform: lowercase;
    color: var(--color-text-low);
  }

  .benchmark__toggle {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    letter-spacing: 0.04em;
    text-transform: lowercase;
    color: var(--color-text-med);
    background: var(--color-surface-2);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius-control);
    padding: 0.2rem 0.6rem;
    cursor: pointer;
    transition: color var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out);
  }

  .benchmark__toggle:hover {
    color: var(--color-text-high);
    border-color: var(--color-border-strong);
  }

  .benchmark__toggle[aria-pressed="true"] {
    color: var(--color-accent);
    border-color: color-mix(in oklab, var(--color-accent) 45%, transparent);
    background: color-mix(in oklab, var(--color-accent) 14%, transparent);
  }

  .benchmark__toggle:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  .benchmark__legend {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-3) var(--space-4) 0;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-text-low);
  }

  .benchmark__legend-item {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
  }

  .benchmark__swatch {
    width: 0.625rem;
    height: 0.625rem;
    border-radius: var(--radius-xs);
    flex: none;
  }

  .benchmark__swatch--highlight {
    background: var(--color-accent);
    box-shadow: var(--glow-accent);
  }

  .benchmark__swatch--other {
    background: var(--color-text-low);
    opacity: 0.6;
  }

  .benchmark__body {
    container-type: inline-size;
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  .benchmark__multiples {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  /* Wide: lay multiples out as a 2-column grid so several metrics compare
     side by side, instead of one long vertical scroll. */
  @container (min-width: 44rem) {
    .benchmark__multiples {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: var(--space-5);
      row-gap: var(--space-5);
    }
  }

  .benchmark__metric {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-width: 0;
  }

  .benchmark__metric-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .benchmark__metric-label {
    font-family: var(--font-ui);
    font-weight: var(--font-weight-semibold);
    font-size: var(--text-sm);
    color: var(--color-text-high);
  }

  .benchmark__metric-unit {
    margin-left: 0.3em;
    font-weight: var(--font-weight-normal);
    color: var(--color-text-low);
  }

  .benchmark__metric-hint {
    flex: none;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-text-low);
    white-space: nowrap;
  }

  .benchmark__rows {
    display: flex;
    flex-direction: column;
  }

  /* Rows separated by a 2px surface gap — the spacer that reads as
     "distinct row" instead of a border drawn around each one. */
  .benchmark__row {
    display: grid;
    grid-template-columns: minmax(5.5rem, 8rem) minmax(0, 1fr) auto;
    align-items: center;
    column-gap: var(--space-3);
    padding-block: 2px;
    border-radius: var(--radius-xs);
    transition: opacity var(--duration-fast) var(--ease-out);
  }

  .benchmark__row-label {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-text-med);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .benchmark__row[data-highlight="true"] .benchmark__row-label {
    color: var(--color-text-high);
  }

  .benchmark__track {
    position: relative;
    height: 12px;
    display: flex;
    align-items: center;
  }

  /* Recessive full-width hairline: the track every bar is measured against. */
  .benchmark__track::before {
    content: "";
    position: absolute;
    inset-inline: 0;
    top: 50%;
    height: 1px;
    background: var(--color-border-subtle);
    transform: translateY(-50%);
  }

  .benchmark__bar {
    position: relative;
    display: block;
    height: 12px;
    width: max(2px, calc(var(--benchmark-frac, 0) * 100%));
    max-width: 100%;
    border-radius: 0 4px 4px 0;
    background: var(--color-text-low);
    opacity: 0.55;
    transition: width var(--duration-normal) var(--ease-hypr), opacity var(--duration-fast) var(--ease-out);
  }

  .benchmark__bar[data-highlight="true"] {
    background: var(--color-accent);
    opacity: 1;
    box-shadow: var(--glow-accent);
  }

  .benchmark__row-value {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-feature-settings: var(--font-feature-numeric);
    font-size: var(--text-xs);
    color: var(--color-text-med);
    white-space: nowrap;
  }

  .benchmark__row[data-highlight="true"] .benchmark__row-value {
    color: var(--color-text-high);
  }

  /* Hover/focus on a row highlights that variant everywhere; the rest dim. */
  .benchmark__row[data-dim="true"] {
    opacity: 0.45;
  }

  .benchmark__row:hover,
  .benchmark__row:focus-visible {
    background: var(--color-surface-2);
  }

  .benchmark__row:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  .benchmark__facts {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding-top: var(--space-2);
    border-top: var(--border-width) solid var(--color-border-subtle);
  }

  .benchmark__fact-row {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  @container (min-width: 44rem) {
    .benchmark__fact-row {
      display: grid;
      grid-template-columns: minmax(5.5rem, 8rem) minmax(0, 1fr);
      align-items: center;
      column-gap: var(--space-3);
    }
  }

  .benchmark__fact-label {
    font-family: var(--font-ui);
    font-weight: var(--font-weight-semibold);
    font-size: var(--text-sm);
    color: var(--color-text-high);
  }

  .benchmark__fact-chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .benchmark__fact-chip {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: 0.25rem 0.6rem;
    border-radius: var(--radius-pill);
    border: var(--border-width) solid var(--color-border);
    background: var(--color-surface-2);
    transition: opacity var(--duration-fast) var(--ease-out);
  }

  .benchmark__fact-chip[data-highlight="true"] {
    border-color: color-mix(in oklab, var(--color-accent) 45%, transparent);
    background: color-mix(in oklab, var(--color-accent) 14%, transparent);
  }

  .benchmark__fact-chip[data-dim="true"] {
    opacity: 0.45;
  }

  .benchmark__fact-chip:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  .benchmark__fact-variant {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-text-med);
  }

  .benchmark__fact-chip[data-highlight="true"] .benchmark__fact-variant {
    color: var(--color-text-high);
  }

  .benchmark__fact-status {
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    font-weight: var(--font-weight-medium);
  }

  .benchmark__fact-status[data-tone="success"] {
    color: var(--color-success);
  }

  .benchmark__fact-status[data-tone="danger"] {
    color: var(--color-danger);
  }

  .benchmark__fact-muted {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-text-low);
  }

  /* Table fallback — the accessibility twin, always available and never
     clipped: horizontal scroll with a soft fade at the clipped edge. */
  .benchmark__table-wrap {
    margin: var(--space-4);
    overflow-x: auto;
  }

  .benchmark__table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-sm);
  }

  .benchmark__table th,
  .benchmark__table td {
    padding: var(--space-2) var(--space-3);
    text-align: left;
    white-space: nowrap;
    border-bottom: var(--border-width) solid var(--color-border-subtle);
  }

  .benchmark__table thead th {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    text-transform: lowercase;
    letter-spacing: 0.04em;
    color: var(--color-text-low);
    font-weight: var(--font-weight-medium);
  }

  .benchmark__table thead th[data-highlight="true"] {
    color: var(--color-accent);
  }

  .benchmark__table tbody th {
    font-family: var(--font-ui);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-high);
  }

  .benchmark__table-unit {
    margin-left: 0.3em;
    font-weight: var(--font-weight-normal);
    color: var(--color-text-low);
  }

  .benchmark__table td {
    font-variant-numeric: tabular-nums;
    font-feature-settings: var(--font-feature-numeric);
    color: var(--color-text-med);
  }

  .benchmark__table td[data-highlight="true"] {
    color: var(--color-text-high);
  }

  .benchmark__caption {
    margin: 0;
    padding: 0 var(--space-4) var(--space-4);
    font-size: var(--text-xs);
    color: var(--color-text-low);
  }

  .benchmark__sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .benchmark__bar,
    .benchmark__row {
      transition: none;
    }
  }
</style>
