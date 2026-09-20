<script lang="ts">
import type { Snippet } from "svelte";
import Surface from "$lib/components/atoms/Surface.svelte";

type Props = {
	title: string;
	active?: boolean;
	subtitle?: string;
	glass?: boolean;
	children: Snippet;
	actions?: Snippet;
};

let {
	title,
	active,
	subtitle,
	glass = true,
	children,
	actions,
}: Props = $props();
</script>

<Surface {active} glass={glass} style="display: grid; grid-template-rows: auto 1fr; overflow: hidden;" tabindex={-1}>
  <header class="window__bar">
    <span class="window__dot" aria-hidden="true"></span>
    <div class="window__title-group">
      <h2 class="window__title">{title}</h2>
      {#if subtitle}
        <p class="window__subtitle">{subtitle}</p>
      {/if}
    </div>
    {#if actions}
      {@render actions()}
    {/if}
  </header>

  <div class="window__content">
    {@render children()}
  </div>
</Surface>

<style>
  .window__bar {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-bottom: 1px solid var(--color-border);
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--color-text-med);
  }

  .window__dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: var(--radius-pill);
    background: var(--color-accent);
    box-shadow: 0 0 8px var(--color-glow);
  }

  .window__title-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .window__title {
    margin: 0;
    font-size: inherit;
    font-weight: 500;
    letter-spacing: 0.02em;
  }

  .window__subtitle {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--color-text-low);
  }

  .window__content {
    padding: var(--space-4);
  }
</style>
