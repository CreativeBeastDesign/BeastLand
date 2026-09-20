<!-- src/lib/components/organisms/Sidebar.svelte -->

<script lang="ts">
  import type { Snippet } from "svelte";

  type SidebarItem = {
    id: string;
    label: string;
    icon?: Snippet;
    badge?: string;
  };

  type Props = {
    items?: SidebarItem[];
    activeId?: string;
    onselect?: (id: string) => void;
    header?: Snippet;
    footer?: Snippet;
    children?: Snippet;
  };

  let { items = [], activeId, onselect, header, footer, children }: Props =
    $props();
</script>

<aside class="sidebar">
  {#if header}
    <div class="sidebar__header">{@render header()}</div>
  {/if}

  {#if children}
    <div class="sidebar__body">{@render children()}</div>
  {:else}
    <nav class="sidebar__body" aria-label="Sidebar navigation">
      {#each items as item (item.id)}
        <button
          class="sidebar__item"
          class:sidebar__item--active={item.id === activeId}
          aria-current={item.id === activeId ? "true" : undefined}
          onclick={() => onselect?.(item.id)}
        >
          {#if item.icon}
            <span class="sidebar__item-icon">{@render item.icon()}</span>
          {/if}
          <span class="sidebar__item-label">{item.label}</span>
          {#if item.badge}
            <span class="sidebar__item-badge">{item.badge}</span>
          {/if}
        </button>
      {/each}
    </nav>
  {/if}

  {#if footer}
    <div class="sidebar__footer">{@render footer()}</div>
  {/if}
</aside>

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    width: 14rem;
    height: 100%;
    background: var(--color-glass);
    backdrop-filter: blur(var(--fx-blur-md)) saturate(var(--fx-glass-saturation));
    border-right: var(--border-width) solid var(--color-border);
    position: relative;
    z-index: var(--layer-window);
  }

  .sidebar__header,
  .sidebar__footer {
    padding: var(--space-3);
    border-bottom: var(--border-width) solid var(--color-border);
  }

  .sidebar__footer {
    border-bottom: none;
    border-top: var(--border-width) solid var(--color-border);
    margin-top: auto;
  }

  .sidebar__body {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-2);
    overflow-y: auto;
  }

  .sidebar__item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-control);
    border: none;
    background: transparent;
    color: var(--color-text-med);
    cursor: pointer;
    text-align: left;

    font-family: var(--font-ui);
    font-size: var(--text-sm);

    transition:
      background var(--duration-fast) var(--ease-out),
      color var(--duration-fast) var(--ease-out),
      box-shadow var(--duration-fast) var(--ease-out);
  }

  .sidebar__item:hover {
    background: color-mix(in oklab, var(--color-text-high) 8%, transparent);
    color: var(--color-text-high);
  }

  .sidebar__item:focus-visible {
    outline: 2px solid var(--color-focus, var(--color-accent));
    outline-offset: -2px;
  }

  .sidebar__item--active {
    background: color-mix(in oklab, var(--color-accent) 16%, transparent);
    color: var(--color-accent);
    box-shadow: inset 0 0 0 1px
      color-mix(in oklab, var(--color-accent) 40%, transparent);
  }

  .sidebar__item-icon {
    display: inline-flex;
  }

  .sidebar__item-badge {
    margin-left: auto;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-text-low);
  }
</style>
