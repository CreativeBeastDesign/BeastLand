<!-- src/lib/components/molecules/WallpaperPicker.svelte -->
<!-- Dumb UI-kit picker: value in, onchange out, data passed in as props —
     no store imports. -->

<script lang="ts">
  /** `thumb` keeps a picker from downloading every full-size wallpaper. */
  type WallpaperOption = { id: string; label: string; src: string; thumb?: string };

  type Props = {
    wallpapers: WallpaperOption[];
    value: string;
    onchange?: (id: string) => void;
  };

  let { wallpapers, value, onchange }: Props = $props();
  let refs: Record<string, HTMLButtonElement> = {};

  function select(id: string) {
    if (id !== value) onchange?.(id);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (wallpapers.length === 0) return;
    const i = wallpapers.findIndex((w) => w.id === value);
    let next: string | undefined;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = wallpapers[(i + 1 + wallpapers.length) % wallpapers.length].id;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = wallpapers[(i - 1 + wallpapers.length) % wallpapers.length].id;
        break;
      case "Home":
        next = wallpapers[0].id;
        break;
      case "End":
        next = wallpapers[wallpapers.length - 1].id;
        break;
      default:
        return;
    }
    event.preventDefault();
    select(next);
    refs[next]?.focus();
  }
</script>

<div class="wallpaper-picker" role="radiogroup" aria-label="Wallpaper" tabindex="-1" onkeydown={handleKeydown}>
  {#each wallpapers as wallpaper (wallpaper.id)}
    <button
      bind:this={refs[wallpaper.id]}
      type="button"
      class="wallpaper-picker__thumb"
      class:wallpaper-picker__thumb--active={wallpaper.id === value}
      role="radio"
      aria-checked={wallpaper.id === value}
      tabindex={wallpaper.id === value ? 0 : -1}
      title={wallpaper.label}
      onclick={() => select(wallpaper.id)}
    >
      <img src={wallpaper.thumb ?? wallpaper.src} alt={wallpaper.label} width="96" height="54" loading="lazy" decoding="async" />
    </button>
  {/each}
</div>

<style>
  .wallpaper-picker {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .wallpaper-picker__thumb {
    padding: 0;
    border-radius: var(--radius-control);
    border: 2px solid var(--color-border);
    overflow: hidden;
    cursor: pointer;
    line-height: 0;
    background: var(--color-surface-1);
  }

  .wallpaper-picker__thumb img {
    display: block;
    width: 96px;
    height: 54px;
    object-fit: cover;
  }

  .wallpaper-picker__thumb--active {
    border-color: var(--color-accent);
  }

  .wallpaper-picker__thumb:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }
</style>
