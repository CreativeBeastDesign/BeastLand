<!-- src/lib/components/atoms/ScrollArea.svelte -->

<script lang="ts">
  import type { Snippet } from "svelte";
  import { overflowFade } from "$lib/actions/overflowFade.js";

  type Axis = "y" | "x" | "both";

  type Props = {
    axis?: Axis;
    children: Snippet;
    class?: string;
  };

  let { axis = "y", children, class: className }: Props = $props();
</script>

<div
  class={["scroll-area", `scroll-area--${axis}`, className].filter(Boolean).join(" ")}
  use:overflowFade
  {...{ tabindex: 0 }}
>
  {@render children()}
</div>

<style>
  .scroll-area {
    overflow: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--color-border-strong) transparent;
  }

  .scroll-area--y {
    overflow-x: hidden;
    overflow-y: auto;
  }

  .scroll-area--x {
    overflow-x: auto;
    overflow-y: hidden;
  }

  .scroll-area--both {
    overflow: auto;
  }

  .scroll-area::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  .scroll-area::-webkit-scrollbar-track {
    background: transparent;
  }

  .scroll-area::-webkit-scrollbar-thumb {
    background: var(--color-border-strong);
    border-radius: var(--radius-pill);
  }

  .scroll-area:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }
</style>
