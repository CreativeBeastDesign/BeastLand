<!-- src/lib/components/molecules/StackManifest.svelte -->

<script lang="ts">
  import type { StackGroup } from "$lib/reading/types.js";
  import Badge from "$lib/components/atoms/Badge.svelte";

  type Props = {
    groups: StackGroup[];
    class?: string;
  };

  let { groups, class: className }: Props = $props();
</script>

<dl class={["stack-manifest", className].filter(Boolean).join(" ")}>
  {#each groups as group, index (group.category)}
    {@const previousSection = index > 0 ? groups[index - 1].section : undefined}
    {#if group.section && group.section !== previousSection}
      <!-- A dl's content model only allows div wrappers around dt/dd pairs,
           so the section heading keeps that shape (an empty, hidden dt)
           rather than dropping a bare heading element in — the dd itself
           spans both grid columns so the heading still reads full-width. -->
      <div class="stack-manifest__row stack-manifest__row--section" role="presentation">
        <dt class="stack-manifest__section-key" aria-hidden="true"></dt>
        <dd class="stack-manifest__section-value">
          <p class="stack-manifest__section">{group.section}</p>
        </dd>
      </div>
    {/if}
    <div class="stack-manifest__row">
      <dt class="stack-manifest__key">{group.category}</dt>
      <dd class="stack-manifest__value">
        <div class="stack-manifest__items">
          {#each group.items as item (item)}
            <Badge tone="neutral">{item}</Badge>
          {/each}
        </div>
        {#if group.note}
          <p class="stack-manifest__note">{group.note}</p>
        {/if}
      </dd>
    </div>
  {/each}
</dl>

<style>
  .stack-manifest {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    margin: 0;
  }

  .stack-manifest__row {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .stack-manifest__key {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    line-height: var(--stack-manifest-line, 1.75rem);
    text-transform: lowercase;
    color: var(--color-text-low);
  }

  .stack-manifest__value {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    min-width: 0;
  }

  .stack-manifest__items {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
    min-height: var(--stack-manifest-line, 1.75rem);
  }

  .stack-manifest__note {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--color-text-low);
  }

  .stack-manifest__section-key {
    display: none;
  }

  .stack-manifest__section-value {
    margin: 0;
  }

  .stack-manifest__section {
    margin: 0;
    margin-top: var(--space-2);
    font-family: var(--font-ui);
    font-weight: var(--font-weight-semibold);
    font-size: var(--text-sm);
    color: var(--color-text-med);
  }

  .stack-manifest__row--section:first-child .stack-manifest__section {
    margin-top: 0;
  }

  /* Wide: one grid for all rows (rows are display: contents) so the key
     column is as wide as the longest key; keys right-align onto their ` =`,
     hyprland.conf style. */
  @container (min-width: 36rem) {
    .stack-manifest {
      display: grid;
      grid-template-columns: max-content minmax(0, 1fr);
      column-gap: var(--space-3);
      row-gap: var(--space-3);
    }

    .stack-manifest__row {
      display: contents;
    }

    .stack-manifest__key {
      text-align: right;
    }

    .stack-manifest__key::after {
      content: " =";
      color: var(--color-text-low);
      opacity: 0.6;
    }

    .stack-manifest__section-value {
      grid-column: 1 / -1;
    }
  }

  /* Wide inside a CaseStudy (or any nesting panel): keys hang into the same
     shared gutter section numbers use, right-aligned so both end at the same
     edge, and values start at the shared content edge. `--reading-gutter`/
     `--reading-inset` are 0 outside that context, so the negative margin and
     the extra inline-size both collapse to nothing there. */
  /* Named query: only a wide CaseStudy (which reserves the gutter) makes
     this hang; any other wide container (a tile, a card) keeps it inline. */
  @container case-study (min-width: 64rem) {
    .stack-manifest {
      /* Same reasoning as `Section`'s number: the key column's width (what
         puts its right edge on the shared line) depends only on the gutter;
         the negative margin (and matching extra width) that repositions the
         whole grid needs the inset too, to cancel a nesting panel's own
         padding pushing the manifest's natural start further right. */
      grid-template-columns:
        max(0px, calc(var(--reading-gutter, 0px) - var(--space-3)))
        minmax(0, 1fr);
      margin-inline-start: calc(-1 * (var(--reading-gutter, 0px) + var(--reading-inset, 0px)));
      inline-size: calc(100% + var(--reading-gutter, 0px) + var(--reading-inset, 0px));
      /* Inset goes into the gap (see Section): values start at the
         manifest's own content edge, also inside a padded panel. */
      column-gap: calc(var(--space-3) + var(--reading-inset, 0px));
    }

    /* Section headings stay at the shared content edge, not the gutter. */
    .stack-manifest__section-value {
      grid-column: 2 / -1;
    }
  }
</style>
