<!-- src/lib/components/organisms/CaseIndex.svelte -->
<!-- Grid of `CaseCard`s — the portfolio's case-study index. -->

<script lang="ts">
  import type { Snippet } from "svelte";
  import type { CaseSummary, HeadingLevel } from "$lib/reading/types.js";
  import CaseCard from "$lib/components/molecules/CaseCard.svelte";

  type Props = {
    studies: CaseSummary[];
    level?: HeadingLevel;
    label?: string;
    onopen?: (slug: string) => void;
    children?: Snippet;
    class?: string;
  };

  let { studies, level = 3, label = "Case studies", onopen, children, class: className }: Props = $props();
</script>

<section class={["case-index", className].filter(Boolean).join(" ")}>
  {#if children}
    <div class="case-index__intro">
      {@render children()}
    </div>
  {/if}
  <ul class="case-index__grid" aria-label={label}>
    {#each studies as study (study.slug)}
      <li class="case-index__item">
        <CaseCard {study} {level} {onopen} />
      </li>
    {/each}
  </ul>
</section>

<style>
  .case-index {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  /* `grid-auto-rows` repeats a 5-track pattern — tags / title / standfirst /
     metric / footer — for every row of cards the auto-fill columns produce.
     Each `<li>` (and, inside it, the `CaseCard` root) spans 5 of those
     tracks with `grid-template-rows: subgrid`, so a tag list wrapping to
     1–3 lines on one card pushes that shared row taller for every card in
     the same visual row, and titles/standfirsts/metrics/footers all land on
     the same baseline across the row. Gaps: this grid's own `row-gap`
     supplies the space *between* card rows (the boundary a subgrid doesn't
     span); `CaseCard`'s `gap` supplies the tighter space *within* one card,
     overriding the inherited value for the tracks it does span. */
  .case-index__grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
    grid-auto-rows: auto auto auto auto auto;
    gap: var(--gap-tile, var(--space-4));
  }

  .case-index__item {
    display: grid;
    grid-row: span 5;
    grid-template-rows: subgrid;
  }
</style>
