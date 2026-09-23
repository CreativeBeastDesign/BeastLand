<!-- src/lib/components/molecules/Table.svelte -->

<script lang="ts" generics="T">
  import type { Snippet } from "svelte";

  type Align = "left" | "right";

  type Column<T> = {
    key: string;
    label: string;
    align?: Align;
    numeric?: boolean;
    width?: string;
    render?: Snippet<[row: T]>;
  };

  type Props = {
    columns: Column<T>[];
    rows: T[];
    rowKey: (row: T) => string;
    caption?: string;
    showCaption?: boolean;
    dense?: boolean;
    footer?: Snippet;
    onrowclick?: (row: T) => void;
    selectedKey?: string;
    /**
     * Row that is "about to be acted on" — a transient preview (e.g. the row a
     * half-typed command targets), not a selection. Independent of `selectedKey`.
     */
    markedKey?: string;
    empty?: string;
  };

  let {
    columns,
    rows,
    rowKey,
    caption,
    showCaption = false,
    dense,
    footer,
    onrowclick,
    selectedKey,
    markedKey,
    empty = "No data",
  }: Props = $props();

  function cellValue(row: T, key: string): unknown {
    return (row as Record<string, unknown>)[key];
  }

  function isNumeric(col: Column<T>): boolean {
    return col.numeric === true || col.align === "right";
  }

  function handleRowKeydown(event: KeyboardEvent, row: T) {
    if (!onrowclick) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onrowclick(row);
    }
  }
</script>

<table class="table" class:table--dense={dense}>
  {#if caption}
    <caption class="table__caption" class:table__caption--visible={showCaption}>{caption}</caption>
  {/if}
  <thead>
    <tr>
      {#each columns as col (col.key)}
        <th
          class="table__th"
          class:table__th--numeric={isNumeric(col)}
          style={col.width ? `width: ${col.width}` : undefined}
        >
          {col.label}
        </th>
      {/each}
    </tr>
  </thead>
  <tbody>
    {#if rows.length === 0}
      <tr>
        <td class="table__empty" colspan={columns.length}>{empty}</td>
      </tr>
    {:else}
      {#each rows as row (rowKey(row))}
        <tr
          class="table__row"
          class:table__row--clickable={!!onrowclick}
          class:table__row--selected={selectedKey !== undefined && selectedKey === rowKey(row)}
          class:table__row--marked={markedKey !== undefined && markedKey === rowKey(row)}
          tabindex={onrowclick ? 0 : undefined}
          onclick={() => onrowclick?.(row)}
          onkeydown={(event) => handleRowKeydown(event, row)}
        >
          {#each columns as col (col.key)}
            <td class="table__td" class:table__td--numeric={isNumeric(col)}>
              {#if col.render}
                {@render col.render(row)}
              {:else}
                {cellValue(row, col.key)}
              {/if}
            </td>
          {/each}
        </tr>
      {/each}
    {/if}
  </tbody>
  {#if footer}
    <tfoot>
      {@render footer()}
    </tfoot>
  {/if}
</table>

<style>
  .table {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    color: var(--color-text-med);
  }

  .table__caption {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .table__caption--visible {
    position: static;
    width: auto;
    height: auto;
    margin: 0 0 var(--space-2);
    clip: auto;
    overflow: visible;
    white-space: normal;
    text-align: left;
    font-size: var(--text-xs);
    color: var(--color-text-low);
  }

  .table__th {
    position: sticky;
    top: 0;
    z-index: 1;
    text-align: left;
    padding: var(--space-2) var(--space-3);
    border-bottom: var(--border-width) solid var(--color-border-subtle);
    background: var(--color-surface-0);

    font-family: var(--font-ui);
    font-size: var(--text-xs);
    font-weight: var(--font-weight-medium);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-low);
    white-space: nowrap;
  }

  .table__th--numeric {
    text-align: right;
  }

  .table__td {
    padding: var(--space-2) var(--space-3);
    border-bottom: var(--border-width) solid var(--color-border-subtle);
    color: var(--color-text-med);
  }

  .table--dense .table__th,
  .table--dense .table__td {
    padding: var(--space-1) var(--space-2);
  }

  .table__td--numeric {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-feature-settings: var(--font-feature-numeric);
  }

  .table__row--clickable {
    cursor: pointer;
  }

  .table__row--clickable:hover {
    background: color-mix(in oklab, var(--color-text-high) 5%, transparent);
  }

  .table__row--selected {
    background: var(--color-accent-soft);
  }

  /* Transient preview: tinted + inset bar, so it never shifts row height. */
  .table__row--marked {
    background: color-mix(in oklab, var(--color-secondary) 12%, transparent);
    box-shadow: inset 3px 0 0 var(--color-secondary);
  }

  .table__row--clickable:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: -2px;
  }

  .table__empty {
    padding: var(--space-4);
    text-align: center;
    color: var(--color-text-low);
  }

  tbody tr:last-child .table__td {
    border-bottom: none;
  }
</style>
