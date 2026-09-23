<!-- src/lib/components/molecules/RecordView.svelte -->

<script lang="ts">
  /** How a `command` field was activated: click runs it, ⇧-click inserts it into a prompt. */
  export type CommandMode = "run" | "insert";

  export type RecordField = {
    key: string;
    value: string;
    /** Value may be long; spans both columns in the wide layout. */
    wide?: boolean;
    /** Reads as prose (e.g. a customer name) rather than data — uses the UI font instead of mono. */
    prose?: boolean;
    /** Makes the value a link that runs this terminal line (e.g. `#xp`); ⇧-click inserts it. */
    command?: string;
  };

  type Props = {
    fields: RecordField[];
    /**
     * Called when a `command` field is activated. The kit does not know the
     * shell; the app passes e.g. `(cmd, mode) => mode === "run" ? shell.run(cmd) : shell.insert(cmd)`.
     * Without it, command fields render as plain text.
     */
    oncommand?: (command: string, mode: CommandMode) => void;
  };

  let { fields, oncommand }: Props = $props();

  function activate(event: MouseEvent, command: string) {
    event.stopPropagation(); // don't also select the tile
    oncommand?.(command, event.shiftKey ? "insert" : "run");
  }
</script>

<div class="record-view">
  {#each fields as field (field.key)}
    <div class="record-view__row" class:record-view__row--wide={field.wide}>
      <span class="record-view__key">{field.key}</span>
      {#if field.command && oncommand}
        <button
          type="button"
          class="record-view__value record-view__value--link"
          class:record-view__value--prose={field.prose}
          title={field.command}
          onclick={(event) => activate(event, field.command!)}>{field.value}</button
        >
      {:else}
        <span class="record-view__value" class:record-view__value--prose={field.prose}>{field.value}</span>
      {/if}
    </div>
  {/each}
</div>

<style>
  .record-view {
    display: flex;
    flex-direction: column;
    row-gap: var(--space-1);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
  }

  .record-view__row {
    display: flex;
    flex-direction: column;
  }

  .record-view__key {
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-high);
  }

  .record-view__value {
    padding-left: var(--space-3);
    color: var(--color-text-med);
    word-break: break-word;
    font-variant-numeric: tabular-nums;
    font-feature-settings: var(--font-feature-numeric);
  }

  /* Links rest at low chroma with a faint underline and come to full colour
     on hover — present without competing with the data around them. */
  .record-view__value--link {
    all: unset;
    cursor: pointer;
    color: oklch(from var(--color-secondary, var(--color-accent)) l calc(c * 0.4) h);
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 0.15em;
    text-decoration-color: color-mix(in oklab, currentColor 35%, transparent);
    transition:
      color var(--duration-normal) var(--ease-out),
      text-decoration-color var(--duration-normal) var(--ease-out);
  }

  .record-view__value--link:hover,
  .record-view__value--link:focus-visible {
    color: var(--color-secondary, var(--color-accent));
    text-decoration-color: currentColor;
  }

  .record-view__value--prose {
    font-family: var(--font-ui);
  }

  /* medium: 2-column grid, keys right-aligned */
  @container tile (min-width: 22rem) {
    .record-view {
      display: grid;
      grid-template-columns: max-content 1fr;
      column-gap: var(--space-3);
      row-gap: var(--space-1);
    }

    .record-view__row:not(.record-view__row--wide) {
      display: contents;
    }

    .record-view__row--wide {
      grid-column: 1 / -1;
      display: flex;
      flex-direction: column;
    }

    .record-view__key {
      text-align: right;
    }

    .record-view__row:not(.record-view__row--wide) .record-view__value {
      padding-left: 0;
    }
  }

  /* wide: keys left-aligned, tighter rows */
  @container tile (min-width: 36rem) {
    .record-view {
      row-gap: 0.125rem;
    }

    .record-view__key {
      text-align: left;
    }

    .record-view__row--wide .record-view__value {
      padding-left: 0;
    }
  }
</style>
