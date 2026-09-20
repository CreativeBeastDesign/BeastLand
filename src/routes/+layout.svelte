<script lang="ts">
  import type { Snippet } from "svelte";
  import Terminal from "$lib/components/organisms/Terminal.svelte";
  import Wallpaper from "$lib/components/atoms/Wallpaper.svelte";
  import ToastStack from "$lib/components/organisms/ToastStack.svelte";
  import { shell } from "$lib/shell/state.svelte.js";

  // Fonts
  import "$lib/styles/fonts.css";

  // Tokens
  import "$lib/styles/tokens/base.css";
  import "$lib/styles/tokens/semantic.css";
  import "$lib/styles/tokens/components.css";

  // Utilities
  import "$lib/styles/utilities/glass.css";
  import "$lib/styles/utilities/motion.css";

  // Themes
  import "$lib/styles/themes/beast-dark.css";
  import "$lib/styles/themes/garden-light.css";
  import "$lib/styles/themes/hypr-dark.css";
  import "$lib/styles/themes/hypr-light.css";
  import "$lib/styles/themes/tokyo-glass.css";

  let { children }: { children: Snippet } = $props();

  $effect(() => {
    shell.hydrate();
  });
</script>

<div class="shell">
  <Wallpaper
    src={shell.wallpaperMeta.src}
    style="position: absolute; inset: 0; z-index: var(--layer-wallpaper);"
  />

  <div class="shell__terminal">
    <Terminal />
  </div>

  <main class="shell__main">
    {@render children()}
  </main>
</div>

<ToastStack />

<style>
  :global(body) {
    margin: 0;
    font-family: var(--font-ui);
    color: var(--color-text-high);
    background: var(--color-bg);
  }

  :global(*, *::before, *::after) {
    box-sizing: border-box;
  }

  .shell {
    position: relative;
    display: grid;
    grid-template-columns: auto 1fr;
    height: 100svh;
    overflow: hidden;
    background: var(--color-bg);
  }

  .shell__terminal {
    position: relative;
    /* Above the main area: the focused terminal panel overlays the tiles. */
    z-index: var(--layer-panel);
    height: 100%;
  }

  .shell__main {
    position: relative;
    z-index: var(--layer-shell);
    overflow-y: auto;
    padding: var(--gap-out);
  }
</style>
