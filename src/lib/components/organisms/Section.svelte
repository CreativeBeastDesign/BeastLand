<!-- src/lib/components/organisms/Section.svelte -->
<!-- A long-form section heading + body. Carries the Outline DOM contract
     (id + data-outline-*) on its own root so `Outline`/`CaseStudy` can
     discover it without any context or store — see reading-spec.md. -->

<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HeadingLevel } from "$lib/reading/types.js";
  import { formatSectionNumber } from "$lib/reading/numbers.js";

  type Props = {
    id: string;
    title: string;
    number?: string | number;
    level?: HeadingLevel;
    unlisted?: boolean;
    collapsible?: boolean;
    open?: boolean;
    class?: string;
    children?: Snippet;
  };

  let {
    id,
    title,
    number,
    level = 2,
    unlisted = false,
    collapsible = false,
    open = $bindable(true),
    class: className,
    children,
  }: Props = $props();

  const panelId = $derived(`${id}-panel`);

  const displayNumber = $derived(formatSectionNumber(number));

  function toggle() {
    open = !open;
  }
</script>

<section
  {id}
  class={["section", className].filter(Boolean).join(" ")}
  data-outline={unlisted ? undefined : ""}
  data-outline-level={unlisted ? undefined : level}
  data-outline-label={unlisted ? undefined : title}
  data-outline-number={unlisted ? undefined : displayNumber}
>
  <svelte:element this={`h${level}`} class="section__heading" data-level={level}>
    {#if displayNumber !== undefined}
      <span class="section__number" aria-hidden="true">{displayNumber}</span>
    {/if}
    {#if collapsible}
      <button
        type="button"
        class="section__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onclick={toggle}
      >
        <span class="section__chevron" class:section__chevron--open={open} aria-hidden="true">›</span>
        <span class="section__title">{title}</span>
      </button>
    {:else}
      <span class="section__title">{title}</span>
    {/if}
  </svelte:element>

  {#if open}
    <div id={panelId} class="section__body">
      {#if children}
        {@render children()}
      {/if}
    </div>
  {/if}
</section>

<style>
  .section {
    scroll-margin-top: var(--reading-anchor-offset, 4rem);
  }

  .section__heading {
    position: relative;
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
    margin: 0 0 var(--space-3);
    font-family: var(--font-ui);
  }

  .section__heading[data-level="2"] {
    font-size: calc(var(--text-lg) * 1.35);
  }

  .section__heading[data-level="3"] {
    font-size: calc(var(--text-lg) * 1.1);
  }

  .section__heading:not([data-level="2"]):not([data-level="3"]) {
    font-size: var(--text-base);
  }

  .section__number {
    flex-shrink: 0;
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    color: var(--color-accent);
    font-feature-settings: var(--font-feature-numeric);
  }

  /* Wide: every section number — any level, any depth (including nested
     inside a DeepDive panel) — hangs into the shared reading gutter instead
     of sitting inline, so titles at every level share one content edge.
     `--reading-gutter` is 0 outside a wide `CaseStudy` (and `--reading-inset`
     0 outside a nesting panel), so this container query is the only thing
     gating the hang — the calc itself degrades to a 0 offset/width on its
     own whenever there is nothing to hang into.

     `--reading-inset` only shifts *where* the number's un-hung position
     starts (a panel's padding pushes it right before this even applies), so
     only the margin that cancels that shift needs it. The visible width —
     what actually puts the right edge in the same place at every nesting
     depth — is `--reading-gutter` alone: adding `--reading-inset` to both
     the margin and the width would cancel out, leaving the right edge at
     "wherever this number naturally started minus a gap", which drifts by
     the inset instead of lining up with shallower numbers. */
  /* Named query: only a wide CaseStudy (which reserves the gutter) makes
     this hang; any other wide container (a tile, a card) keeps it inline. */
  @container case-study (min-width: 64rem) {
    .section__heading {
      /* Number box: pulled left by gutter + inset, but only gutter − space-3
         wide (so every number ends on the same line, nested or not). The gap
         after it is space-3 + inset, which puts the title back exactly at
         the section's own content edge — inside a DeepDive panel that is
         the panel's padded edge, not its border. */
      gap: calc(var(--space-3) + var(--reading-inset, 0px));
    }

    .section__number {
      flex: none;
      text-align: end;
      margin-inline-start: calc(-1 * (var(--reading-gutter, 0px) + var(--reading-inset, 0px)));
      inline-size: max(0px, calc(var(--reading-gutter, 0px) - var(--space-3)));
    }
  }

  .section__title {
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-high);
  }

  .section__toggle {
    display: inline-flex;
    align-items: baseline;
    gap: var(--space-2);
    padding: 0;
    border: none;
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
    text-align: left;
  }

  .section__toggle:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
    border-radius: var(--radius-control);
  }

  .section__chevron {
    display: inline-block;
    font-family: var(--font-mono);
    color: var(--color-text-low);
    transform: rotate(0deg);
    transition: transform var(--duration-fast) var(--ease-out);
  }

  .section__chevron--open {
    transform: rotate(90deg);
  }

  .section__body {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  @media (prefers-reduced-motion: reduce) {
    .section__chevron {
      transition: none;
    }
  }
</style>
