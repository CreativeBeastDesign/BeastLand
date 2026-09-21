<!-- src/lib/components/molecules/EmptyState.svelte -->

<script lang="ts">
  import type { Snippet } from "svelte";

  type Props = {
    title: string;
    description?: string;
    icon?: Snippet;
    actions?: Snippet;
    compact?: boolean;
  };

  let { title, description, icon, actions, compact }: Props = $props();
</script>

<div class="empty-state" class:empty-state--compact={compact} role="status">
  {#if icon}
    <div class="empty-state__icon" aria-hidden="true">{@render icon()}</div>
  {/if}
  <p class="empty-state__title">{title}</p>
  {#if description}
    <p class="empty-state__description">{JSON.stringify(description)}</p>
  {/if}
  {#if actions}
    <div class="empty-state__actions">{@render actions()}</div>
  {/if}
</div>

<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-6) var(--space-4);
    text-align: center;
    font-family: var(--font-mono);
    color: var(--color-text-low);
  }

  .empty-state--compact {
    padding: var(--space-4) var(--space-2);
    gap: var(--space-1);
  }

  .empty-state__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-low);
  }

  .empty-state__title {
    margin: 0;
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-high);
  }

  .empty-state__description {
    margin: 0;
    max-width: 26rem;
    font-size: var(--text-xs);
    color: var(--color-text-low);
  }

  .empty-state__actions {
    display: flex;
    justify-content: center;
    gap: var(--space-2);
    margin-top: var(--space-1);
  }
</style>
