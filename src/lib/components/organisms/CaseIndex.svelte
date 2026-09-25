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

  .case-index__grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
    gap: var(--gap-tile, var(--space-4));
  }

  .case-index__item {
    display: flex;
  }

  .case-index__item :global(.case-card) {
    flex: 1;
  }
</style>
