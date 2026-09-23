<!-- src/lib/components/atoms/Radio.svelte -->
<!-- The single radio item; usually rendered by molecules/RadioGroup.svelte. -->

<script lang="ts">
  import type { HTMLInputAttributes } from "svelte/elements";

  type Size = "sm" | "md";

  type Props = Omit<HTMLInputAttributes, "type" | "size" | "checked"> & {
    name: string;
    value: string;
    checked?: boolean;
    label?: string;
    description?: string;
    disabled?: boolean;
    size?: Size;
  };

  let { name, value, checked, label, description, disabled, size = "md", ...restProps }: Props =
    $props();
</script>

<label class="radio" class:radio--disabled={disabled} data-size={size}>
  <span class="radio__box">
    <input class="radio__input" type="radio" {name} {value} {checked} {disabled} {...restProps} />
    <span class="radio__dot" aria-hidden="true"></span>
  </span>
  {#if label || description}
    <span class="radio__text">
      {#if label}<span class="radio__label">{label}</span>{/if}
      {#if description}<span class="radio__description">{description}</span>{/if}
    </span>
  {/if}
</label>

<style>
  .radio {
    display: inline-flex;
    align-items: flex-start;
    gap: var(--space-2);
    cursor: pointer;
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    color: var(--color-text-high);
  }

  .radio--disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .radio__box {
    position: relative;
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.125rem;
    height: 1.125rem;
    margin-top: 0.0625rem;
    border-radius: var(--radius-pill);
    border: var(--border-width) solid var(--control-border);
    background: var(--control-bg);
    transition:
      background var(--duration-fast) var(--ease-out),
      border-color var(--duration-fast) var(--ease-out);
  }

  .radio[data-size="sm"] .radio__box {
    width: 0.9375rem;
    height: 0.9375rem;
  }

  .radio__input {
    position: absolute;
    inset: 0;
    margin: 0;
    opacity: 0;
    cursor: inherit;
  }

  .radio__dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: var(--radius-pill);
    background: var(--color-on-accent);
    opacity: 0;
    transform: scale(0.4);
    transition:
      opacity var(--duration-fast) var(--ease-out),
      transform var(--duration-fast) var(--ease-out);
  }

  .radio__box:has(.radio__input:hover):not(:has(.radio__input:disabled)) {
    border-color: var(--color-border-strong);
  }

  .radio__box:has(.radio__input:checked) {
    background: var(--color-accent);
    border-color: var(--color-accent);
  }

  .radio__input:checked ~ .radio__dot {
    opacity: 1;
    transform: scale(1);
  }

  .radio__box:has(.radio__input:focus-visible) {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  .radio__input:disabled {
    cursor: not-allowed;
  }

  .radio__text {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .radio__description {
    font-size: var(--text-xs);
    color: var(--color-text-low);
  }

  @media (prefers-reduced-motion: reduce) {
    .radio__box,
    .radio__dot {
      transition: none;
    }
  }
</style>
