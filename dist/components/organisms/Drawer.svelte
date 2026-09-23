<!-- src/lib/components/organisms/Drawer.svelte -->
<!-- A side sheet. Same focus-trap / portal / escape mechanics as Modal, but
     docked to an edge (right, left, or bottom) instead of centered. -->

<script lang="ts">
  import type { Snippet } from "svelte";
  import { tick } from "svelte";
  import { fly } from "svelte/transition";
  import IconButton from "../atoms/IconButton.svelte";
  import WindowTitleBar from "../molecules/WindowTitleBar.svelte";
  import { portal } from "../../actions/portal.js";
  import { overflowFade } from "../../actions/overflowFade.js";

  type Side = "right" | "left" | "bottom";

  type Props = {
    open: boolean;
    onclose: () => void;
    title: string;
    side?: Side;
    size?: string;
    children: Snippet;
    footer?: Snippet;
  };

  let { open, onclose, title, side = "right", size = "24rem", children, footer }: Props = $props();

  const titleId = $props.id();

  let panelEl: HTMLDivElement | undefined = $state();

  const reducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const flyParams = $derived({
    x: side === "left" ? -480 : side === "right" ? 480 : 0,
    y: side === "bottom" ? 320 : 0,
    duration: reducedMotion ? 0 : 260,
  });

  const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function focusableIn(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  }

  function trapFocus(event: KeyboardEvent) {
    if (event.key !== "Tab" || !panelEl) return;

    const focusable = focusableIn(panelEl);
    if (focusable.length === 0) {
      event.preventDefault();
      panelEl.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey) {
      if (active === first || !panelEl.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last || !panelEl.contains(active)) {
      event.preventDefault();
      first.focus();
    }
  }

  $effect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    tick().then(() => {
      if (!panelEl) return;
      const focusable = focusableIn(panelEl);
      (focusable[0] ?? panelEl).focus();
    });

    return () => {
      previouslyFocused?.focus?.();
    };
  });
</script>

{#if open}
  <div
    class="drawer-backdrop"
    role="presentation"
    use:portal
    onclick={() => onclose()}
    onkeydown={(e) => {
      if (e.key === "Escape") onclose();
    }}
  >
    <div
      class="drawer grain"
      data-side={side}
      style="--drawer-size: {size};"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabindex="-1"
      bind:this={panelEl}
      transition:fly={flyParams}
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => {
        if (e.key === "Escape") {
          onclose();
          return;
        }
        trapFocus(e);
      }}
    >
      <WindowTitleBar {title} {titleId}>
        {#snippet actions()}
          <IconButton label="Close drawer" onclick={() => onclose()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M6 6l12 12"></path>
              <path d="M18 6L6 18"></path>
            </svg>
          </IconButton>
        {/snippet}
      </WindowTitleBar>

      <div class="drawer__content" use:overflowFade>{@render children()}</div>

      {#if footer}
        <div class="drawer__footer">{@render footer()}</div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .drawer-backdrop {
    position: fixed;
    inset: 0;
    z-index: var(--layer-modal);
    background: var(--modal-backdrop, color-mix(in oklab, var(--color-bg) 60%, transparent));
    backdrop-filter: blur(var(--fx-blur-sm));
  }

  .drawer {
    position: fixed;
    top: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    background: var(--color-glass);
    backdrop-filter: blur(var(--fx-blur-md)) saturate(var(--fx-glass-saturation)) contrast(var(--fx-glass-contrast));
    box-shadow: var(--shadow-modal);
  }

  .drawer[data-side="right"] {
    right: 0;
    width: var(--drawer-size);
    max-width: 100vw;
    border-left: var(--border-width) solid var(--color-border);
    border-radius: var(--radius-window) 0 0 var(--radius-window);
  }

  .drawer[data-side="left"] {
    left: 0;
    width: var(--drawer-size);
    max-width: 100vw;
    border-right: var(--border-width) solid var(--color-border);
    border-radius: 0 var(--radius-window) var(--radius-window) 0;
  }

  .drawer[data-side="bottom"] {
    top: auto;
    left: 0;
    right: 0;
    height: var(--drawer-size);
    max-height: 100vh;
    border-top: var(--border-width) solid var(--color-border);
    border-radius: var(--radius-window) var(--radius-window) 0 0;
  }

  .drawer__content {
    flex: 1;
    padding: var(--space-5);
    overflow: auto;
    color: var(--color-text-med);
  }

  .drawer__footer {
    padding: var(--space-3) var(--space-5);
    border-top: var(--border-width) solid var(--color-border);
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
  }
</style>
