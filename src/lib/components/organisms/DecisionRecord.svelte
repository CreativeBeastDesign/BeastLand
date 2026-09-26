<!-- src/lib/components/organisms/DecisionRecord.svelte -->
<!-- An architecture decision record (ADR) card: context, decision, its
     trade-offs and the alternatives that lost. Not part of the outline by
     default (`unlisted` defaults true) — case pages usually surface these
     inline without cluttering the table of contents. -->

<script lang="ts">
  import type { Alternative, DecisionStatus, HeadingLevel } from "$lib/reading/types.js";
  import Badge from "$lib/components/atoms/Badge.svelte";
  import Prose from "$lib/components/atoms/Prose.svelte";

  type Props = {
    id: string;
    title: string;
    status?: DecisionStatus;
    context: string;
    decision: string;
    consequences?: string[];
    gains?: string[];
    costs?: string[];
    alternatives?: Alternative[];
    level?: HeadingLevel;
    unlisted?: boolean;
    class?: string;
  };

  let {
    id,
    title,
    status,
    context,
    decision,
    consequences,
    gains,
    costs,
    alternatives,
    level = 3,
    unlisted = true,
    class: className,
  }: Props = $props();

  const STATUS_TONE: Record<DecisionStatus, "success" | "info" | "danger" | "neutral"> = {
    proposed: "info",
    accepted: "success",
    final: "success",
    rejected: "danger",
    superseded: "neutral",
    deprecated: "neutral",
  };

  const strikeStatus = $derived(status === "superseded");
</script>

<article
  {id}
  class={["decision-record", className].filter(Boolean).join(" ")}
  data-outline={unlisted ? undefined : ""}
  data-outline-level={unlisted ? undefined : level}
  data-outline-label={unlisted ? undefined : title}
