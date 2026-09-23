<!-- src/lib/components/molecules/Menu.svelte -->

<script lang="ts">
  import type { Snippet } from "svelte";

  type MenuAction = {
    id: string;
    label: string;
    shortcut?: string;
    disabled?: boolean;
    danger?: boolean;
    command?: string;
    onselect?: () => void;
  };
  type MenuSeparator = { separator: true };
  type MenuItem = MenuAction | MenuSeparator;

  type Placement = "bottom-start" | "bottom-end";

  type Props = {
    items: MenuItem[];
    open: boolean;
    onclose: () => void;
    anchor: Snippet;
    placement?: Placement;
    /** Receives an item's `command` when selected (the app wires it to `shell.run`). */
    oncommand?: (command: string) => void;
  };

  let { items, open, onclose, anchor, placement = "bottom-start", oncommand }: Props = $props();

  function isSeparator(item: MenuItem): item is MenuSeparator {
    return "separator" in item;
  }

  function actionItems(): MenuAction[] {
    return items.filter((item): item is MenuAction => !isSeparator(item));
  }

  let wrapperEl: HTMLDivElement | undefined;
  let itemRefs: Record<string, HTMLButtonElement> = {};

  function focusItem(id: string) {
    itemRefs[id]?.focus();
  }

  function selectItem(item: MenuAction) {
    if (item.disabled) return;
    if (item.command) oncommand?.(item.command);
    item.onselect?.();
    onclose();
  }

  function closeAndReturnFocus() {
    onclose();
    wrapperEl?.focus();
  }

  function handleDocumentMousedown(event: MouseEvent) {
    if (wrapperEl && !wrapperEl.contains(event.target as Node)) onclose();
  }

  $effect(() => {
    if (!open) return;
    document.addEventListener("mousedown", handleDocumentMousedown);
    return () => document.removeEventListener("mousedown", handleDocumentMousedown);
  });

  $effect(() => {
    if (!open) return;
    const first = actionItems().find((item) => !item.disabled);
    if (first) queueMicrotask(() => focusItem(first.id));
  });

  function handleKeydown(event: KeyboardEvent) {
    const usable = actionItems().filter((item) => !item.disabled);
    if (usable.length === 0) return;

    const activeId = (document.activeElement as HTMLElement | null)?.dataset.menuItem;
    const currentIndex = usable.findIndex((item) => item.id === activeId);

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusItem(usable[(currentIndex + 1 + usable.length) % usable.length].id);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusItem(usable[(currentIndex - 1 + usable.length) % usable.length].id);
        break;
      case "Home":
        event.preventDefault();
        focusItem(usable[0].id);
        break;
      case "End":
        event.preventDefault();
        focusItem(usable[usable.length - 1].id);
        break;
      case "Enter":
      case " ": {
        event.preventDefault();
        const current = usable[currentIndex];
        if (current) selectItem(current);
        break;
      }
      case "Escape":
        event.preventDefault();
        closeAndReturnFocus();
        break;
      default:
        return;
    }
  }
</script>

<div class="menu-wrapper" bind:this={wrapperEl} tabindex="-1">
  {@render anchor()}

  {#if open}
    <div
      class="menu motion-pop-in"
      class:menu--end={placement === "bottom-end"}
      role="menu"
      tabindex="-1"
      onkeydown={handleKeydown}
    >
      {#each items as item, i (isSeparator(item) ? `sep-${i}` : item.id)}
        {#if isSeparator(item)}
          <div class="menu__separator" role="separator"></div>
        {:else}
          <button
            bind:this={itemRefs[item.id]}
            class="menu__item"
            class:menu__item--danger={item.danger}
            role="menuitem"
            type="button"
            data-menu-item={item.id}
            disabled={item.disabled}
            tabindex="-1"
            onclick={() => selectItem(item)}
          >
            <span class="menu__item-label">{item.label}</span>
            {#if item.shortcut}
              <span class="menu__item-shortcut">{item.shortcut}</span>
            {/if}
          </button>
        {/if}
      {/each}
    </div>
  {/if}
</div>

<style>
  .menu-wrapper {
    position: relative;
    display: inline-block;
  }

  .menu-wrapper:focus-visible {
    outline: none;
  }

  .menu {
    position: absolute;
    top: calc(100% + var(--space-2));
    left: 0;
    z-index: var(--layer-popover);
    min-width: 12rem;
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: var(--space-1);
    border-radius: var(--radius-popup);
    border: var(--border-width) solid var(--color-border);
    background: var(--color-popover);
    backdrop-filter: blur(var(--fx-blur-lg)) saturate(var(--fx-glass-saturation));
    box-shadow: var(--shadow-popup);
  }

  .menu--end {
    left: auto;
    right: 0;
  }

  .menu__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-2) var(--space-3);
    border: none;
    border-radius: var(--radius-control);
    background: transparent;
    color: var(--color-text-high);
    cursor: pointer;

    font-family: var(--font-ui);
    font-size: var(--text-sm);
    text-align: left;

    transition: background var(--duration-fast) var(--ease-out);
  }

  .menu__item:hover:not(:disabled) {
    background: color-mix(in oklab, var(--color-text-high) 8%, transparent);
  }

  .menu__item:disabled {
    color: var(--color-text-disabled);
    cursor: not-allowed;
  }

  .menu__item:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  .menu__item--danger {
    color: var(--color-danger);
  }

  .menu__item-shortcut {
    margin-left: auto;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-text-low);
  }

  .menu__separator {
    height: 1px;
    margin: var(--space-1) var(--space-2);
    background: var(--color-border);
  }
</style>
