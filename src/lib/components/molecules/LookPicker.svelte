<!-- src/lib/components/molecules/LookPicker.svelte -->
<!-- Dumb UI-kit picker: value in, onchange out, data passed in as props —
     no store imports. `value` may be null (no registered look matches the
     current theme + wallpaper pair); nothing is marked active then. -->

<script lang="ts">
  type LookOption = { id: string; label: string; description?: string };

  type Props = {
    looks: LookOption[];
    value: string | null;
    onchange?: (id: string) => void;
  };

  let { looks, value, onchange }: Props = $props();
  let refs: Record<string, HTMLButtonElement> = {};

  function select(id: string) {
    if (id !== value) onchange?.(id);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (looks.length === 0) return;
    const i = looks.findIndex((l) => l.id === value);
    let next: string | undefined;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = looks[(i + 1 + looks.length) % looks.length].id;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = looks[(i - 1 + looks.length) % looks.length].id;
        break;
      case "Home":
        next = looks[0].id;
        break;
      case "End":
        next = looks[looks.length - 1].id;
        break;
      default:
        return;
    }
    event.preventDefault();
    select(next);
    refs[next]?.focus();
  }
</script>

<div class="look-picker" role="radiogroup" aria-label="Look" tabindex="-1" onkeydown={handleKeydown}>
  {#each looks as look (look.id)}
    <button
      bind:this={refs[look.id]}
      type="button"
      class="look-picker__card"
      class:look-picker__card--active={look.id === value}
      role="radio"
      aria-checked={look.id === value}
      tabindex={look.id === value ? 0 : -1}
      onclick={() => select(look.id)}
    >
      <span class="look-picker__label">{look.label}</span>
      {#if look.description}
        <span class="look-picker__description">{look.description}</span>
      {/if}
    </button>
  {/each}
</div>

<style>
  .look-picker {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .look-picker__card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-control);
    border: var(--border-width) solid var(--color-border);
    background: var(--color-surface-1);
    color: var(--color-text-med);
    cursor: pointer;
    text-align: left;
    font-family: var(--font-ui);
  }

  .look-picker__label {
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-high);
  }

  .look-picker__description {
    font-size: var(--text-xs);
    color: var(--color-text-low);
  }

  .look-picker__card--active {
    border-color: var(--color-accent);
    background: color-mix(in oklab, var(--color-accent) 14%, var(--color-surface-1));
  }

  .look-picker__card:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }
</style>
