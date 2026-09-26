<!-- src/lib/components/organisms/Outline.svelte -->
<!-- Presentational table-of-contents for a reading page. Takes discovered
     entries + active/progress as props — `CaseStudy` wires `createOutlineSpy`
     and passes them down; this component owns no observers of its own. -->

<script lang="ts">
  import type { OutlineEntry } from "$lib/reading/types.js";
  import { portal } from "$lib/actions/portal.js";

  type Variant = "rail" | "bar";

  type Props = {
    entries: OutlineEntry[];
    activeId?: string | null;
    progress?: number;
    title?: string;
    ongoto?: (id: string) => void;
    variant?: Variant;
    class?: string;
  };

  let {
    entries,
    activeId = null,
    progress = 0,
    title = "contents",
    ongoto,
    variant = "rail",
    class: className,
  }: Props = $props();

  let popoverOpen = $state(false);
  let wrapperEl: HTMLElement | undefined = $state();
  let popoverEl: HTMLElement | undefined = $state();
  let popoverBox = $state({ top: 0, left: 0, width: 0 });

  const activeIndex = $derived(entries.findIndex((entry) => entry.id === activeId));
  const activeEntryLabel = $derived(activeIndex >= 0 ? entries[activeIndex].label : (entries[0]?.label ?? ""));

  function select(event: MouseEvent, id: string) {
    if (ongoto) {
      event.preventDefault();
      ongoto(id);
    }
    popoverOpen = false;
  }

  function handleDocumentMousedown(event: MouseEvent) {
    const target = event.target as Node;
    if (wrapperEl?.contains(target) || popoverEl?.contains(target)) return;
    popoverOpen = false;
  }

  // The popover is portalled to <body>: a backdrop-filter nested inside
  // another backdrop-filtered element (a glass Tile, Window or Surface)
  // doesn't blur the page behind it in Chromium, and glass ancestors also
  // trap `position: fixed`. So it is placed from the bar's rect instead.
  function place() {
    if (!wrapperEl) return;
    const rect = wrapperEl.getBoundingClientRect();
    popoverBox = { top: rect.bottom, left: rect.left, width: rect.width };
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      popoverOpen = false;
    }
  }

  $effect(() => {
    if (!popoverOpen) return;
    place();
    document.addEventListener("mousedown", handleDocumentMousedown);
    // Capture: the bar may sit in any scroll container (a tile, the page).
    window.addEventListener("scroll", place, { capture: true, passive: true });
    window.addEventListener("resize", place, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleDocumentMousedown);
      window.removeEventListener("scroll", place, { capture: true });
      window.removeEventListener("resize", place);
    };
  });
</script>

