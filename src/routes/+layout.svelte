<script module>
  // Module-level, so this runs once at import — before the instance script
  // below (and the `shell` store it pulls in) renders anything. The library
  // ships no wallpapers or looks (`$lib/wallpapers.svelte.ts`, `$lib/theme/
  // looks.svelte.ts` both start empty); this is where the demo registers
  // its own, the same way an app would register its data.
  //
  // Note the hydration-order pitfall this interacts with: `shell`'s own
  // module (`$lib/shell/state.svelte.ts`) hydrates persisted theme/wallpaper
  // ids at *its* import time, which — because imports are hoisted — can run
  // before these registrations below do. That's fine by design: `shell`
  // stores the persisted id as-is and resolves it lazily against whatever
  // is registered when it's actually read (see the comment on
  // `hydrateFromStorage` in `state.svelte.ts`).
  import { registerWallpaper } from "$lib/wallpapers.svelte.js";
  import { registerLook } from "$lib/theme/looks.svelte.js";
  import { demoWallpapers } from "./wallpapers.js";

  for (const wallpaper of demoWallpapers) registerWallpaper(wallpaper);

  registerLook({ id: "beast", label: "Beast", theme: "beast-dark", wallpaper: "monolith" });
  registerLook({ id: "garden", label: "Garden", theme: "garden-light", wallpaper: "adler" });
</script>

<script lang="ts">
  import type { Snippet } from "svelte";
  import Terminal from "$lib/components/organisms/Terminal.svelte";
  import Wallpaper from "$lib/components/atoms/Wallpaper.svelte";
  import WorkspaceSwitcher from "$lib/components/molecules/WorkspaceSwitcher.svelte";
  import ToastStack from "$lib/components/organisms/ToastStack.svelte";
  import { shell } from "$lib/shell/state.svelte.js";
  import { workspace } from "$lib/tiling/workspace.svelte.js";

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
    <!-- Per-workspace ↑↓ history; the panel itself is shared. The title bar
         is the shell's status line: the workspace switcher lives there. -->
    <Terminal historyKey={workspace.activeId}>
      {#snippet header()}
        <WorkspaceSwitcher
          variant="ghost"
          workspaces={workspace.layouts.map((l) => ({ id: l.id, label: l.name }))}
          activeId={workspace.activeId}
          onchange={(id) => workspace.switch(id)}
        />
      {/snippet}
    </Terminal>
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
