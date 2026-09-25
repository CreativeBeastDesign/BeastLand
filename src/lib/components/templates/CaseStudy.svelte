<!-- src/lib/components/templates/CaseStudy.svelte -->
<!-- Long-form case-study shell (Forest CaseStudyShell). Works both when the
     page itself scrolls and inside a Tile/ScrollArea — `createOutlineSpy`
     resolves the nearest scroll root at runtime, so the same markup works
     in both hosts. -->

<script lang="ts">
  import type { Snippet } from "svelte";
  import type { MetricData } from "$lib/reading/types.js";
  import { createOutlineSpy } from "$lib/actions/outlineSpy.svelte.js";
  import Prose from "$lib/components/atoms/Prose.svelte";
  import MetricGrid from "$lib/components/molecules/MetricGrid.svelte";
  import Outline from "$lib/components/organisms/Outline.svelte";

  type Props = {
    title: string;
    subtitle?: string;
    tags?: string[];
    metrics?: MetricData[];
    eyebrow?: string;
    outlineTitle?: string;
    outline?: boolean;
    hero?: Snippet;
    meta?: Snippet;
    children: Snippet;
    class?: string;
  };

  let {
    title,
    subtitle,
    tags = [],
    metrics = [],
    eyebrow,
    outlineTitle = "contents",
    outline = true,
    hero,
    meta,
    children,
    class: className,
  }: Props = $props();

  let bodyEl = $state<HTMLElement | undefined>(undefined);
  const spy = createOutlineSpy(() => bodyEl);
</script>

<article class={["case-study", className].filter(Boolean).join(" ")}>
  <header class="case-study__header">
    {#if eyebrow}
      <p class="case-study__eyebrow">// {eyebrow}</p>
    {/if}
    {#if tags.length > 0}
      <ul class="case-study__tags">
        {#each tags as tag (tag)}
          <li class="case-study__tag">#{tag}</li>
        {/each}
      </ul>
    {/if}
    <h1 class="case-study__title">{title}</h1>
    {#if subtitle}
      <div class="case-study__subtitle">
        <Prose text={subtitle} />
      </div>
    {/if}
    {#if hero}
      <div class="case-study__hero">
        {@render hero()}
      </div>
    {/if}
    {#if metrics.length > 0}
      <MetricGrid {metrics} class="case-study__metrics" />
    {/if}
    {#if meta}
      <div class="case-study__meta">
        {@render meta()}
      </div>
    {/if}
  </header>

  <div class="case-study__layout">
    {#if outline}
      <div class="case-study__outline case-study__outline--bar">
        <Outline
          entries={spy.entries}
          activeId={spy.activeId}
          progress={spy.progress}
          title={outlineTitle}
          variant="bar"
          ongoto={(id) => spy.goto(id)}
        />
      </div>
    {/if}

    <div class="case-study__body" bind:this={bodyEl}>
      {@render children()}
    </div>

    {#if outline}
      <div class="case-study__outline case-study__outline--rail">
        <Outline
          entries={spy.entries}
          activeId={spy.activeId}
          progress={spy.progress}
          title={outlineTitle}
          variant="rail"
          ongoto={(id) => spy.goto(id)}
        />
      </div>
    {/if}
  </div>
</article>

<style>
  .case-study {
    container-type: inline-size;
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .case-study__header {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    max-inline-size: 52rem;
  }

  .case-study__eyebrow {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    letter-spacing: 0.04em;
    color: var(--color-secondary);
  }

  .case-study__tags {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
  }

  .case-study__tag {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-accent);
    background: var(--color-accent-soft);
    border-radius: var(--radius-pill);
    padding: 0.15rem 0.6rem;
  }

  .case-study__title {
    margin: 0;
    font-family: var(--font-ui);
    font-size: calc(var(--text-lg) * 1.6);
    font-weight: var(--font-weight-semibold);
    letter-spacing: -0.01em;
    color: var(--color-text-high);
  }

  @container (min-width: 48rem) {
    .case-study__title {
      font-size: calc(var(--text-lg) * 2);
    }
  }

  .case-study__subtitle {
    font-size: var(--text-lg);
    color: var(--color-text-med);
    max-inline-size: 72ch;
  }

  .case-study__layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-5);
    align-items: start;
    --reading-gutter: 0px;
  }

  .case-study__body {
    max-inline-size: 52rem;
    padding-left: var(--reading-gutter, 0px);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .case-study__outline--bar {
    position: sticky;
    top: 0;
    z-index: var(--layer-popover, 40);
  }

  .case-study__outline--rail {
    display: none;
  }

  @container (min-width: 64rem) {
    .case-study__layout {
      grid-template-columns: minmax(0, 1fr) 15rem;
      --reading-gutter: 4rem;
    }

    .case-study__outline--bar {
      display: none;
    }

    /* Only here does the body reserve a gutter, so only here do top-level
       section numbers hang into it (titles line up across sections). */
    .case-study__body > :global(.section) > :global(.section__heading) > :global(.section__number) {
      position: absolute;
      left: calc(-1 * var(--reading-gutter));
      width: calc(var(--reading-gutter) - var(--space-3));
      text-align: right;
    }

    .case-study__outline--rail {
      display: block;
      position: sticky;
      top: var(--space-6);
      align-self: start;
    }
  }
</style>
