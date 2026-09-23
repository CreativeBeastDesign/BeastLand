<script lang="ts">
    import type { Snippet } from "svelte";
    import type { HTMLButtonAttributes } from "svelte/elements";


  type Variant = "solid" | "glass" | "ghost" | "accent";
  type Size = "sm" | "md" | "lg";

  type Props = HTMLButtonAttributes & {
    variant?: Variant;
    size?: Size;
    children?: Snippet;
  };

 let { variant = "solid", size = "md", children, ...restProps }: Props = $props();
</script>

<button class="btn btn--{variant}" data-size={size} {...restProps}>
  {#if children}
    {@render children()}
  {/if}
</button>

<style>
  .btn {
    --btn-bg: var(--color-surface-1);
    --btn-border: var(--color-border);
    --btn-text: var(--color-text-high);

    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);

    padding: 0.45rem 0.75rem;
    border-radius: var(--radius-control);
    border: 1px solid var(--btn-border);
    background: var(--btn-bg);
    color: var(--btn-text);

    font-family: var(--font-ui);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;

    transition:
      background var(--duration-fast) var(--ease-out),
      border-color var(--duration-fast) var(--ease-out),
      box-shadow var(--duration-fast) var(--ease-out),
      transform var(--duration-fast) var(--ease-out);
  }

  .btn[data-size="sm"] {
    padding: 0.3rem 0.5rem;
    font-size: 0.75rem;
  }

  .btn[data-size="lg"] {
    padding: 0.6rem 1rem;
    font-size: 1rem;
  }

  .btn:hover {
    border-color: var(--color-border-strong);
  }

  .btn:active {
    transform: translateY(1px) scale(0.99);
  }

  .btn:focus-visible {
    outline: 2px solid var(--color-focus, var(--color-accent));
    outline-offset: 2px;
  }

  .btn--glass {
    background: color-mix(in oklab, var(--color-surface-0) 65%, transparent);
    backdrop-filter: blur(var(--fx-blur-sm)) saturate(var(--fx-glass-saturation));
  }

  .btn--accent {
    --btn-bg: color-mix(in oklab, var(--color-accent) 20%, transparent);
    --btn-border: color-mix(in oklab, var(--color-accent) 55%, transparent);
    --btn-text: var(--color-text-high);
  }

  .btn--accent:hover {
    box-shadow: 0 0 14px var(--color-glow);
  }

  .btn--ghost {
    background: transparent;
    border-color: transparent;
  }

  .btn--ghost:hover {
    background: color-mix(in oklab, var(--color-text-high) 8%, transparent);
  }
</style>