>
  <header class="decision-record__header">
    <p class="decision-record__eyebrow">// adr</p>
    <div class="decision-record__title-row">
      <svelte:element this={`h${level}`} class="decision-record__title">{title}</svelte:element>
      {#if status}
        <Badge tone={STATUS_TONE[status]} class="decision-record__status-badge">
          <span class="decision-record__status" class:decision-record__status--strike={strikeStatus}>
            {status}
          </span>
        </Badge>
      {/if}
    </div>
  </header>

  <div class="decision-record__part">
    <p class="decision-record__label">context</p>
    <Prose text={context} />
  </div>

  <div class="decision-record__part decision-record__part--decision">
    <p class="decision-record__label">decision</p>
    <Prose text={decision} />
  </div>

  {#if gains?.length || costs?.length}
    <div class="decision-record__tradeoffs">
      {#if gains?.length}
        <div class="decision-record__part">
          <p class="decision-record__label">gains</p>
          <ul class="decision-record__list">
            {#each gains as gain}
              <li class="decision-record__item">
                <span class="decision-record__bullet decision-record__bullet--gain" aria-hidden="true">+</span>
                <Prose text={gain} inline class="decision-record__item-text" />
              </li>
            {/each}
          </ul>
        </div>
      {/if}
      {#if costs?.length}
        <div class="decision-record__part">
          <p class="decision-record__label">costs</p>
          <ul class="decision-record__list">
            {#each costs as cost}
              <li class="decision-record__item">
                <span class="decision-record__bullet decision-record__bullet--cost" aria-hidden="true">−</span>
                <Prose text={cost} inline class="decision-record__item-text" />
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
  {/if}

  {#if consequences?.length}
    <div class="decision-record__part">
      <p class="decision-record__label">consequences</p>
      <ul class="decision-record__list">
        {#each consequences as item}
          <li class="decision-record__item">
            <span class="decision-record__bullet" aria-hidden="true">•</span>
            <Prose text={item} inline class="decision-record__item-text" />
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if alternatives?.length}
    <div class="decision-record__part">
      <p class="decision-record__label">alternatives</p>
      <ul class="decision-record__list decision-record__list--alternatives">
        {#each alternatives as alt}
          <li class="decision-record__item">
            <span class="decision-record__bullet" aria-hidden="true">✕</span>
            <Prose
              text={`**${alt.option}** — ${alt.rejectedBecause}`}
              inline
              class="decision-record__item-text"
            />
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</article>

<style>
  .decision-record {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-5);
    border-radius: var(--radius-window);
    background: var(--color-glass);
    border: var(--border-width) solid var(--color-border);
    box-shadow: var(--shadow-window);
    backdrop-filter: blur(var(--fx-blur-md)) saturate(var(--fx-glass-saturation));
    scroll-margin-top: var(--reading-anchor-offset, 4rem);
  }

  .decision-record__header {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .decision-record__eyebrow {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    letter-spacing: 0.04em;
    color: var(--color-text-low);
  }

  .decision-record__title-row {
    display: flex;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .decision-record__title {
    /* Basis 0: the title wraps within the row instead of claiming the whole
       line and pushing the status badge underneath. */
    flex: 1 1 0;
    min-width: 0;
    margin: 0;
    font-family: var(--font-ui);
    font-weight: var(--font-weight-semibold);
    font-size: var(--text-lg);
    line-height: 1.2;
    color: var(--color-text-high);
  }

  /* Centers the badge on the title's first line rather than its whole
     (possibly wrapped) block: half the gap between the title's first line
     box and the badge's own rendered height (line-height 1 + padding +
     border, set alongside this rule). Wraps below the title on narrow. */
  .decision-record :global(.decision-record__status-badge) {
    flex: none;
    align-self: flex-start;
    line-height: 1;
    margin-top: calc((var(--text-lg) * 1.2 - (var(--text-xs) + 0.3rem + 2 * var(--border-width, 1px))) / 2);
  }

  .decision-record__status {
    font-family: var(--font-mono);
  }

  .decision-record__status--strike {
    text-decoration: line-through;
  }

  .decision-record__part {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-width: 0;
  }

  /* The accent bar hangs into the card's own padding instead of indenting
     the part's text, so "decision" lines up with "context"/"gains"/"costs". */
  .decision-record__part--decision {
    position: relative;
  }

  .decision-record__part--decision::before {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: calc(-1 * var(--space-3));
    width: 2px;
    background: var(--color-accent);
  }

  .decision-record__label {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    letter-spacing: 0.04em;
    text-transform: lowercase;
    color: var(--color-text-low);
  }

  .decision-record__list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    color: var(--color-text-med);
    font-size: var(--text-sm);
  }

  /* Hanging marker: the marker gets its own column so wrapped lines of the
     item's text align with the first line's text, not with the marker. */
  .decision-record__item {
    display: grid;
    grid-template-columns: 1.25em minmax(0, 1fr);
    align-items: baseline;
  }

  .decision-record__bullet {
    font-family: var(--font-mono);
    color: var(--color-text-low);
  }

  .decision-record__bullet--gain {
    color: var(--color-success);
  }

  .decision-record__bullet--cost {
    color: var(--color-danger);
  }

  /* `Prose` renders its own block with its own (larger, longer-form) reading
     typography — reset it back to the list's own compact size/colour so
     `**bold**`/`` `code` `` render safely without changing the card's
     density. Its `:global(strong)`/`:global(code)` rules still apply on top. */
  .decision-record :global(.decision-record__item-text) {
    font-size: inherit;
    line-height: inherit;
    color: inherit;
  }

  .decision-record :global(.decision-record__item-text .markdown) {
    font-size: inherit;
    line-height: inherit;
    color: inherit;
  }

  .decision-record :global(.decision-record__item-text.prose .markdown > *) {
    max-inline-size: none;
  }

  .decision-record__tradeoffs {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  @container (min-width: 36rem) {
    .decision-record__tradeoffs {
      flex-direction: row;
    }

    .decision-record__tradeoffs > .decision-record__part {
      flex: 1;
      min-width: 0;
    }
  }
</style>
