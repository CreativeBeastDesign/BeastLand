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
    <span class="decision-record__prefix">ADR</span>
    <svelte:element this={`h${level}`} class="decision-record__title">{title}</svelte:element>
    {#if status}
      <Badge tone={STATUS_TONE[status]}>
        <span class="decision-record__status" class:decision-record__status--strike={strikeStatus}>
          {status}
        </span>
      </Badge>
    {/if}
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
              <li>
                <span class="decision-record__bullet decision-record__bullet--gain" aria-hidden="true">+</span>
                {gain}
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
              <li>
                <span class="decision-record__bullet decision-record__bullet--cost" aria-hidden="true">−</span>
                {cost}
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
          <li>
            <span class="decision-record__bullet" aria-hidden="true">•</span>
            {item}
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
          <li>
            <span class="decision-record__bullet" aria-hidden="true">✕</span>
            <strong class="decision-record__option">{alt.option}</strong>
            <span class="decision-record__reason">— {alt.rejectedBecause}</span>
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
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--space-2);
  }

  .decision-record__prefix {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    letter-spacing: 0.04em;
    color: var(--color-accent);
  }

  .decision-record__title {
    margin: 0;
    font-family: var(--font-ui);
    font-weight: var(--font-weight-semibold);
    font-size: var(--text-lg);
    color: var(--color-text-high);
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

  .decision-record__part--decision {
    padding-left: var(--space-3);
    border-left: 2px solid var(--color-accent);
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

  .decision-record__bullet {
    display: inline-block;
    width: 1em;
    font-family: var(--font-mono);
    color: var(--color-text-low);
  }

  .decision-record__bullet--gain {
    color: var(--color-success);
  }

  .decision-record__bullet--cost {
    color: var(--color-danger);
  }

  .decision-record__option {
    color: var(--color-text-high);
    font-weight: var(--font-weight-medium);
  }

  .decision-record__reason {
    color: var(--color-text-med);
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
