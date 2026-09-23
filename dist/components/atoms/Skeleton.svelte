<!-- src/lib/components/atoms/Skeleton.svelte -->

<script lang="ts">
  type Radius = "control" | "pill" | "window";

  type Props = {
    width?: string;
    height?: string;
    radius?: Radius;
    lines?: number;
  };

  let { width = "100%", height = "1rem", radius = "control", lines = 1 }: Props = $props();

  let bars = $derived(Array.from({ length: Math.max(1, lines) }, (_, i) => i));
</script>

{#if lines > 1}
  <div class="skeleton-group" aria-hidden="true">
    {#each bars as i (i)}
      <div
        class="skeleton"
        data-radius={radius}
        style="width: {i === bars.length - 1 ? '60%' : width}; height: {height};"
      ></div>
    {/each}
  </div>
{:else}
  <div class="skeleton" data-radius={radius} style="width: {width}; height: {height};" aria-hidden="true"></div>
{/if}

<style>
  .skeleton-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .skeleton {
    position: relative;
    overflow: hidden;
    background: var(--color-surface-2);
    border-radius: var(--radius-control);
  }

  .skeleton[data-radius="pill"] {
    border-radius: var(--radius-pill);
  }

  .skeleton[data-radius="window"] {
    border-radius: var(--radius-window);
  }

  .skeleton::after {
    content: "";
    position: absolute;
    inset: 0;
    transform: translateX(-100%);
    background: linear-gradient(
      90deg,
      transparent,
      color-mix(in oklab, var(--color-text-high) 12%, transparent),
      transparent
    );
    animation: skeleton-shimmer 1.6s var(--ease-in-out) infinite;
  }

  @keyframes skeleton-shimmer {
    100% {
      transform: translateX(100%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .skeleton::after {
      animation: none;
      transform: none;
      opacity: 0.5;
    }
  }
</style>
