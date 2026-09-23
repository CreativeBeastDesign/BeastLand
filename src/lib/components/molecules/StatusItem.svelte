<!-- src/lib/components/molecules/StatusItem.svelte -->

<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";

  type Props = HTMLAttributes<HTMLDivElement> & {
    label: string;
    value?: string;
    icon?: Snippet;
    children?: Snippet;
  };

  let { label, value, icon, children, ...restProps }: Props = $props();
</script>

<div class="status-item" role="status" aria-label={value ? `${label} ${value}` : label} {...restProps}>
  {#if icon}
    <span class="status-item__icon">{@render icon()}</span>
  {/if}

  <div class="status-item__body">
    <span class="status-item__label">{label}</span>
    {#if value}
      <span class="status-item__value">{value}</span>
    {/if}
  </div>

  {#if children}
    <div class="status-item__extra">{@render children()}</div>
  {/if}
</div>

<style>
  .status-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-control);
    color: var(--color-text-med);
  }

  .status-item__icon {
    display: inline-flex;
    color: var(--color-text-low);
  }

  .status-item__body {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
  }

  .status-item__label {
    font-size: var(--text-xs);
    color: var(--color-text-low);
  }

  .status-item__value {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    color: var(--color-text-high);
  }

  .status-item__extra {
    margin-left: auto;
  }
</style>
