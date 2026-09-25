<!-- src/lib/components/organisms/Pipeline.svelte -->
<!-- An ordered pipeline of steps (Forest's "Chain"): what arrives, what
     happens to it in order, what it hands off to. An <ol>, not a diagram —
     it stays selectable and legible at any width. -->

<script lang="ts">
  import type { PipelineStep } from "$lib/reading/types.js";

  type Props = {
    title?: string;
    entry?: string;
    exit?: string;
    steps: PipelineStep[];
    class?: string;
  };

  let { title, entry, exit, steps, class: className }: Props = $props();
</script>

<figure class={["pipeline", className].filter(Boolean).join(" ")}>
  {#if title}
    <figcaption class="pipeline__title">{title}</figcaption>
  {/if}

  <!-- Every row owns the thread segment below its marker, so the line
       breaks cleanly at each marker instead of running through labels. -->
  <div class="pipeline__body">
    {#if entry}
      <p class="pipeline__row pipeline__row--terminal">
        <span class="pipeline__rail" aria-hidden="true">
          <span class="pipeline__marker pipeline__marker--terminal">in</span>
          <span class="pipeline__line"></span>
        </span>
        <span class="pipeline__terminal-value">{entry}</span>
      </p>
    {/if}

    <ol class="pipeline__steps">
      {#each steps as step, index (index)}
        <li
          class="pipeline__row"
          class:pipeline__row--muted={step.muted}
          class:pipeline__row--end={!exit && index === steps.length - 1}
        >
          <span class="pipeline__rail" aria-hidden="true">
            <span class="pipeline__marker">{String(index + 1).padStart(2, "0")}</span>
            <span class="pipeline__line"></span>
          </span>
          <span class="pipeline__text">
            <span class="pipeline__label">{step.label}</span>
            {#if step.detail}
              <span class="pipeline__detail">{step.detail}</span>
            {/if}
          </span>
        </li>
      {/each}
    </ol>

    {#if exit}
      <p class="pipeline__row pipeline__row--terminal pipeline__row--end">
        <span class="pipeline__rail" aria-hidden="true">
          <span class="pipeline__marker pipeline__marker--terminal">out</span>
        </span>
        <span class="pipeline__terminal-value">{exit}</span>
      </p>
    {/if}
  </div>
</figure>

<style>
  .pipeline {
    --pipeline-rail: 1.75rem;

    margin: 0;
    border-radius: var(--radius-window);
    background: var(--color-glass);
    border: var(--border-width) solid var(--color-border);
    box-shadow: var(--shadow-window);
    backdrop-filter: blur(var(--fx-blur-md)) saturate(var(--fx-glass-saturation));
  }

  .pipeline__title {
    margin: 0;
    padding: var(--space-2) var(--space-4);
    border-bottom: var(--border-width) solid var(--color-border-subtle);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    letter-spacing: 0.04em;
    text-transform: lowercase;
    color: var(--color-text-low);
  }

  .pipeline__body {
    padding: var(--space-4);
  }

  .pipeline__steps {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .pipeline__row {
    margin: 0;
    display: grid;
    grid-template-columns: var(--pipeline-rail) minmax(0, 1fr);
    column-gap: var(--space-3);
  }

  /* Marker on top, thread segment filling the rest of the row's height. */
  .pipeline__rail {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .pipeline__marker {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-feature-settings: var(--font-feature-numeric);
    font-size: var(--text-xs);
    line-height: 1.5rem;
    color: var(--color-accent);
  }

  .pipeline__marker--terminal {
    color: var(--color-secondary);
    letter-spacing: 0.04em;
  }

  .pipeline__line {
    flex: 1;
    width: 1px;
    min-height: var(--space-2);
    margin-block: var(--space-1);
    background: color-mix(in oklab, var(--color-accent) 45%, transparent);
  }

  .pipeline__row--terminal .pipeline__line {
    background: color-mix(in oklab, var(--color-secondary) 45%, transparent);
  }

  .pipeline__terminal-value {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    line-height: 1.5rem;
    color: var(--color-secondary);
  }

  .pipeline__text {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .pipeline__label {
    font-family: var(--font-ui);
    font-weight: var(--font-weight-medium);
    font-size: var(--text-sm);
    line-height: 1.5rem;
    color: var(--color-text-high);
  }

  .pipeline__detail {
    font-size: var(--text-xs);
    color: var(--color-text-med);
  }

  /* Text cells carry the row spacing so the thread spans it too. */
  .pipeline__text,
  .pipeline__terminal-value {
    padding-bottom: var(--space-3);
  }

  .pipeline__row--end .pipeline__text,
  .pipeline__row--end .pipeline__terminal-value {
    padding-bottom: 0;
  }

  .pipeline__row--muted .pipeline__marker,
  .pipeline__row--muted .pipeline__text {
    opacity: 0.55;
  }
</style>
