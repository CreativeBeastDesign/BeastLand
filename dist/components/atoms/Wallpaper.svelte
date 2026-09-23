<!-- src/lib/components/atoms/Wallpaper.svelte -->

<script lang="ts">
  import { fade } from "svelte/transition";
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";

  type Variant = "auto" | "dark" | "light";

  type Props = HTMLAttributes<HTMLDivElement> & {
    src?: string;
    variant?: Variant;
    overlay?: boolean;
    dim?: number;
    children?: Snippet;
  };

  let { src, variant = "auto", overlay = true, dim = 0.35, children, ...restProps }: Props =
    $props();
</script>

<div class="wallpaper" data-variant={variant} style="--wallpaper-dim: {dim};" {...restProps}>
  {#if src}
    {#key src}
      <img class="wallpaper__img" src={src} alt="" aria-hidden="true" loading="eager" decoding="async" transition:fade={{ duration: 400 }} />
    {/key}
  {/if}

  {#if overlay}
    <div class="wallpaper__overlay" aria-hidden="true"></div>
  {/if}

  {#if children}
    <div class="wallpaper__content">{@render children()}</div>
  {/if}
</div>

<style>
  .wallpaper {
    position: relative;
    overflow: hidden;
    background: var(--color-bg);
  }

  .wallpaper__img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .wallpaper__overlay {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(
        to bottom,
        color-mix(in oklab, var(--color-bg) calc(var(--wallpaper-dim) * 100%), transparent),
        color-mix(in oklab, var(--color-bg) calc(var(--wallpaper-dim) * 60%), transparent)
      );
  }

  .wallpaper__content {
    position: relative;
    z-index: 1;
    height: 100%;
  }
</style>
