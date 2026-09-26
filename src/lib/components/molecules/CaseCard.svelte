<!-- src/lib/components/molecules/CaseCard.svelte -->
<!-- A single case-study summary card for `CaseIndex`. The whole card is one
     link/button; hover/focus-visible switches to the Hyprland gradient
     "active" border with a slight lift. -->

<script lang="ts">
  import type { HeadingLevel, CaseSummary } from "$lib/reading/types.js";

  type Props = {
    study: CaseSummary;
    level?: HeadingLevel;
    onopen?: (slug: string) => void;
    class?: string;
  };

  let { study, level = 3, onopen, class: className }: Props = $props();

  function handleClick(event: MouseEvent) {
    if (study.href && onopen) {
      event.preventDefault();
      onopen(study.slug);
    }
  }

  function handleButtonClick() {
    onopen?.(study.slug);
  }
</script>

{#snippet cardBody()}
  <!-- Tags and metric are always rendered — even with zero tags or no
       metric at all — so each is one row of the card's 5-row grid. Inside
       `CaseIndex`, the grid rows are subgridded up to the shared index grid
       (see CaseIndex.svelte), so an empty row here still holds its row's
       place and everything below (title, standfirst, footer) lines up with
       the other cards in the same visual row. -->
  <ul class="case-card__tags">
    {#each study.tags as tag (tag)}
      <li class="case-card__tag">#{tag}</li>
    {/each}
  </ul>
  <svelte:element this={`h${level}`} class="case-card__title">{study.title}</svelte:element>
  <p class="case-card__standfirst">{study.standfirst}</p>
  <div class="case-card__metric">
    {#if study.metric}
      <span class="case-card__metric-value">{study.metric.value}</span>
      <span class="case-card__metric-label">{study.metric.label}</span>
    {/if}
  </div>
  <p class="case-card__footer">open →</p>
{/snippet}

{#if study.href}
  <a
    class={["case-card", "surface", "surface--glass", "grain", className].filter(Boolean).join(" ")}
    href={study.href}
    onclick={handleClick}
  >
    {@render cardBody()}
  </a>
{:else if onopen}
  <button
    type="button"
    class={["case-card", "surface", "surface--glass", "grain", className].filter(Boolean).join(" ")}
    onclick={handleButtonClick}
  >
    {@render cardBody()}
  </button>
{:else}
  <div class={["case-card", "surface", "surface--glass", "grain", className].filter(Boolean).join(" ")}>
    {@render cardBody()}
  </div>
{/if}

<style>
  .case-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-4);
    text-align: left;
    text-decoration: none;
    color: inherit;
    /* Same width at rest and on hover, so hovering never shifts layout. */
    border: var(--border-width) solid var(--color-border);
    cursor: pointer;
    font: inherit;

    transition:
      transform var(--duration-fast) var(--ease-hypr),
      box-shadow var(--duration-fast) var(--ease-hypr);
  }

  .case-card__tags {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    /* In CaseIndex the tag row is a shared subgrid track sized by the card
       with the most tag lines; pack lines at the top instead of letting a
       wrapping flex container spread them over the extra height. */
    align-content: flex-start;
    align-self: start;
    gap: 0.15rem var(--space-2);
    margin: 0;
    padding: 0;
  }

  .case-card__tag {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-accent);
  }

  .case-card__title {
    margin: 0;
    font-family: var(--font-ui);
    font-size: var(--text-base);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-high);
  }

  .case-card__standfirst {
    margin: 0;
    color: var(--color-text-med);
    font-size: var(--text-sm);
    display: -webkit-box;
    -webkit-line-clamp: 4;
    line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .case-card__metric {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
  }

  .case-card__metric-value {
    font-family: var(--font-mono);
    font-size: calc(var(--text-lg) * 1.1);
    font-feature-settings: var(--font-feature-numeric);
    color: var(--color-text-high);
  }

  .case-card__metric-label {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-text-low);
    text-transform: lowercase;
  }

  .case-card__footer {
    margin: var(--space-2) 0 0;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-text-low);
  }

  .case-card:hover,
  .case-card:focus-visible {
    transform: translateY(-2px);
    border-color: transparent;
    background:
      linear-gradient(var(--color-glass), var(--color-glass)) padding-box,
      var(--gradient-border-active) border-box;
    box-shadow:
      var(--shadow-window),
      0 0 0 1px var(--color-border-active),
      0 0 22px var(--color-glow);
  }

  .case-card:hover .case-card__footer,
  .case-card:focus-visible .case-card__footer {
    color: var(--color-accent);
  }

  .case-card:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .case-card {
      transition: none;
    }
  }

  /* Inside `CaseIndex` only: swap the standalone flex column for a subgrid
     spanning the index's 5 row-tracks (see CaseIndex.svelte), so this
     card's tags/title/standfirst/metric/footer align with every other
     card in the same visual row. `gap` (already set above) becomes the
     override for the *internal* row gaps this card spans — the gap
     *between* card rows stays the index grid's own, since that boundary
     isn't part of any single card's span. A standalone `CaseCard` (no
     `.case-index__item` ancestor) never matches this selector and keeps
     rendering as the plain flex column above. */
  :global(.case-index__item) > .case-card {
    display: grid;
    grid-template-rows: subgrid;
    grid-row: span 5;
  }
</style>
