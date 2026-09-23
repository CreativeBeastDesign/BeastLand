<!-- src/lib/components/molecules/WorkspaceSwitcher.svelte -->

<script lang="ts">
  type Workspace = {
    id: string;
    label: string;
  };

  type Props = {
    workspaces?: Workspace[];
    activeId?: string;
    onchange?: (id: string) => void;
    /** `solid` (default): pill on a surface, accent-filled active. `ghost`: bare text, accent-coloured active — for title bars. */
    variant?: "solid" | "ghost";
  };

  let {
    workspaces = [
      { id: "one", label: "1" },
      { id: "two", label: "2" },
      { id: "three", label: "3" },
    ],
    activeId = "one",
    onchange,
    variant = "solid",
  }: Props = $props();
</script>

<div class="ws-switcher" data-variant={variant} role="tablist" aria-label="Workspaces">
  {#each workspaces as ws (ws.id)}
    <button
      class="ws-switcher__item"
      class:ws-switcher__item--active={ws.id === activeId}
      type="button"
      role="tab"
      aria-selected={ws.id === activeId}
      onclick={() => onchange?.(ws.id)}
    >
      {ws.label}
    </button>
  {/each}
</div>

<style>
  .ws-switcher {
    display: flex;
    gap: var(--space-1);
    padding: var(--space-1);
    border-radius: var(--radius-control);
    background: var(--color-surface-1);
  }

  .ws-switcher__item {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.75rem;
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-control);
    border: none;
    background: transparent;
    color: var(--color-text-low);
    cursor: pointer;

    font-family: var(--font-ui);
    font-size: 0.75rem;
    font-weight: var(--font-weight-medium);

    transition:
      background var(--duration-fast) var(--ease-out),
      color var(--duration-fast) var(--ease-out),
      box-shadow var(--duration-fast) var(--ease-out);
  }

  .ws-switcher__item:hover {
    color: var(--color-text-high);
  }

  .ws-switcher__item:focus-visible {
    outline: 2px solid var(--color-focus, var(--color-accent));
    outline-offset: 2px;
  }

  .ws-switcher__item--active {
    background: var(--color-accent);
    color: var(--color-on-accent);
    box-shadow: 0 0 10px var(--color-glow);
  }

  /* Ghost: no surface, no fill — the active workspace is just the accent
     colour, so it sits in a title bar without pulling attention. */
  .ws-switcher[data-variant="ghost"] {
    padding: 0;
    background: transparent;
    gap: 0;
  }

  .ws-switcher[data-variant="ghost"] .ws-switcher__item {
    min-width: 1.5rem;
    padding: 0.125rem 0.375rem;
    font-family: var(--font-mono);
    color: var(--color-text-low);
  }

  .ws-switcher[data-variant="ghost"] .ws-switcher__item--active {
    background: transparent;
    color: var(--color-accent);
    box-shadow: none;
  }
</style>
