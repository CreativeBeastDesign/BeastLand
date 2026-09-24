<!-- src/lib/components/organisms/Dock.svelte -->

<script lang="ts">
  import type { Snippet } from "svelte";

  type DockItem = {
    id: string;
    label: string;
    icon?: Snippet;
  };

  type Props = {
    items?: DockItem[];
    activeId?: string;
    onselect?: (id: string) => void;
    fixed?: boolean;
    children?: Snippet;
  };

  let { items = [], activeId, onselect, fixed = true, children }: Props = $props();
</script>

<nav class="dock" class:dock--fixed={fixed} aria-label="Dock">
  {#if children}
    <div class="dock__items">{@render children()}</div>
  {:else}
    <div class="dock__items">
      {#each items as item (item.id)}
        <button
          class="dock__item"
          class:dock__item--active={item.id === activeId}
          title={item.label}
          aria-label={item.label}
          aria-current={item.id === activeId ? "true" : undefined}
          onclick={() => onselect?.(item.id)}
        >
          {#if item.icon}
            {@render item.icon()}
          {:else}
            <span class="dock__item-fallback"></span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</nav>

<style>
  .dock {
    display: inline-flex;
    padding: var(--space-2);
    border-radius: var(--radius-window);
    border: var(--border-width) solid var(--color-border);
    background: var(--color-glass);
    backdrop-filter: blur(var(--fx-blur-lg)) saturate(var(--fx-glass-saturation));
    box-shadow: var(--shadow-window);
  }

  .dock--fixed {
    position: fixed;
    bottom: var(--gap-tile);
    left: 50%;
    transform: translateX(-50%);
    z-index: var(--layer-shell);
  }

  .dock__items {
    display: flex;
    gap: var(--space-1);
  }

  .dock__item {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--dock-item-size);
    height: var(--dock-item-size);
    border-radius: var(--radius-control);
    border: none;
    background: transparent;
    color: var(--color-text-med);
    cursor: pointer;
    transition:
      background var(--duration-normal) var(--ease-hypr),
      color var(--duration-fast) var(--ease-out),
      transform var(--duration-normal) var(--ease-hypr);
  }

  .dock__item:hover {
    background: color-mix(in oklab, var(--color-text-high) 10%, transparent);
    color: var(--color-text-high);
    transform: translateY(-4px) scale(1.05);
  }

  .dock__item:focus-visible {
    outline: 2px solid var(--color-focus, var(--color-accent));
    outline-offset: 2px;
  }

  .dock__item--active {
    color: var(--color-accent);
    background: color-mix(in oklab, var(--color-accent) 16%, transparent);
    box-shadow: 0 0 12px var(--color-glow);
  }

  .dock__item-fallback {
    width: 1.1rem;
    height: 1.1rem;
    border-radius: var(--radius-control);
    background: currentColor;
    opacity: 0.7;
  }
</style>
