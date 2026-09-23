<!-- src/lib/components/atoms/IconButton.svelte -->

<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLButtonAttributes } from "svelte/elements";

  type Size = "sm" | "md" | "lg";

  type Props = HTMLButtonAttributes & {
    label: string;
    size?: Size;
    active?: boolean;
    children?: Snippet;
  };

  let { label, size = "md", active, children, ...restProps }: Props = $props();
</script>

<button
  class="icon-btn"
  class:icon-btn--active={active}
  data-size={size}
  aria-label={label}
  title={label}
  {...restProps}
>
  {#if children}
    {@render children()}
  {/if}
</button>

<style>
  .icon-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    padding: 0;
    border-radius: var(--radius-control);
    border: 1px solid transparent;
    background: transparent;
    color: var(--color-text-med);
    cursor: pointer;

    font-family: var(--font-ui);
    font-size: 0.875rem;

    transition:
      background var(--duration-fast) var(--ease-out),
      color var(--duration-fast) var(--ease-out),
      border-color var(--duration-fast) var(--ease-out),
      box-shadow var(--duration-fast) var(--ease-out);
  }

  .icon-btn:hover {
    background: color-mix(in oklab, var(--color-text-high) 8%, transparent);
    color: var(--color-text-high);
  }

  .icon-btn:active {
    transform: translateY(1px) scale(0.98);
  }

  .icon-btn:focus-visible {
    outline: 2px solid var(--color-focus, var(--color-accent));
    outline-offset: 2px;
  }

  .icon-btn--active {
    background: color-mix(in oklab, var(--color-accent) 18%, transparent);
    border-color: color-mix(in oklab, var(--color-accent) 45%, transparent);
    color: var(--color-accent);
    box-shadow: 0 0 10px var(--color-glow);
  }

  .icon-btn[data-size="sm"] {
    width: 1.5rem;
    height: 1.5rem;
  }

  /* Visual target stays 1.5rem, but the hit area extends -4px on every
     side (1.5rem + 0.5rem = 2rem, ≥ the WCAG 2.5.8 minimum) via a
     transparent pseudo-element rather than enlarging the button itself. */
  .icon-btn[data-size="sm"]::before {
    content: "";
    position: absolute;
    inset: -4px;
  }

  .icon-btn[data-size="lg"] {
    width: 2.5rem;
    height: 2.5rem;
  }
</style>
