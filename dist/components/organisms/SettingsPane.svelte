<!-- src/lib/components/organisms/SettingsPane.svelte -->

<script lang="ts">
  import type { Snippet } from "svelte";

  type SettingRow = {
    id: string;
    label: string;
    description?: string;
  };

  type Props = {
    title?: string;
    sections?: { id: string; label: string }[];
    activeSection?: string;
    onsection?: (id: string) => void;
    rows?: SettingRow[];
    children?: Snippet;
  };

  let { title = "Settings", sections, activeSection, onsection, rows, children }: Props =
    $props();
</script>

<div class="settings-pane">
  <header class="settings-pane__header">
    <h2 class="settings-pane__title">{title}</h2>
  </header>

  <div class="settings-pane__layout">
    {#if sections}
      <nav class="settings-pane__nav" aria-label="Settings sections">
        {#each sections as section (section.id)}
          <button
            class="settings-pane__nav-item"
            class:settings-pane__nav-item--active={section.id === activeSection}
            aria-current={section.id === activeSection ? "true" : undefined}
            onclick={() => onsection?.(section.id)}
          >
            {section.label}
          </button>
        {/each}
      </nav>
    {/if}

    <div class="settings-pane__body">
      {#if children}
        {@render children()}
      {:else if rows}
        {#each rows as row (row.id)}
          <div class="settings-pane__row">
            <div>
              <div class="settings-pane__row-label">{row.label}</div>
              {#if row.description}
                <div class="settings-pane__row-desc">{row.description}</div>
              {/if}
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>
</div>

<style>
  .settings-pane {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--color-surface-0);
  }

  .settings-pane__header {
    padding: var(--space-3) var(--space-4);
    border-bottom: var(--border-width) solid var(--color-border);
  }

  .settings-pane__title {
    margin: 0;
    font-size: var(--text-base);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-high);
  }

  .settings-pane__layout {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .settings-pane__nav {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    width: 11rem;
    padding: var(--space-2);
    border-right: var(--border-width) solid var(--color-border);
  }

  .settings-pane__nav-item {
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-control);
    border: none;
    background: transparent;
    color: var(--color-text-med);
    cursor: pointer;
    text-align: left;
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    transition: background var(--duration-fast) var(--ease-out);
  }

  .settings-pane__nav-item:hover {
    background: color-mix(in oklab, var(--color-text-high) 8%, transparent);
  }

  .settings-pane__nav-item:focus-visible {
    outline: 2px solid var(--color-focus, var(--color-accent));
    outline-offset: -2px;
  }

  .settings-pane__nav-item--active {
    background: color-mix(in oklab, var(--color-accent) 16%, transparent);
    color: var(--color-accent);
  }

  .settings-pane__body {
    flex: 1;
    padding: var(--space-4) var(--space-5);
    overflow-y: auto;
  }

  .settings-pane__row {
    padding: var(--space-3) 0;
    border-bottom: var(--border-width) solid var(--color-border);
  }

  .settings-pane__row:last-child {
    border-bottom: none;
  }

  .settings-pane__row-label {
    color: var(--color-text-high);
    font-size: var(--text-sm);
  }

  .settings-pane__row-desc {
    color: var(--color-text-low);
    font-size: var(--text-xs);
    margin-top: var(--space-1);
  }
</style>
