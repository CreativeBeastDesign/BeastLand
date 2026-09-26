<!-- src/lib/components/organisms/DeepDive.svelte -->
<!-- A glass panel that frames a digression from the main narrative. Its
     heading/body/outline wiring is delegated to `Section`; this component
     only adds the panel chrome, the eyebrow, the optional summary and the
     `links="auto"` jump list. -->

<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HeadingLevel, OutlineEntry } from "$lib/reading/types.js";
  import Prose from "$lib/components/atoms/Prose.svelte";
  import Section from "./Section.svelte";

  type Props = {
    id: string;
    title: string;
    summary?: string;
    eyebrow?: string;
    number?: string;
    level?: HeadingLevel;
    unlisted?: boolean;
    links?: OutlineEntry[] | "auto";
    class?: string;
    children?: Snippet;
  };

  let {
    id,
    title,
    summary,
    eyebrow = "deep dive",
    number,
    level = 2,
    unlisted = false,
    links,
    class: className,
    children,
  }: Props = $props();

  let bodyEl: HTMLElement | undefined = $state();
  let autoLinks: OutlineEntry[] = $state([]);

  // Small local discovery helper: reads the Outline DOM contract directly
  // rather than depending on Agent C's `collectOutline` (built in parallel).
  function scanAuto() {
    if (!bodyEl) return;
    const wantLevel = level + 1;
    const found: OutlineEntry[] = [];
    for (const el of bodyEl.querySelectorAll<HTMLElement>("[data-outline]")) {
      const entryLevel = Number(el.getAttribute("data-outline-level"));
      if (entryLevel !== wantLevel || !el.id) continue;
      found.push({
        id: el.id,
        label: el.getAttribute("data-outline-label") ?? "",
        level: entryLevel,
        number: el.getAttribute("data-outline-number") ?? undefined,
      });
    }
    autoLinks = found;
  }

  $effect(() => {
    if (links !== "auto" || !bodyEl || typeof MutationObserver === "undefined") return;
    scanAuto();
    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        scanAuto();
      });
    });
    observer.observe(bodyEl, { childList: true, subtree: true });
    return () => observer.disconnect();
  });

  const jumpEntries = $derived(links === "auto" ? autoLinks : (links ?? []));
  const showJump = $derived(links === "auto" ? jumpEntries.length >= 2 : jumpEntries.length > 0);
</script>

<div class={["deep-dive", "surface", "surface--glass", "grain", className].filter(Boolean).join(" ")}>
  {#if eyebrow}
    <p class="deep-dive__eyebrow">// {eyebrow}</p>
  {/if}

  <Section {id} {title} {number} {level} {unlisted}>
    {#if summary}
      <Prose text={summary} class="deep-dive__summary" />
    {/if}

    {#if showJump}
      <nav class="deep-dive__jump" aria-label="In this deep dive">
        <ul class="deep-dive__jump-list">
          {#each jumpEntries as entry (entry.id)}
            <li>
              <a class="deep-dive__jump-link" href={`#${entry.id}`}>→ {entry.label}</a>
            </li>
          {/each}
        </ul>
      </nav>
    {/if}

    <div class="deep-dive__body" bind:this={bodyEl}>
      {#if children}
        {@render children()}
      {/if}
    </div>
  </Section>
</div>

<style>
  .deep-dive {
    border-radius: var(--radius-window);
    position: relative;
    padding: var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    /* No `overflow: hidden` here (there used to be one, just to clip the
       gradient hairline below to the rounded corners): a hung section
       number inside this panel needs to render past its left edge, into
       the shared gutter, and `overflow: hidden` would clip it off. The
       hairline gets its own matching corner radius instead. */
  }

  /* The panel's own padding + border eat into the content column, so section
     numbers hanging inside it (its own title Section, and any nested
     Sections in `.deep-dive__body`) need to reach further to land in the
     same gutter. Set on the direct children, not `.deep-dive` itself, so it
     doesn't clobber a value already inherited from further up.

     This does NOT compose across nested DeepDives (`var(--reading-inset,
     0px) + …` here would be a self-reference cycle — CSS's cyclic-reference
     rule fires for *any* declaration of a custom property that reads that
     same property, even one matched via a descendant/child selector rather
     than the exact element, so it can't add to an inherited value this way;
     verified empirically, browser computes the whole declaration as
     guaranteed-invalid). One level — the one case this component actually
     has — works correctly; a DeepDive nested inside another would need a
     second, differently-named inset variable to compose properly. */
  .deep-dive > :global(*) {
    --reading-inset: calc(var(--space-5) + var(--border-width, 1px));
  }

  /* Gradient top hairline — signature Hyprland accent -> secondary treatment.
     It follows the panel's rounded corners without needing `overflow:
     hidden` on the panel (which would clip hung section numbers). */
  .deep-dive::before {
    content: "";
    position: absolute;
    /* Cover the panel's border box exactly (absolute insets start at the
       padding box, so step out by the border width) and take its radius. */
    inset: calc(-1 * var(--border-width, 1px));
    border-radius: inherit;
    /* A gradient *top border* rather than a 2px strip: a border follows the
       rounded corners and tapers into the sides like the panel's own border.
       The mask keeps only the border area (border-box minus padding-box). */
    border-top: 2px solid transparent;
    /* Paint the (45°) brand gradient only over a band as tall as the corner
       curve, so the top edge runs the full pink → teal range instead of the
       sliver a gradient spanning the whole panel height would show. */
    background: var(--gradient-brand) top / 100% calc(var(--radius-window) + 2px) no-repeat border-box;
    mask:
      linear-gradient(#000 0 0) padding-box exclude,
      linear-gradient(#000 0 0) border-box;
    pointer-events: none;
  }

  .deep-dive__eyebrow {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    letter-spacing: 0.04em;
    color: var(--color-text-low);
  }

  .deep-dive :global(.deep-dive__summary) {
    font-size: var(--text-base);
  }

  .deep-dive__body {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .deep-dive__jump-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .deep-dive__jump-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: 0.15rem 0.5rem;
    border-radius: var(--radius-pill);
    border: var(--border-width) solid var(--color-border);
    background: var(--color-surface-2);
    color: var(--color-secondary);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    text-decoration: none;
    transition:
      border-color var(--duration-fast) var(--ease-out),
      color var(--duration-fast) var(--ease-out);
  }

  .deep-dive__jump-link:hover,
  .deep-dive__jump-link:focus-visible {
    color: var(--color-accent);
    border-color: color-mix(in oklab, var(--color-accent) 45%, transparent);
  }

  .deep-dive__jump-link:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }
</style>
