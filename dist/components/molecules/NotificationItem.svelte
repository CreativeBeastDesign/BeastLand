<!-- src/lib/components/molecules/NotificationItem.svelte -->

<script lang="ts">
  import type { Snippet } from "svelte";
  import IconButton from "../atoms/IconButton.svelte";

  type Tone = "info" | "success" | "warning" | "danger";

  type Props = {
    title: string;
    message?: string;
    tone?: Tone;
    timestamp?: string;
    icon?: Snippet;
    ondismiss?: () => void;
  };

  let { title, message, tone = "info", timestamp, icon, ondismiss }: Props =
    $props();
</script>

<div class="notification" data-tone={tone}>
  {#if icon}
    <div class="notification__icon">{@render icon()}</div>
  {:else}
    <!-- Default glyph per tone, so tone is carried by shape as well as colour. -->
    <div class="notification__icon" aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        {#if tone === "success"}
          <circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" />
        {:else if tone === "warning"}
          <path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 9v5" /><path d="M12 17h.01" />
        {:else if tone === "danger"}
          <circle cx="12" cy="12" r="9" /><path d="m9 9 6 6" /><path d="m15 9-6 6" />
        {:else}
          <circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" />
        {/if}
      </svg>
    </div>
  {/if}

  <div class="notification__body">
    <div class="notification__head">
      <span class="notification__title">{title}</span>
      {#if timestamp}
        <span class="notification__time">{timestamp}</span>
      {/if}
    </div>
    {#if message}
      <p class="notification__message">{message}</p>
    {/if}
  </div>

  {#if ondismiss}
    <IconButton
      label="Dismiss notification"
      size="sm"
      onclick={ondismiss}
    >
      <svg
        width="14"
        height="14"
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
  {/if}
</div>

<style>
  /* The tone colours the icon, a left stripe and a faint tint of the glass;
     the stripe is what separates tones at a glance in a stack. */
  .notification {
    --tone: var(--color-info);
    display: flex;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-popup);
    border: var(--border-width) solid color-mix(in oklab, var(--tone) 35%, var(--color-border));
    background: color-mix(in oklab, var(--tone) 10%, var(--color-glass));
    backdrop-filter: blur(var(--fx-blur-md)) saturate(var(--fx-glass-saturation));
    box-shadow:
      inset 3px 0 0 var(--tone),
      var(--shadow-popup);
  }

  .notification[data-tone="success"] {
    --tone: var(--color-success);
  }

  .notification[data-tone="warning"] {
    --tone: var(--color-warning);
  }

  .notification[data-tone="danger"] {
    --tone: var(--color-danger);
  }

  .notification__icon {
    display: inline-flex;
    align-items: flex-start;
    padding-top: 0.1rem;
    color: var(--tone);
  }

  .notification__body {
    flex: 1;
    min-width: 0;
  }

  .notification__head {
    display: flex;
    align-items: baseline;
    gap: var(--space-3);
  }

  .notification__title {
    font-size: var(--text-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-high);
  }

  .notification__time {
    margin-left: auto;
    font-size: var(--text-xs);
    color: var(--color-text-low);
  }

  .notification__message {
    margin: var(--space-1) 0 0;
    font-size: var(--text-sm);
    color: var(--color-text-med);
    line-height: 1.4;
  }
</style>
