<!-- src/lib/components/molecules/Disclosure.svelte -->

<script lang="ts">
  import type { Snippet } from "svelte";
  import { slide } from "svelte/transition";
  import { prefersReducedMotion, scrollBehavior } from "$lib/actions/motion.js";

  type Props = {
    id: string;
    label: string;
    count?: string | number;
    hint?: string;
    open?: boolean;
    class?: string;
    children: Snippet;
  };

  let {
    id,
    label,
    count,
    hint,
    open = $bindable(false),
    class: className,
    children,
  }: Props = $props();

  let panelId = $derived(`${id}-panel`);

  /** Deep-link: `#id` in the URL (or a hash targeting something inside the
   * panel once it's open) opens this disclosure and scrolls it into view. */
  function checkHash() {
    if (typeof location === "undefined") return;
    const hash = location.hash.slice(1);
    if (!hash) return;
    if (hash === id) {
      open = true;
      queueMicrotask(() => scrollToSelf());
      return;
    }
    // The hash may target something inside the (currently closed) panel —
    // open first, then check whether that target actually lives in here.
    if (!open) return;
    const target = document.getElementById(hash);
    const root = document.getElementById(id);
    if (target && root?.contains(target)) {
      scrollToSelf();
    }
  }

  function scrollToSelf() {
    document.getElementById(id)?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
  }

  $effect(() => {
    checkHash();
    window.addEventListener("hashchange", checkHash);
    return () => window.removeEventListener("hashchange", checkHash);
  });
</script>

<div {id} class={["disclosure", className].filter(Boolean).join(" ")}>
  <button
    type="button"
    class="disclosure__trigger"
    aria-expanded={open}
    aria-controls={panelId}
    onclick={() => (open = !open)}
  >
    <span class="disclosure__chevron" class:disclosure__chevron--open={open} aria-hidden="true">&rsaquo;</span>
    <span class="disclosure__text">
      <span class="disclosure__label">{label}</span>
      {#if hint}
        <span class="disclosure__hint">{hint}</span>
      {/if}
    </span>
    {#if count !== undefined}
      <span class="disclosure__count">[{count}]</span>
    {/if}
  </button>
  {#if open}
    <div
      id={panelId}
      class="disclosure__panel"
      transition:slide={{ duration: prefersReducedMotion() ? 0 : 220 }}
    >
      {@render children()}
    </div>
  {/if}
</div>

<style>
  .disclosure {
    scroll-margin-top: var(--reading-anchor-offset, 4rem);
  }

  .disclosure__trigger {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: var(--space-2) 0;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    color: var(--color-text-high);
  }

  .disclosure__chevron {
    flex: none;
    font-family: var(--font-mono);
    color: var(--color-text-low);
    transition: transform var(--duration-fast) var(--ease-out);
  }

  .disclosure__chevron--open {
    transform: rotate(90deg);
  }

  .disclosure__text {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    flex: 1;
    min-width: 0;
  }

  .disclosure__label {
    font-family: var(--font-ui);
    font-weight: var(--font-weight-medium);
  }

  .disclosure__hint {
    font-size: var(--text-xs);
    color: var(--color-text-low);
  }

  .disclosure__count {
    flex: none;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-text-low);
  }

  .disclosure__panel {
    padding-block: var(--space-2) var(--space-3);
  }

  .disclosure__trigger:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
    border-radius: var(--radius-xs);
  }

  @media (prefers-reduced-motion: reduce) {
    .disclosure__chevron {
      transition: none;
    }
  }
</style>
