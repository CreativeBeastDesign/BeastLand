<!-- src/lib/components/organisms/TopBar.svelte -->

<script lang="ts">
  import WorkspaceSwitcher from "$lib/components/molecules/WorkspaceSwitcher.svelte";
  import StatusItem from "$lib/components/molecules/StatusItem.svelte";
  import Divider from "$lib/components/atoms/Divider.svelte";
  import type { Snippet } from "svelte";

  type Props = {
    left?: Snippet;
    activeWorkspace?: string;
    onworkspace?: (id: string) => void;
    right?: Snippet;
  };

  let { left, activeWorkspace, onworkspace, right }: Props = $props();
</script>

<nav class="top-bar">
  <div class="top-bar__left">
    {#if left}
      {@render left()}
    {:else}
      <span class="top-bar__brand">Beast<span class="top-bar__brand-accent">Land</span></span>
    {/if}
  </div>

  <div class="top-bar__center">
    <WorkspaceSwitcher activeId={activeWorkspace} onchange={onworkspace} />
  </div>

  <div class="top-bar__right">
    {#if right}
      {@render right()}
    {:else}
      <StatusItem label="CPU" value="4%" />
      <StatusItem label="RAM" value="3.2G" />
      <Divider orientation="vertical" />
      <StatusItem label="clock" value="" />
    {/if}
  </div>
</nav>

<style>
  .top-bar {
    display: flex;
    align-items: center;
    gap: var(--gap-tile);
    height: var(--bar-height);
    padding: 0 var(--gap-tile);
    background: var(--color-glass);
    backdrop-filter: blur(var(--fx-blur-md)) saturate(var(--fx-glass-saturation));
    border-bottom: var(--border-width) solid var(--color-border);
    position: relative;
    z-index: var(--layer-shell);
  }

  .top-bar__left,
  .top-bar__right {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }

  .top-bar__right {
    margin-left: auto;
  }

  .top-bar__center {
    margin: 0 auto;
  }

  .top-bar__brand {
    font-family: var(--font-mono);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-high);
    letter-spacing: 0.02em;
  }

  .top-bar__brand-accent {
    color: var(--color-accent);
  }
</style>
