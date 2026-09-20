<!-- src/lib/components/organisms/Modal.svelte -->

<script lang="ts">
  import type { Snippet } from "svelte";
  import { tick } from "svelte";
  import IconButton from "$lib/components/atoms/IconButton.svelte";
  import WindowTitleBar from "$lib/components/molecules/WindowTitleBar.svelte";
  import { portal } from "$lib/actions/portal.js";

  type Props = {
    title: string;
    open: boolean;
    onclose?: () => void;
    closeOnBackdrop?: boolean;
    children: Snippet;
    footer?: Snippet;
  };

  let {
    title,
    open,
    onclose,
    closeOnBackdrop = true,
    children,
    footer,
  }: Props = $props();

  const titleId = $props.id();

  let modalEl: HTMLDivElement | undefined = $state();

  const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function focusableIn(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  }

  /** Tab/Shift+Tab cycle within the dialog instead of escaping to the page. */
  function trapFocus(event: KeyboardEvent) {
    if (event.key !== "Tab" || !modalEl) return;

    const focusable = focusableIn(modalEl);
    if (focusable.length === 0) {
      event.preventDefault();
      modalEl.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey) {
      if (active === first || !modalEl.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last || !modalEl.contains(active)) {
      event.preventDefault();
      first.focus();
    }
  }

  $effect(() => {
    if (!open) return;

    // Move focus into the dialog on open, restore it on close/unmount.
    const previouslyFocused = document.activeElement as HTMLElement | null;
    tick().then(() => {
      if (!modalEl) return;
      const focusable = focusableIn(modalEl);
      (focusable[0] ?? modalEl).focus();
    });

    return () => {
      previouslyFocused?.focus?.();
    };
  });
</script>

{#if open}
  <div
    class="modal-backdrop"
    role="presentation"
    use:portal
    onclick={() => {
      if (closeOnBackdrop) onclose?.();
    }}
    onkeydown={(e) => {
      if (e.key === "Escape") onclose?.();
    }}
  >
    <div
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabindex="-1"
      bind:this={modalEl}
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => {
        if (e.key === "Escape") {
          onclose?.();
          return;
        }
        trapFocus(e);
      }}
    >
      <WindowTitleBar {title} {titleId}>
        {#snippet actions()}
          <IconButton label="Close dialog" onclick={() => onclose?.()}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12"></path>
              <path d="M18 6L6 18"></path>
            </svg>
          </IconButton>
        {/snippet}
      </WindowTitleBar>

      <div class="modal__content">{@render children()}</div>

      {#if footer}
        <div class="modal__footer">{@render footer()}</div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: var(--layer-modal);
    display: grid;
    place-items: center;
    padding: var(--gap-tile);
    background: color-mix(in oklab, var(--color-bg) 60%, transparent);
    backdrop-filter: blur(var(--fx-blur-sm));
  }

  .modal {
    display: flex;
    flex-direction: column;
    width: min(100%, 32rem);
    max-height: 85vh;
    border-radius: var(--radius-window);
    border: var(--border-width) solid var(--color-border);
    background: var(--color-surface-0);
    box-shadow: var(--shadow-modal);
    overflow: hidden;
    animation: modal-in var(--duration-normal) var(--ease-hypr);
  }

  .modal__content {
    padding: var(--space-5);
    overflow-y: auto;
    color: var(--color-text-med);
  }

  .modal__footer {
    padding: var(--space-3) var(--space-5);
    border-top: var(--border-width) solid var(--color-border);
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
  }

  @keyframes modal-in {
    from {
      opacity: 0;
      transform: scale(var(--scale-window-in)) translateY(var(--translate-window-in));
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
</style>
