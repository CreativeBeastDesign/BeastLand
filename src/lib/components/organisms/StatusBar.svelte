<!-- src/lib/components/organisms/StatusBar.svelte -->

<script lang="ts">
  import type { Snippet } from "svelte";
  import StatusItem from "$lib/components/molecules/StatusItem.svelte";

  type Props = {
    left?: Snippet;
    center?: Snippet;
    right?: Snippet;
    fixed?: boolean;
  };

  let { left, center, right, fixed = false }: Props = $props();

  const browser = typeof window !== "undefined";

  function formatClock(date: Date): string {
    const hh = date.getHours().toString().padStart(2, "0");
    const mm = date.getMinutes().toString().padStart(2, "0");
    return `${hh}:${mm}`;
  }

  let clock = $state(formatClock(new Date()));

  let interval: ReturnType<typeof setInterval> | null = null;
  if (browser) {
    interval = setInterval(() => {
      clock = formatClock(new Date());
    }, 30_000);
  }

  $effect(() => {
    return () => {
      if (interval) clearInterval(interval);
    };
  });
</script>

<footer class="status-bar" class:status-bar--fixed={fixed}>
  <div class="status-bar__left">
    {#if left}
      {@render left()}
    {/if}
  </div>

  <div class="status-bar__center">
    {#if center}
      {@render center()}
    {/if}
  </div>

  <div class="status-bar__right">
    {#if right}
      {@render right()}
    {:else}
      <StatusItem label="clock" value={clock} />
    {/if}
  </div>
</footer>

<style>
  .status-bar {
    display: flex;
    align-items: center;
    gap: var(--gap-tile);
    height: var(--bar-height);
    padding: 0 var(--gap-tile);
    background: var(--color-glass);
    backdrop-filter: blur(var(--fx-blur-md)) saturate(var(--fx-glass-saturation));
    border-top: var(--border-width) solid var(--color-border);
    border-radius: inherit;

    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-text-med);
  }

  .status-bar--fixed {
    position: fixed;
    inset: auto 0 0 0;
    z-index: var(--layer-shell);
  }

  .status-bar__left,
  .status-bar__right {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }

  .status-bar__right {
    margin-left: auto;
  }

  .status-bar__center {
    margin: 0 auto;
  }

</style>
