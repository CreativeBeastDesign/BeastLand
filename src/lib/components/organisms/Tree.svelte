<!-- src/lib/components/organisms/Tree.svelte -->
<!-- Renders like the `tree` CLI: mono, box-drawing guides, ARIA tree pattern
     with roving tabindex. Flattening (guides/levels) is pure logic in
     `$lib/reading/tree.ts` so this component just walks rows. -->

<script lang="ts">
  import { flattenTree, type TreeRow } from "$lib/reading/tree.js";
  import type { TreeNode } from "$lib/reading/types.js";
  import { overflowFade } from "$lib/actions/overflowFade.js";

  type Props = {
    nodes: TreeNode[];
    selected?: string | null;
    onselect?: (node: TreeNode) => void;
    label?: string;
    class?: string;
  };

  let {
    nodes,
    selected = $bindable(null),
    onselect,
    label = "Tree",
    class: className,
  }: Props = $props();

  function collectInitiallyOpen(list: TreeNode[], set: Set<string>) {
    for (const node of list) {
      if (node.open && node.children && node.children.length > 0) set.add(node.id);
      if (node.children) collectInitiallyOpen(node.children, set);
    }
  }

  let openIds = $state<Set<string>>(new Set());
  $effect(() => {
    const seeded = new Set<string>();
    collectInitiallyOpen(nodes, seeded);
    openIds = seeded;
  });

  const rows = $derived(flattenTree(nodes, openIds));

  let focusedId = $state<string | null>(null);
  $effect(() => {
    if (rows.length === 0) {
      focusedId = null;
    } else if (!rows.some((row) => row.node.id === focusedId)) {
      focusedId = selected && rows.some((row) => row.node.id === selected) ? selected : rows[0].node.id;
    }
  });

  let rowRefs: Record<string, HTMLDivElement> = {};

  function focusRow(id: string) {
    focusedId = id;
    rowRefs[id]?.focus();
  }

  function indexOf(id: string | null): number {
    return rows.findIndex((row) => row.node.id === id);
  }

  function open(id: string) {
    openIds.add(id);
  }

  function close(id: string) {
    openIds.delete(id);
  }

  function toggle(row: TreeRow) {
    if (!row.hasChildren) return;
    if (row.open) close(row.node.id);
    else open(row.node.id);
  }

  function select(row: TreeRow) {
    if (row.node.disabled) return;
    selected = row.node.id;
    onselect?.(row.node);
  }

  function parentOf(row: TreeRow): TreeRow | undefined {
    const idx = indexOf(row.node.id);
    for (let i = idx - 1; i >= 0; i -= 1) {
      if (rows[i].level < row.level) return rows[i];
    }
    return undefined;
  }

  function handleKeydown(event: KeyboardEvent, row: TreeRow) {
    const idx = indexOf(row.node.id);

    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();
        const next = rows[Math.min(idx + 1, rows.length - 1)];
        if (next) focusRow(next.node.id);
        break;
      }
      case "ArrowUp": {
        event.preventDefault();
        const prev = rows[Math.max(idx - 1, 0)];
        if (prev) focusRow(prev.node.id);
        break;
      }
      case "ArrowRight": {
        event.preventDefault();
        if (row.hasChildren && !row.open) {
          open(row.node.id);
        } else if (row.hasChildren && row.open) {
          const next = rows[idx + 1];
          if (next && next.level > row.level) focusRow(next.node.id);
        }
        break;
      }
      case "ArrowLeft": {
        event.preventDefault();
        if (row.hasChildren && row.open) {
          close(row.node.id);
        } else {
          const parent = parentOf(row);
          if (parent) focusRow(parent.node.id);
        }
        break;
      }
      case "Home": {
        event.preventDefault();
        if (rows[0]) focusRow(rows[0].node.id);
        break;
      }
      case "End": {
        event.preventDefault();
        const last = rows[rows.length - 1];
        if (last) focusRow(last.node.id);
        break;
      }
      case "Enter":
      case " ": {
        event.preventDefault();
        select(row);
        break;
      }
      default:
        return;
    }
  }
</script>

<div
  class={["tree", className].filter(Boolean).join(" ")}
  use:overflowFade
>
  <div class="tree__list" role="tree" aria-label={label}>
    {#each rows as row (row.node.id)}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div
        bind:this={rowRefs[row.node.id]}
        class="tree__row"
        class:tree__row--selected={row.node.id === selected}
        class:tree__row--disabled={row.node.disabled}
        role="treeitem"
        aria-level={row.level + 1}
        aria-selected={row.node.id === selected}
        aria-expanded={row.hasChildren ? row.open : undefined}
        aria-disabled={row.node.disabled || undefined}
        tabindex={row.node.id === focusedId ? 0 : -1}
        onclick={() => {
          focusedId = row.node.id;
          if (row.hasChildren) toggle(row);
          select(row);
        }}
        onkeydown={(event) => handleKeydown(event, row)}
      >
        <span class="tree__guides" aria-hidden="true">
          {#each row.guides as guide, i (i)}
            <span class="tree__guide" class:tree__guide--pipe={guide === "pipe"}></span>
          {/each}
          {#if row.level > 0}
            <span class="tree__branch">{row.last ? "└── " : "├── "}</span>
          {/if}
        </span>
        {#if row.hasChildren}
          <span class="tree__toggle" aria-hidden="true">{row.open ? "▾" : "▸"}</span>
        {/if}
        <span class="tree__label" class:tree__label--folder={row.hasChildren}
          >{row.node.label}{row.hasChildren ? "/" : ""}</span
        >
        {#if row.node.note}
          <span class="tree__note">  # {row.node.note}</span>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .tree {
    overflow-x: auto;
    font-family: var(--font-mono);
    font-size: var(--text-sm);
  }

  .tree__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    white-space: nowrap;
  }

  .tree__row {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-control);
    color: var(--color-text-med);
    cursor: pointer;
  }

  .tree__row:hover {
    color: var(--color-text-high);
    background: color-mix(in oklab, var(--color-text-high) 6%, transparent);
  }

  .tree__row:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: -2px;
  }

  .tree__row--selected {
    color: var(--color-text-high);
    background: var(--color-accent-soft);
  }

  .tree__row--disabled {
    color: var(--color-text-disabled);
    cursor: not-allowed;
  }

  .tree__guides {
    display: inline-flex;
    color: var(--color-text-low);
  }

  .tree__guide {
    display: inline-block;
    width: 1.25rem;
  }

  .tree__guide::before {
    content: "    ";
    white-space: pre;
  }

  .tree__guide--pipe::before {
    content: "│   ";
    white-space: pre;
  }

  .tree__branch {
    white-space: pre;
  }

  .tree__toggle {
    color: var(--color-text-low);
  }

  .tree__label--folder {
    color: var(--color-accent);
  }

  .tree__note {
    color: var(--color-text-low);
    white-space: pre;
  }
</style>
