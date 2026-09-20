<!-- src/lib/components/atoms/Switch.svelte -->

<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";

  type Size = "sm" | "md";

  type Props = Omit<HTMLAttributes<HTMLButtonElement>, "onclick"> & {
    checked?: boolean;
    label?: string;
    description?: string;
    disabled?: boolean;
    size?: Size;
  };

  let {
    checked = $bindable(false),
    label,
    description,
    disabled,
    size = "md",
    ...restProps
  }: Props = $props();

  function toggle() {
    if (disabled) return;
    checked = !checked;
  }
</script>

<span class="switch-row" class:switch-row--disabled={disabled}>
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    class="switch"
    class:switch--on={checked}
    data-size={size}
    {disabled}
    onclick={toggle}
    {...restProps}
  >
    <span class="switch__thumb" aria-hidden="true"></span>
  </button>
  {#if label || description}
    <span class="switch__text">
      {#if label}<span class="switch__label">{label}</span>{/if}
      {#if description}<span class="switch__description">{description}</span>{/if}
    </span>
  {/if}
</span>

<style>
  .switch-row {
    display: inline-flex;
    align-items: flex-start;
    gap: var(--space-2);
    font-family: var(--font-ui);
  }

  .switch-row--disabled {
    opacity: 0.6;
  }

  .switch {
    --switch-w: 2.25rem;
    --switch-h: 1.25rem;
    --switch-pad: 2px;

    position: relative;
    flex: none;
    width: var(--switch-w);
    height: var(--switch-h);
    padding: 0;
    border-radius: var(--radius-pill);
    border: var(--border-width) solid var(--control-border);
    background: var(--control-bg);
    cursor: pointer;
    transition:
      background var(--duration-fast) var(--ease-out),
      border-color var(--duration-fast) var(--ease-out);
  }

  .switch[data-size="sm"] {
    --switch-w: 1.875rem;
    --switch-h: 1.0625rem;
  }

  .switch:hover:not(:disabled) {
    border-color: var(--color-border-strong);
  }

  .switch:disabled {
    cursor: not-allowed;
  }

  .switch:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  .switch--on {
    background: var(--color-accent);
    border-color: var(--color-accent);
  }

  .switch__thumb {
    position: absolute;
    top: var(--switch-pad);
    left: var(--switch-pad);
    width: calc(var(--switch-h) - 2 * var(--switch-pad) - 2px);
    height: calc(var(--switch-h) - 2 * var(--switch-pad) - 2px);
    border-radius: var(--radius-pill);
    background: var(--color-text-high);
    transition:
      transform var(--duration-fast) var(--ease-out),
      background var(--duration-fast) var(--ease-out);
  }

  .switch--on .switch__thumb {
    transform: translateX(calc(var(--switch-w) - var(--switch-h)));
    background: var(--color-on-accent);
  }

  .switch__text {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .switch__label {
    font-size: var(--text-sm);
    color: var(--color-text-high);
  }

  .switch__description {
    font-size: var(--text-xs);
    color: var(--color-text-low);
  }

  @media (prefers-reduced-motion: reduce) {
    .switch,
    .switch__thumb {
      transition: none;
    }
  }
</style>
