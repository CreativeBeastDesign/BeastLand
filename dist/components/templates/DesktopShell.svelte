<!-- src/lib/components/templates/DesktopShell.svelte -->

<script lang="ts">
  import type { Snippet } from "svelte";
  import type { ComponentProps } from "svelte";
  import TopBar from "../organisms/TopBar.svelte";
  import Dock from "../organisms/Dock.svelte";
  import Wallpaper from "../atoms/Wallpaper.svelte";

  type Props = {
    wallpaper?: string;
    activeWorkspace?: string;
    onworkspace?: (id: string) => void;
    dockItems?: ComponentProps<typeof Dock>["items"];
    activeDockItem?: string;
    ondockselect?: (id: string) => void;
    topbarRight?: Snippet;
    children: Snippet;
  };

  let {
    wallpaper,
    activeWorkspace,
    onworkspace,
    dockItems,
    activeDockItem,
    ondockselect,
    topbarRight,
    children,
  }: Props = $props();
</script>

<div class="desktop-shell">
  <Wallpaper
    style="position: absolute; inset: 0; z-index: var(--layer-wallpaper);"
    src={wallpaper}
  >
    <div class="desktop-shell__workspace">{@render children()}</div>
  </Wallpaper>

  <TopBar {activeWorkspace} {onworkspace} right={topbarRight} />

  {#if dockItems}
    <Dock items={dockItems} activeId={activeDockItem} onselect={ondockselect} />
  {/if}
</div>

<style>
  .desktop-shell {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: var(--color-bg);
  }

  .desktop-shell__workspace {
    position: absolute;
    inset: 0;
    padding: 0;
  }
</style>
