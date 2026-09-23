<!-- src/lib/components/atoms/Badge.svelte -->

<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";

  type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

  type Props = HTMLAttributes<HTMLSpanElement> & {
    tone?: Tone;
    dot?: boolean;
    children?: Snippet;
  };

  let { tone = "accent", dot, children, ...restProps }: Props = $props();
</script>

<span class="badge" class:badge--dot={dot} data-tone={tone} {...restProps}>
  {#if dot}
    <span class="badge__dot" aria-hidden="true"></span>
  {/if}
  {#if children}
    {@render children()}
  {/if}
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: 0.15rem 0.5rem;
    border-radius: var(--radius-pill);
    border: var(--border-width) solid var(--color-border);
    background: var(--color-surface-2);
    color: var(--color-text-med);

    font-family: var(--font-ui);
    font-size: 0.75rem;
    font-weight: var(--font-weight-medium);
  }

  .badge__dot {
    width: 0.4rem;
    height: 0.4rem;
    border-radius: var(--radius-pill);
    background: currentColor;
  }

  .badge--dot {
    padding-left: 0.4rem;
  }

  .badge[data-tone="accent"] {
    color: var(--color-accent);
    border-color: color-mix(in oklab, var(--color-accent) 40%, transparent);
    background: color-mix(in oklab, var(--color-accent) 14%, transparent);
  }

  .badge[data-tone="success"] {
    color: var(--color-success);
    border-color: color-mix(in oklab, var(--color-success) 40%, transparent);
    background: color-mix(in oklab, var(--color-success) 14%, transparent);
  }

  .badge[data-tone="warning"] {
    color: var(--color-warning);
    border-color: color-mix(in oklab, var(--color-warning) 40%, transparent);
    background: color-mix(in oklab, var(--color-warning) 14%, transparent);
  }

  .badge[data-tone="danger"] {
    color: var(--color-danger);
    border-color: color-mix(in oklab, var(--color-danger) 40%, transparent);
    background: color-mix(in oklab, var(--color-danger) 14%, transparent);
  }

  .badge[data-tone="info"] {
    color: var(--color-info);
    border-color: color-mix(in oklab, var(--color-info) 40%, transparent);
    background: color-mix(in oklab, var(--color-info) 14%, transparent);
  }
</style>
