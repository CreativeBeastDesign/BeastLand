<!-- src/lib/components/organisms/Tile.svelte -->

<script lang="ts">
  import type { Snippet } from "svelte";
  import type { Container, ContainerId } from "$lib/tiling/types.js";
  import ShortId from "$lib/components/atoms/ShortId.svelte";
  import { overflowFade } from "$lib/actions/overflowFade.js";

  type Props = {
    container: Container;
    selected?: boolean;
    /** e.g. record display name for the title bar, used when the container has no explicit title. */
    label?: string;
    allIds: string[];
    children: Snippet;
    onselect?: (id: ContainerId) => void;
    /** Highlighted as the target of the line currently being typed in the terminal. */
    preview?: boolean;
    /** Short status badge shown while `preview` is active, e.g. `w 2 → 4`. */
    hint?: string;
    /** The previewed action would be refused (overlap, edge…). */
    invalid?: boolean;
  };

  let {
    container,
    selected = false,
    label,
    allIds,
    children,
    onselect,
    preview = false,
    hint,
    invalid = false,
  }: Props = $props();

  function select() {
    onselect?.(container.id);
  }

  function onkeydown(event: KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      select();
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<article
  class="tile grain"
  class:tile--selected={selected}
  class:tile--preview={preview}
  class:tile--invalid={preview && invalid}
  data-container-id={container.id}
  tabindex="0"
  onclick={select}
  {onkeydown}
>
  <!-- Ids first (they never shrink — they are what you type), title in the
       middle (the only thing that truncates), kind last. -->
  <header class="tile__bar">
    <span class="tile__ids">
      <span class="tile__id">@{container.id}</span>
      <ShortId id={container.contentId} all={allIds} />
    </span>
    <span class="tile__title">{container.title ?? label ?? ""}</span>
    <span class="tile__kind">{container.kind}</span>
  </header>

  <div class="tile__body" data-tile-body use:overflowFade>
    {@render children()}
  </div>

  {#if preview && hint}
    <span class="tile__hint" class:tile__hint--invalid={invalid}>{hint}</span>
  {/if}
</article>

<style>
  .tile {
    position: relative;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    /* Same border width in both states (see `.tile--selected`) — only the
       border-box gradient layer changes, so nothing shifts on selection. */
    background:
      linear-gradient(var(--color-glass), var(--color-glass)) padding-box,
      linear-gradient(var(--color-border), var(--color-border)) border-box;
    backdrop-filter: blur(var(--fx-blur-md)) saturate(var(--fx-glass-saturation));
    border: var(--border-active-width) solid transparent;
    border-radius: var(--radius-window);
    box-shadow: var(--shadow-tile);
    container-type: inline-size;
    container-name: tile;
    cursor: pointer;
    text-align: left;
    transition:
      box-shadow var(--duration-normal) var(--ease-out),
      background var(--duration-normal) var(--ease-out),
      backdrop-filter var(--duration-normal) var(--ease-out);
  }

  /* Distinct from `.tile--selected`'s border gradient: an outset ring so
     keyboard focus reads clearly even on an already-selected tile. */
  .tile:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  .tile--selected {
    background:
      linear-gradient(var(--color-glass), var(--color-glass)) padding-box,
      var(--gradient-border-active) border-box;
    backdrop-filter: blur(var(--fx-blur-md))
      saturate(calc(var(--fx-glass-saturation) + 0.25));
    box-shadow: var(--shadow-tile-selected), var(--glow-active);
  }

  /* Content-aware preview: the target of the line being typed in the
     terminal. A secondary (cyan) treatment, distinct from selection's
     accent gradient border — both can be visible at once. */
  .tile--preview {
    box-shadow: var(--glow-secondary), 0 0 0 1px var(--color-secondary);
    transition: box-shadow var(--duration-fast) var(--ease-out);
  }

  .tile--invalid {
    box-shadow: 0 0 14px oklch(from var(--color-danger) l c h / 0.45), 0 0 0 1px var(--color-danger);
  }

  .tile__hint {
    position: absolute;
    bottom: var(--space-2);
    right: var(--space-3);
    padding: 0 var(--space-2);
    border-radius: var(--radius-pill);
    background: color-mix(in oklab, var(--color-secondary) 18%, transparent);
    color: var(--color-secondary);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    white-space: nowrap;
    pointer-events: none;
  }

  .tile__hint--invalid {
    background: color-mix(in oklab, var(--color-danger) 18%, transparent);
    color: var(--color-danger);
  }

  .tile__bar {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-3);
    border-bottom: 1px solid var(--color-border-subtle);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    flex-shrink: 0;
  }

  .tile__id {
    font-family: var(--font-ui);
    font-weight: var(--font-weight-semibold);
    color: var(--color-accent);
    flex-shrink: 0;
  }

  .tile__title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--color-text-med);
  }

  .tile__kind {
    flex-shrink: 0;
    color: var(--color-text-low);
  }

  .tile__ids {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .tile__body {
    flex: 1;
    overflow: auto;
    padding: var(--space-3);
  }
</style>
