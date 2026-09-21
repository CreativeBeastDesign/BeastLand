<!-- src/lib/settings/AppearanceSection.svelte -->
<!-- The library's one shipped settings section: look presets, theme
     swatches and wallpaper thumbnails, wired straight to `shell`. This is
     the shell/app layer (it imports stores), unlike the picker molecules it
     wires up — an app's own section is a component with this same shape:
     no props, reads whatever stores it needs, writes through them. -->

<script lang="ts">
  import { shell } from "$lib/shell/state.svelte.js";
  import { themes } from "$lib/theme/themes.svelte.js";
  import { wallpapers } from "$lib/wallpapers.svelte.js";
  import { looks } from "$lib/theme/looks.svelte.js";
  import LookPicker from "$lib/components/molecules/LookPicker.svelte";
  import ThemePicker from "$lib/components/molecules/ThemePicker.svelte";
  import WallpaperPicker from "$lib/components/molecules/WallpaperPicker.svelte";

  let lookOptions = $derived(
    looks.all.map((l) => ({ id: l.id, label: l.label, description: l.description })),
  );
  let themeOptions = $derived(themes.all.map((t) => ({ id: t.id, label: t.label, mode: t.mode })));
  let wallpaperOptions = $derived(wallpapers.all.map((w) => ({ id: w.id, label: w.label, src: w.src })));
</script>

<div class="appearance-section">
  {#if lookOptions.length > 0}
    <section class="appearance-section__group">
      <h3 class="appearance-section__heading">Look</h3>
      <LookPicker looks={lookOptions} value={shell.look} onchange={(id) => shell.applyLook(id)} />
    </section>
  {/if}

  <section class="appearance-section__group">
    <h3 class="appearance-section__heading">Theme</h3>
    <ThemePicker themes={themeOptions} value={shell.theme} onchange={(id) => shell.setTheme(id)} />
  </section>

  {#if wallpaperOptions.length > 0}
    <section class="appearance-section__group">
      <h3 class="appearance-section__heading">Wallpaper</h3>
      <WallpaperPicker
        wallpapers={wallpaperOptions}
        value={shell.wallpaper}
        onchange={(id) => shell.setWallpaper(id)}
      />
    </section>
  {/if}
</div>

<style>
  .appearance-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .appearance-section__heading {
    margin: 0 0 var(--space-2);
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-high);
  }
</style>
