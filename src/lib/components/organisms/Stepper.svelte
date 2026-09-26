<!-- src/lib/components/organisms/Stepper.svelte -->
<!-- Linear progress through a flow (onboarding, a wizard, a case study's own
     phases). Pure presentation over `stepState` (src/lib/reading/steps.ts) —
     the host owns `current`/`completed`. -->

<script lang="ts">
  import type { Step } from "$lib/reading/types.js";
  import { stepState } from "$lib/reading/steps.js";

  type Orientation = "auto" | "horizontal" | "vertical";

  type Props = {
    steps: Step[];
    current?: string;
    completed?: string[];
    orientation?: Orientation;
    onstep?: (id: string) => void;
    label?: string;
    class?: string;
  };

  let {
    steps,
    current,
    completed = [],
    orientation = "auto",
    onstep,
    label = "Progress",
    class: className,
  }: Props = $props();
</script>

<nav
  aria-label={label}
  class={["stepper", className].filter(Boolean).join(" ")}
  data-orientation={orientation}
>
  <ol class="stepper__list">
    {#each steps as step, index (step.id)}
      {@const state = stepState(step.id, current, completed)}
      {@const isCurrent = state === "current"}
      <li class="stepper__item" data-state={state}>
        <span class="stepper__rail">
          <span
            class="stepper__connector"
            class:stepper__connector--hidden={index === 0}
            data-state={index > 0 ? stepState(steps[index - 1].id, current, completed) : undefined}
            aria-hidden="true"
          ></span>
          <span class="stepper__marker" data-state={state} aria-hidden="true">
            {#if state === "complete"}
              ✓
            {:else}
              {index + 1}
            {/if}
          </span>
          <!-- Horizontal only: runs from this marker to the next one. -->
          <span
            class="stepper__connector stepper__connector--after"
            class:stepper__connector--hidden={index === steps.length - 1}
            data-state={state}
            aria-hidden="true"
          ></span>
        </span>

        {#if onstep}
          <button
            type="button"
            class="stepper__control"
            aria-current={isCurrent ? "step" : undefined}
            onclick={() => onstep(step.id)}
          >
            <span class="stepper__label">{step.label}</span>
            {#if step.detail}
              <span class="stepper__detail">{step.detail}</span>
            {/if}
          </button>
        {:else}
          <span class="stepper__control" aria-current={isCurrent ? "step" : undefined}>
            <span class="stepper__label">{step.label}</span>
            {#if step.detail}
              <span class="stepper__detail">{step.detail}</span>
            {/if}
          </span>
        {/if}
      </li>
    {/each}
  </ol>
</nav>

<style>
  .stepper__list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
  }

  .stepper__item {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
  }

  .stepper__rail {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
  }

  .stepper__connector {
    width: 1px;
    flex: 1 1 auto;
    min-height: var(--space-4);
    background: var(--color-text-low);
  }

  .stepper__connector--hidden {
    visibility: hidden;
  }

  .stepper__connector[data-state="complete"] {
    background: var(--color-success);
  }

  .stepper__connector[data-state="current"] {
    background: var(--color-accent);
  }

  .stepper__marker {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 1.6rem;
    height: 1.6rem;
    border-radius: var(--radius-pill);
    border: var(--border-width) solid var(--color-text-low);
    color: var(--color-text-low);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-feature-settings: var(--font-feature-numeric);
  }

  .stepper__marker[data-state="complete"] {
    background: color-mix(in oklab, var(--color-success) 20%, transparent);
    border-color: color-mix(in oklab, var(--color-success) 45%, transparent);
    color: var(--color-success);
  }

  .stepper__marker[data-state="current"] {
    border-color: var(--color-accent);
    color: var(--color-accent);
    box-shadow: var(--glow-accent);
  }

  .stepper__control {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    padding: 0.1rem 0 var(--space-4);
    border: none;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
  }

  button.stepper__control {
    cursor: pointer;
  }

  button.stepper__control:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
    border-radius: var(--radius-control);
  }

  .stepper__label {
    font-family: var(--font-ui);
    font-weight: var(--font-weight-medium);
    font-size: var(--text-sm);
    color: var(--color-text-high);
  }

  .stepper__item[data-state="upcoming"] .stepper__label {
    color: var(--color-text-med);
  }

  .stepper__detail {
    font-size: var(--text-xs);
    color: var(--color-text-med);
  }

  .stepper__item:last-child .stepper__control {
    padding-bottom: 0;
  }

  /* Vertical: only the leading connector (above each marker) is drawn. */
  .stepper__connector--after {
    display: none;
  }

  /* The stepper root is the one container every `auto` rule queries (a
     named query, so an unrelated container in between can't answer it).
     Before, the list queried an outer container while the items queried the
     list, so between the two widths it rendered half-horizontal. */
  .stepper {
    container: stepper / inline-size;
  }

  .stepper[data-orientation="horizontal"] .stepper__list {
    flex-direction: row;
  }

  /* Timeline layout: every column starts with its marker, the trailing
     connector runs to the next column's marker, and labels sit
     left-aligned under their own marker with a gap before the next
     column, so nothing drifts from its marker or overflows. */
  .stepper[data-orientation="horizontal"] .stepper__item {
    flex: 1 1 0;
    min-width: 0;
    flex-direction: column;
    gap: var(--space-2);
  }

  .stepper[data-orientation="horizontal"] .stepper__rail {
    flex-direction: row;
    width: 100%;
  }

  .stepper[data-orientation="horizontal"] .stepper__connector {
    display: none;
  }

  .stepper[data-orientation="horizontal"] .stepper__connector--after {
    display: block;
    width: auto;
    height: 1px;
    min-height: 0;
    margin-inline: var(--space-2);
  }


  .stepper[data-orientation="horizontal"] .stepper__control {
    min-width: 0;
    padding: 0 var(--space-4) 0 0;
  }

  .stepper[data-orientation="horizontal"] .stepper__item:last-child .stepper__control {
    padding-right: 0;
  }

  @container stepper (min-width: 44rem) {
  .stepper[data-orientation="auto"] .stepper__list {
      flex-direction: row;
    }

    /* Timeline layout: every column starts with its marker, the trailing
       connector runs to the next column's marker, and labels sit
       left-aligned under their own marker with a gap before the next
       column, so nothing drifts from its marker or overflows. */
    .stepper[data-orientation="auto"] .stepper__item {
      flex: 1 1 0;
      min-width: 0;
      flex-direction: column;
      gap: var(--space-2);
    }

    .stepper[data-orientation="auto"] .stepper__rail {
      flex-direction: row;
      width: 100%;
    }

    .stepper[data-orientation="auto"] .stepper__connector {
      display: none;
    }

    .stepper[data-orientation="auto"] .stepper__connector--after {
      display: block;
      width: auto;
      height: 1px;
      min-height: 0;
      margin-inline: var(--space-2);
    }


    .stepper[data-orientation="auto"] .stepper__control {
      min-width: 0;
      padding: 0 var(--space-4) 0 0;
    }

    .stepper[data-orientation="auto"] .stepper__item:last-child .stepper__control {
      padding-right: 0;
    }
  }
</style>
