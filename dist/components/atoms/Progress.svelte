<!-- src/lib/components/atoms/Progress.svelte -->

<script lang="ts">
  type Tone = "accent" | "secondary" | "success" | "warning" | "danger";
  type Size = "sm" | "md";

  type Props = {
    value?: number;
    label?: string;
    size?: Size;
    tone?: Tone;
  };

  let { value, label, size = "md", tone = "accent" }: Props = $props();

  let clamped = $derived(value === undefined ? undefined : Math.min(100, Math.max(0, value)));
</script>

<div
  class="progress"
  class:progress--indeterminate={clamped === undefined}
  data-size={size}
  data-tone={tone}
  role="progressbar"
  aria-valuenow={clamped}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label={label}
>
  <div class="progress__track">
    <div class="progress__fill" style={clamped !== undefined ? `width: ${clamped}%` : undefined}></div>
  </div>
  {#if label}
    <span class="progress__label">{label}</span>
  {/if}
</div>

<style>
  .progress {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    width: 100%;
  }

  .progress__track {
    position: relative;
    width: 100%;
    height: 0.5rem;
    border-radius: var(--radius-pill);
    background: var(--color-surface-2);
    overflow: hidden;
  }

  .progress[data-size="sm"] .progress__track {
    height: 0.3125rem;
  }

  .progress__fill {
    height: 100%;
    border-radius: var(--radius-pill);
    background: var(--color-accent);
    transition: width var(--duration-normal) var(--ease-out);
  }

  .progress[data-tone="secondary"] .progress__fill {
    background: var(--color-secondary);
  }

  .progress[data-tone="success"] .progress__fill {
    background: var(--color-success);
  }

  .progress[data-tone="warning"] .progress__fill {
    background: var(--color-warning);
  }

  .progress[data-tone="danger"] .progress__fill {
    background: var(--color-danger);
  }

  .progress__label {
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    color: var(--color-text-low);
  }

  .progress--indeterminate .progress__fill {
    width: 40%;
    animation: progress-slide 1.4s var(--ease-in-out) infinite;
  }

  @keyframes progress-slide {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(250%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .progress__fill {
      transition: none;
    }

    .progress--indeterminate .progress__fill {
      animation: none;
      width: 40%;
      transform: none;
    }
  }
</style>
