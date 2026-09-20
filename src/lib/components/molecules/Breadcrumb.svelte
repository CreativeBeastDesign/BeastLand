<!-- src/lib/components/molecules/Breadcrumb.svelte -->

<script lang="ts">
  import type { Snippet } from "svelte";
  import Menu from "$lib/components/molecules/Menu.svelte";

  type BreadcrumbItem = {
    label: string;
    href?: string;
    command?: string;
    icon?: Snippet;
  };

  type Props = {
    items: BreadcrumbItem[];
    separator?: string;
    maxItems?: number;
    /** Receives an item's `command` when clicked (the app wires it to `shell.run`). */
    oncommand?: (command: string) => void;
  };

  let { items, separator = "/", maxItems = 4, oncommand }: Props = $props();

  type Entry = { item: BreadcrumbItem; isCurrent: boolean; isEllipsis?: false } | { isEllipsis: true };

  let menuOpen = $state(false);

  const collapsed = $derived(items.length > maxItems);
  const tailCount = $derived(Math.max(1, maxItems - 2));

  const middleItems = $derived(collapsed ? items.slice(1, items.length - tailCount) : []);

  const entries = $derived.by((): Entry[] => {
    if (!collapsed) {
      return items.map((item, i) => ({ item, isCurrent: i === items.length - 1 }));
    }
    const tail = items.slice(items.length - tailCount);
    const result: Entry[] = [{ item: items[0], isCurrent: false }, { isEllipsis: true }];
    tail.forEach((item, i) => result.push({ item, isCurrent: i === tail.length - 1 }));
    return result;
  });

  const middleMenuItems = $derived(
    middleItems.map((item, i) => ({
      id: `middle-${i}`,
      label: item.label,
      command: item.command,
      onselect: !item.command && item.href ? () => navigateTo(item.href!) : undefined,
    })),
  );

  function navigateTo(href: string) {
    if (typeof window !== "undefined") window.location.href = href;
  }
</script>

<nav aria-label="Breadcrumb" class="breadcrumb">
  <ol class="breadcrumb__list">
    {#each entries as entry, i (i)}
      {#if i > 0}
        <li class="breadcrumb__sep" aria-hidden="true">{separator}</li>
      {/if}
      {#if entry.isEllipsis}
        <li class="breadcrumb__item">
          <Menu items={middleMenuItems} open={menuOpen} onclose={() => (menuOpen = false)} {oncommand}>
            {#snippet anchor()}
              <button
                type="button"
                class="breadcrumb__ellipsis"
                aria-label="Show {middleItems.length} more"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                onclick={() => (menuOpen = !menuOpen)}
              >
                &hellip;
              </button>
            {/snippet}
          </Menu>
        </li>
      {:else}
        <li class="breadcrumb__item">
          {#if entry.item.icon}
            <span class="breadcrumb__icon">{@render entry.item.icon()}</span>
          {/if}
          {#if entry.isCurrent}
            <span class="breadcrumb__text breadcrumb__text--current" aria-current="page"
              >{entry.item.label}</span
            >
          {:else if entry.item.href}
            <a class="breadcrumb__link" href={entry.item.href}>{entry.item.label}</a>
          {:else if entry.item.command}
            <button
              type="button"
              class="breadcrumb__link breadcrumb__link--button"
              onclick={() => oncommand?.(entry.item.command!)}
            >
              {entry.item.label}
            </button>
          {:else}
            <span class="breadcrumb__text">{entry.item.label}</span>
          {/if}
        </li>
      {/if}
    {/each}
  </ol>
</nav>

<style>
  .breadcrumb {
    font-family: var(--font-ui);
  }

  .breadcrumb__list {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    margin: 0;
    padding: 0;
    list-style: none;
    gap: var(--space-1);
  }

  .breadcrumb__item {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    min-width: 0;
  }

  .breadcrumb__icon {
    display: inline-flex;
    color: var(--color-text-low);
  }

  .breadcrumb__sep {
    color: var(--color-text-low);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
  }

  .breadcrumb__link,
  .breadcrumb__ellipsis {
    padding: 0.15rem 0.2rem;
    border: none;
    border-radius: var(--radius-xs);
    background: transparent;
    color: var(--color-text-med);
    font-family: inherit;
    font-size: var(--text-sm);
    text-decoration: none;
    cursor: pointer;
    transition: color var(--duration-fast) var(--ease-out);
  }

  .breadcrumb__link--button {
    font: inherit;
  }

  .breadcrumb__link:hover,
  .breadcrumb__ellipsis:hover {
    color: var(--color-text-high);
  }

  .breadcrumb__link:focus-visible,
  .breadcrumb__ellipsis:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  .breadcrumb__text {
    padding: 0.15rem 0.2rem;
    color: var(--color-text-med);
    font-size: var(--text-sm);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .breadcrumb__text--current {
    color: var(--color-text-high);
    font-weight: var(--font-weight-semibold);
  }

  .breadcrumb__ellipsis {
    line-height: 1;
  }
</style>