{#if variant === "rail"}
  <nav class={["outline", "outline--rail", className].filter(Boolean).join(" ")} aria-label={title}>
    <p class="outline__title">// {title}</p>
    <div class="outline__page-progress" aria-hidden="true">
      <span class="outline__page-progress-fill" style={`--outline-progress: ${progress}`}></span>
    </div>
    <ol class="outline__list">
      {#each entries as entry (entry.id)}
        <li
          class="outline__item"
          data-level={entry.level}
          class:outline__item--active={entry.id === activeId}
        >
          <a class="outline__link" href={`#${entry.id}`} onclick={(event) => select(event, entry.id)}>
            <span class="outline__number">{entry.number ?? ""}</span>
            <span class="outline__label">{entry.label}</span>
          </a>
        </li>
      {/each}
    </ol>
  </nav>
{:else}
  <nav
    class={["outline", "outline--bar", className].filter(Boolean).join(" ")}
    aria-label={title}
    bind:this={wrapperEl}
  >
    <div class="outline__bar-row">
      <button
        type="button"
        class="outline__bar-current"
        aria-expanded={popoverOpen}
        aria-haspopup="listbox"
        onclick={() => (popoverOpen = !popoverOpen)}
        onkeydown={handleKeydown}
      >
        <span class="outline__bar-label">{activeEntryLabel}</span>
        {#if entries.length > 0}
          <span class="outline__bar-count">[{Math.max(activeIndex, 0) + 1}/{entries.length}]</span>
        {/if}
        <span class="outline__bar-chevron" class:outline__bar-chevron--open={popoverOpen} aria-hidden="true">›</span>
      </button>
    </div>

    {#if popoverOpen}
      <div
        class="outline__popover motion-pop-in"
        role="listbox"
        aria-label={title}
        tabindex="-1"
        onkeydown={handleKeydown}
        use:portal
        bind:this={popoverEl}
        style:top={`${popoverBox.top}px`}
        style:left={`${popoverBox.left}px`}
        style:width={`${popoverBox.width}px`}
      >
        <ol class="outline__list">
          {#each entries as entry (entry.id)}
            <li class="outline__item" data-level={entry.level} class:outline__item--active={entry.id === activeId}>
              <a class="outline__link" href={`#${entry.id}`} onclick={(event) => select(event, entry.id)}>
                <span class="outline__number">{entry.number ?? ""}</span>
                <span class="outline__label">{entry.label}</span>
              </a>
            </li>
          {/each}
        </ol>
      </div>
    {/if}

    <div class="outline__bar-progress" aria-hidden="true">
      <span class="outline__bar-progress-fill" style={`--outline-progress: ${progress}`}></span>
    </div>
  </nav>
{/if}

<style>
  .outline {
    font-family: var(--font-ui);
  }

  .outline__title {
    margin: 0 0 var(--space-2);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    letter-spacing: 0.04em;
    color: var(--color-text-low);
  }

  /* Page-read progress (rail): how much of the whole article has scrolled
     by. Where the reader is comes from the active entry's marker. */
  .outline__page-progress {
    height: 1px;
    margin: 0 0 var(--space-3);
    background: var(--color-border-subtle);
  }

  .outline__page-progress-fill {
    display: block;
    height: 100%;
    width: calc(var(--outline-progress, 0) * 100%);
    background: var(--color-accent);
    transition: width var(--duration-fast) var(--ease-out);
  }

  /* One grid for all rows (items and links are subgrids): the number
     column is as wide as the widest number, so every title starts at the
     same x, numbered or not, at any level. */
  .outline__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    column-gap: var(--space-2);
    row-gap: var(--space-1);
  }

  .outline__item,
  .outline__link {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: subgrid;
  }

  .outline__link {
    position: relative;
    align-items: baseline;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-control);
    color: var(--color-text-med);
    text-decoration: none;
    font-size: var(--text-sm);
    transition: color var(--duration-fast) var(--ease-out);
  }

  .outline__link:hover {
    color: var(--color-text-high);
  }

  .outline__link:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  .outline__number {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-text-low);
    font-feature-settings: var(--font-feature-numeric);
  }

  .outline__item--active .outline__link {
    color: var(--color-accent);
  }

  .outline__item--active .outline__link::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0.15em;
    bottom: 0.15em;
    width: 2px;
    border-radius: var(--radius-pill);
    background: var(--color-accent);
    box-shadow: var(--glow-accent);
  }

  /* Bar variant */
  .outline--bar {
    position: relative;
  }

  .outline__bar-row {
    display: flex;
  }

  .outline__bar-current {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius-control);
    background: var(--color-surface-1);
    color: var(--color-text-high);
    cursor: pointer;
    font: inherit;
    text-align: left;
  }

  .outline__bar-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .outline__bar-count {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-text-low);
  }

  .outline__bar-chevron {
    font-family: var(--font-mono);
    color: var(--color-text-low);
    transform: rotate(90deg);
    transition: transform var(--duration-fast) var(--ease-out);
  }

  .outline__bar-chevron--open {
    transform: rotate(-90deg);
  }

  .outline__bar-current:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  .outline__popover {
    position: fixed;
    margin-top: var(--space-2);
    font-family: var(--font-ui);
    z-index: var(--layer-popover);
    max-height: 60vh;
    overflow: auto;
    padding: var(--space-2);
    border-radius: var(--radius-popup);
    border: var(--border-width) solid var(--color-border);
    /* Same glass as every other surface (theme-tuned, contrast-tested), so
       the blur actually reads; the heavier blur keeps text behind it mush. */
    background: var(--color-glass);
    backdrop-filter: blur(var(--fx-blur-lg)) saturate(var(--fx-glass-saturation))
      contrast(var(--fx-glass-contrast));
    box-shadow: var(--shadow-popup);
  }

  .outline__bar-progress {
    height: 1px;
    margin-top: var(--space-2);
    background: var(--color-border-subtle);
  }

  .outline__bar-progress-fill {
    display: block;
    height: 100%;
    width: calc(var(--outline-progress, 0) * 100%);
    background: var(--color-accent);
    transition: width var(--duration-fast) var(--ease-out);
  }

  @media (prefers-reduced-motion: reduce) {
    .outline__bar-chevron,
    .outline__bar-progress-fill,
    .outline__page-progress-fill {
      transition: none;
    }
  }
</style>
