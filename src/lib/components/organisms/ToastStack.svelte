<!-- src/lib/components/organisms/ToastStack.svelte -->

<script lang="ts">
  import { fly } from "svelte/transition";
  import { flip } from "svelte/animate";
  import { portal } from "$lib/actions/portal.js";
  import { toasts, type ToastAction } from "$lib/shell/toasts.svelte.js";
  import { shell } from "$lib/shell/state.svelte.js";
  import NotificationItem from "$lib/components/molecules/NotificationItem.svelte";
  import Button from "$lib/components/atoms/Button.svelte";

  type Position = "bottom-right" | "bottom-left" | "top-right" | "top-left";

  let { position = "bottom-right" }: { position?: Position } = $props();

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const flyIn = { y: 12, duration: reducedMotion ? 0 : 220 };
  const flipMove = { duration: reducedMotion ? 0 : 220 };

  function runAction(action: ToastAction) {
    if (action.command) shell.run(action.command);
    action.onclick?.();
  }
</script>

<div
  class="toast-stack"
  data-position={position}
  role="region"
  aria-label="Notifications"
  use:portal
>
  {#each toasts.items as toast (toast.id)}
    <div
      class="toast-stack__item"
      role={toast.tone === "danger" ? "alert" : "status"}
      transition:fly={flyIn}
      animate:flip={flipMove}
      onmouseenter={() => toasts.pause(toast.id)}
      onmouseleave={() => toasts.resume(toast.id)}
    >
      <div class="toast-stack__card">
        <NotificationItem
          title={toast.title}
          message={toast.message}
          tone={toast.tone}
          ondismiss={() => toasts.dismiss(toast.id)}
        />
        {#if toast.timeout > 0}
          <div
            class="toast-stack__progress"
            style="--toast-duration: {toast.timeout}ms"
            aria-hidden="true"
          ></div>
        {/if}
      </div>

      {#if toast.action}
        {@const action = toast.action}
        <div class="toast-stack__action">
          <Button variant="ghost" size="sm" onclick={() => runAction(action)}>
            {action.label}
          </Button>
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .toast-stack {
    position: fixed;
    z-index: var(--layer-notification);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    width: 100%;
    max-width: 24rem;
    pointer-events: none;
  }

  .toast-stack[data-position="bottom-right"] {
    right: var(--space-4);
    bottom: var(--space-4);
    align-items: flex-end;
  }

  .toast-stack[data-position="bottom-left"] {
    left: var(--space-4);
    bottom: var(--space-4);
    align-items: flex-start;
  }

  .toast-stack[data-position="top-right"] {
    right: var(--space-4);
    top: var(--space-4);
    align-items: flex-end;
    flex-direction: column-reverse;
  }

  .toast-stack[data-position="top-left"] {
    left: var(--space-4);
    top: var(--space-4);
    align-items: flex-start;
    flex-direction: column-reverse;
  }

  .toast-stack__item {
    pointer-events: auto;
    width: 100%;
  }

  .toast-stack__card {
    position: relative;
    border-radius: var(--radius-popup);
    overflow: hidden;
  }

  .toast-stack__action {
    display: flex;
    justify-content: flex-end;
    margin-top: var(--space-1);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-control);
    border: var(--border-width) solid var(--color-border);
    background: var(--color-glass);
    backdrop-filter: blur(var(--fx-blur-sm)) saturate(var(--fx-glass-saturation));
  }

  .toast-stack__progress {
    position: absolute;
    left: 0;
    bottom: 0;
    height: 2px;
    width: 100%;
    background: var(--color-accent);
    transform-origin: left;
    animation: toast-shrink var(--toast-duration) linear forwards;
  }

  .toast-stack__item:hover .toast-stack__progress {
    animation-play-state: paused;
  }

  @media (prefers-reduced-motion: reduce) {
    .toast-stack__progress {
      animation: none;
    }
  }

  @keyframes toast-shrink {
    from {
      transform: scaleX(1);
    }
    to {
      transform: scaleX(0);
    }
  }
</style>
