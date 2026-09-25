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
  {#each groups as group (group.category)}
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
  }
</style>
