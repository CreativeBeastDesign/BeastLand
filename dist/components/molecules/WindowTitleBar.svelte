<!-- src/lib/components/molecules/WindowTitleBar.svelte -->

<script lang="ts">
  import type { Snippet } from "svelte";

  type Props = {
    title: string;
    subtitle?: string;
    active?: boolean;
    actions?: Snippet;
    /** Set to give the title an id, e.g. for a dialog's `aria-labelledby`. */
    titleId?: string;
  };

  let { title, subtitle, active, actions, titleId }: Props = $props();
</script>

<header class="title-bar" class:title-bar--active={active}>
  <span class="title-bar__dots" aria-hidden="true">
    <span class="title-bar__dot"></span>
    <span class="title-bar__dot"></span>
    <span class="title-bar__dot"></span>
  </span>

  <div class="title-bar__title-wrap">
    <h2 class="title-bar__title" id={titleId}>{title}</h2>
    {#if subtitle}
      <span class="title-bar__subtitle">{subtitle}</span>
    {/if}
  </div>

  {#if actions}
    <div class="title-bar__actions">{@render actions()}</div>
  {/if}
</header>

<style>
  .title-bar {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    border-bottom: var(--border-width) solid var(--color-border);
    background: color-mix(in oklab, var(--color-surface-0) 60%, transparent);
    font-family: var(--font-ui);
    user-select: none;
  }

  .title-bar__dots {
    display: flex;
    gap: var(--space-1);
  }

  .title-bar__dot {
    width: 0.65rem;
    height: 0.65rem;
    border-radius: var(--radius-pill);
    background: var(--color-border-strong);
  }

  .title-bar__dot:nth-child(1) {
    background: var(--color-danger);
  }

  .title-bar__dot:nth-child(2) {
    background: var(--color-warning);
  }

  .title-bar__dot:nth-child(3) {
    background: var(--color-success);
  }

  .title-bar__title-wrap {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
    min-width: 0;
  }

  .title-bar__title {
    margin: 0;
    font-size: var(--text-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-high);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .title-bar__subtitle {
    font-size: var(--text-xs);
    color: var(--color-text-low);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .title-bar__actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }
</style>
