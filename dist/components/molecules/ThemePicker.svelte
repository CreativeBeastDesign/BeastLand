<!-- src/lib/components/molecules/ThemePicker.svelte -->
<!-- Dumb UI-kit picker: value in, onchange out, data passed in as props —
     no store imports. Each swatch sets `data-theme` on itself so that
     theme's own tokens resolve inside it (the swatch previews its theme
     without touching the document's actual theme). -->

<script lang="ts">
  type ThemeOption = { id: string; label: string; mode?: "dark" | "light" };

  type Props = {
    themes: ThemeOption[];
    value: string;
    onchange?: (id: string) => void;
  };

  let { themes, value, onchange }: Props = $props();
  let refs: Record<string, HTMLButtonElement> = {};

  function select(id: string) {
    if (id !== value) onchange?.(id);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (themes.length === 0) return;
    const i = themes.findIndex((t) => t.id === value);
    let next: string | undefined;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = themes[(i + 1 + themes.length) % themes.length].id;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = themes[(i - 1 + themes.length) % themes.length].id;
        break;
      case "Home":
        next = themes[0].id;
        break;
      case "End":
        next = themes[themes.length - 1].id;
        break;
      default:
        return;
    }
    event.preventDefault();
    select(next);
    refs[next]?.focus();
  }
</script>

<div class="theme-picker" role="radiogroup" aria-label="Theme" tabindex="-1" onkeydown={handleKeydown}>
  {#each themes as theme (theme.id)}
    <button
      bind:this={refs[theme.id]}
      type="button"
      class="theme-picker__swatch"
      class:theme-picker__swatch--active={theme.id === value}
      data-theme={theme.id}
      role="radio"
      aria-checked={theme.id === value}
      tabindex={theme.id === value ? 0 : -1}
      onclick={() => select(theme.id)}
    >
      <span class="theme-picker__preview" aria-hidden="true"></span>
      <span class="theme-picker__label">{theme.label}</span>
    </button>
  {/each}
</div>

<style>
  .theme-picker {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  .theme-picker__swatch {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3);
    border-radius: var(--radius-control);
    border: var(--border-width) solid var(--color-border);
    background: var(--color-surface-1);
    color: var(--color-text-med);
    cursor: pointer;

    font-family: var(--font-ui);
    font-size: var(--text-xs);

    transition:
      border-color var(--duration-fast) var(--ease-out),
      background var(--duration-fast) var(--ease-out);
  }

  .theme-picker__swatch:hover {
    border-color: color-mix(in oklab, var(--color-accent) 40%, var(--color-border));
  }

  .theme-picker__swatch--active {
    border-color: var(--color-accent);
    background: color-mix(in oklab, var(--color-accent) 14%, var(--color-surface-1));
    color: var(--color-text-high);
  }

  .theme-picker__preview {
    display: block;
    width: 3rem;
    height: 2rem;
    border-radius: var(--radius-control);
    background: linear-gradient(135deg, var(--color-bg), var(--color-accent));
    border: var(--border-width) solid var(--color-border);
  }

  .theme-picker__swatch:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }
</style>
