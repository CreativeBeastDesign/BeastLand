<!-- src/lib/components/molecules/Metric.svelte -->

<script lang="ts" module>
  /** Length of the longest whitespace-separated word — what the value's
   *  font size is fitted to. MetricGrid uses the maximum across its cards
   *  so every value in a grid shares one size. */
  export function longestWordLength(value: string): number {
    return Math.max(1, ...value.split(/\s+/).filter(Boolean).map((word) => word.length));
  }
</script>

<script lang="ts">
  type Props = {
    label: string;
    value: string;
    detail?: string;
    class?: string;
  };

  let { label, value, detail, class: className }: Props = $props();

  // Words are kept whole (a hyphenated value like "Bit-for-bit" never splits
  // at its hyphens); the font shrinks until the longest word fits the card.
  const words = $derived(value.split(/\s+/).filter(Boolean));
  const longest = $derived(longestWordLength(value));
</script>

<div class={["metric", "surface", "surface--glass", "grain", className].filter(Boolean).join(" ")}>
  <!-- The value cell is its own container-query context (not `.metric`
       itself): `.metric` is the element MetricGrid turns into a subgrid row
       item when it's part of a grid, and a subgrid item is not allowed to
       also have size/layout containment — so the container query lives one
       level down, on a plain cell that's never a subgrid participant. -->
  <div class="metric__value">
    <span class="metric__value-text" style:--metric-chars-own={longest}
      >{#each words as word, i (i)}{#if i > 0}{" "}{/if}<span class="metric__word" class:metric__word--whole={word.length <= 16}>{word}</span>{/each}</span
    >
  </div>
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
    container-type: inline-size;
  }

  .metric__value-text {
    display: block;
    font-family: var(--font-mono);
    /* Fit the longest word to the cell: Illinois Mono advances 0.6em per
       character, so width / (chars × 0.6) is the largest size that fits;
       clamped between body size and the display size. */
    font-size: clamp(
      var(--text-base),
      calc(100cqi / (var(--metric-grid-chars, var(--metric-chars-own, 6)) * 0.6)),
      calc(var(--text-lg) * 1.4)
    );
    /* Big standalone figures read better with proportional widths than
       tabular-nums (which is for aligning digits in columns/tables). */
    font-feature-settings: var(--font-feature-numeric);
    font-variant-numeric: normal;
    color: var(--color-text-high);
    line-height: 1.1;
    text-wrap: balance;
    hyphens: manual;
  }

  /* Beyond ~16 characters even the minimum size can't fit a card, so such
     a word may wrap rather than overflow. */
  .metric__word--whole {
    white-space: nowrap;
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
