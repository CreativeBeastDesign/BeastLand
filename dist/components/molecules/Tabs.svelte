<!-- src/lib/components/molecules/Tabs.svelte -->

<script lang="ts">
  import type { Snippet } from "svelte";
  import Badge from "../atoms/Badge.svelte";

  type TabDatum = {
    id: string;
    label: string;
    badge?: string;
    disabled?: boolean;
  };

  type Variant = "underline" | "pill";

  type Props = {
    tabs: TabDatum[];
    active: string;
    onchange?: (id: string) => void;
    variant?: Variant;
    children?: Snippet<[id: string]>;
  };

  let { tabs, active, onchange, variant = "underline", children }: Props = $props();

  const uid = $props.id();
  const tabElId = (id: string) => `tabs-${uid}-tab-${id}`;
  const panelElId = (id: string) => `tabs-${uid}-panel-${id}`;

  let tabRefs: Record<string, HTMLButtonElement> = {};

  function enabledTabs(): TabDatum[] {
    return tabs.filter((tab) => !tab.disabled);
  }

  function select(id: string) {
    if (id !== active) onchange?.(id);
  }

  function focusTab(id: string) {
    tabRefs[id]?.focus();
  }

  function handleKeydown(event: KeyboardEvent) {
    const usable = enabledTabs();
    if (usable.length === 0) return;
    const currentIndex = usable.findIndex((tab) => tab.id === active);

    let nextId: string | undefined;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextId = usable[(currentIndex + 1 + usable.length) % usable.length].id;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextId = usable[(currentIndex - 1 + usable.length) % usable.length].id;
        break;
      case "Home":
        nextId = usable[0].id;
        break;
      case "End":
        nextId = usable[usable.length - 1].id;
        break;
      default:
        return;
    }

    event.preventDefault();
    select(nextId);
    focusTab(nextId);
  }
</script>

<div class="tabs">
  <div
    class="tabs__list"
    class:tabs__list--pill={variant === "pill"}
    role="tablist"
    tabindex="-1"
    onkeydown={handleKeydown}
  >
    {#each tabs as tab (tab.id)}
      <button
        bind:this={tabRefs[tab.id]}
        id={tabElId(tab.id)}
        class="tabs__tab"
        class:tabs__tab--active={tab.id === active}
        role="tab"
        type="button"
        aria-selected={tab.id === active}
        aria-controls={panelElId(tab.id)}
        disabled={tab.disabled}
        tabindex={tab.id === active ? 0 : -1}
        onclick={() => select(tab.id)}
      >
        <span class="tabs__tab-label">{tab.label}</span>
        {#if tab.badge}
          <Badge tone={tab.id === active ? "accent" : "neutral"}>{tab.badge}</Badge>
        {/if}
      </button>
    {/each}
  </div>

  <div
    id={panelElId(active)}
    class="tabs__panel"
    role="tabpanel"
    aria-labelledby={tabElId(active)}
    tabindex="0"
  >
    {#if children}
      {@render children(active)}
    {/if}
  </div>
</div>

<style>
  .tabs {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .tabs__list {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    border-bottom: var(--border-width) solid var(--color-border);
  }

  .tabs__list--pill {
    border-bottom: none;
    gap: var(--space-2);
  }

  .tabs__tab {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border: none;
    background: transparent;
    color: var(--color-text-med);
    cursor: pointer;

    font-family: var(--font-ui);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);

    transition: color var(--duration-fast) var(--ease-out);
  }

  .tabs__tab:hover:not(:disabled) {
    color: var(--color-text-high);
  }

  .tabs__tab:disabled {
    color: var(--color-text-disabled);
    cursor: not-allowed;
  }

  .tabs__tab--active {
    color: var(--color-text-high);
  }

  /* Underline variant: a per-tab ::after that scales in on activation. */
  .tabs__tab::after {
    content: "";
    position: absolute;
    left: var(--space-3);
    right: var(--space-3);
    bottom: -1px;
    height: 2px;
    border-radius: var(--radius-pill);
    background: var(--gradient-brand);
    transform: scaleX(0);
    transform-origin: center;
    transition: transform var(--duration-normal) var(--ease-hypr);
  }

  .tabs__list--pill .tabs__tab::after {
    content: none;
  }

  .tabs__tab--active::after {
    transform: scaleX(1);
  }

  .tabs__list--pill .tabs__tab {
    border-radius: var(--radius-pill);
    border: var(--border-width) solid transparent;
  }

  .tabs__list--pill .tabs__tab--active {
    background: color-mix(in oklab, var(--color-accent) 16%, transparent);
    border-color: color-mix(in oklab, var(--color-accent) 45%, transparent);
    color: var(--color-accent);
  }

  .tabs__panel {
    color: var(--color-text-med);
  }

  .tabs__tab:focus-visible,
  .tabs__panel:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
    border-radius: var(--radius-control);
  }

  @media (prefers-reduced-motion: reduce) {
    .tabs__tab::after {
      transition: none;
    }
  }
</style>
