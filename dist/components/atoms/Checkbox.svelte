<!-- src/lib/components/atoms/Checkbox.svelte -->

<script lang="ts">
  import type { HTMLInputAttributes } from "svelte/elements";

  type Size = "sm" | "md";

  type Props = Omit<HTMLInputAttributes, "size" | "type" | "checked"> & {
    checked?: boolean;
    indeterminate?: boolean;
    label?: string;
    description?: string;
    disabled?: boolean;
    size?: Size;
  };

  let {
    checked = $bindable(false),
    indeterminate = false,
    label,
    description,
    disabled,
    size = "md",
    ...restProps
  }: Props = $props();

  let inputEl: HTMLInputElement | undefined = $state();

  $effect(() => {
    if (inputEl) inputEl.indeterminate = indeterminate;
  });
</script>

<label class="checkbox" class:checkbox--disabled={disabled} data-size={size}>
  <span class="checkbox__box">
    <input
      bind:this={inputEl}
      class="checkbox__input"
      type="checkbox"
      bind:checked
      {disabled}
      {...restProps}
    />
    <svg class="checkbox__icon" viewBox="0 0 16 16" aria-hidden="true">
      {#if indeterminate}
        <path d="M4 8h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" />
      {:else}
        <path
          d="M3.5 8.5l3 3 6-6.5"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          fill="none"
        />
      {/if}
    </svg>
  </span>
  {#if label || description}
    <span class="checkbox__text">
      {#if label}<span class="checkbox__label">{label}</span>{/if}
      {#if description}<span class="checkbox__description">{description}</span>{/if}
    </span>
  {/if}
</label>

<style>
  .checkbox {
    display: inline-flex;
    align-items: flex-start;
    gap: var(--space-2);
    cursor: pointer;
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    color: var(--color-text-high);
  }

  /* Disabled dims the whole control (box included), not just the text —
     otherwise a checked-disabled box reads as a stray accent square. */
  .checkbox--disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .checkbox__box {
    position: relative;
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.125rem;
    height: 1.125rem;
    margin-top: 0.0625rem;
    border-radius: var(--radius-xs);
    border: var(--border-width) solid var(--control-border);
    background: var(--control-bg);
    transition:
      background var(--duration-fast) var(--ease-out),
      border-color var(--duration-fast) var(--ease-out);
  }

  .checkbox[data-size="sm"] .checkbox__box {
    width: 0.9375rem;
    height: 0.9375rem;
  }

  .checkbox__input {
    position: absolute;
    inset: 0;
    margin: 0;
    opacity: 0;
    cursor: inherit;
  }

  .checkbox__icon {
    width: 0.75rem;
    height: 0.75rem;
    color: var(--color-on-accent);
    opacity: 0;
    transition: opacity var(--duration-fast) var(--ease-out);
  }

  .checkbox__box:has(.checkbox__input:hover):not(:has(.checkbox__input:disabled)) {
    border-color: var(--color-border-strong);
  }

  .checkbox__box:has(.checkbox__input:checked),
  .checkbox__box:has(.checkbox__input:indeterminate) {
    background: var(--color-accent);
    border-color: var(--color-accent);
  }

  .checkbox__input:checked ~ .checkbox__icon,
  .checkbox__input:indeterminate ~ .checkbox__icon {
    opacity: 1;
  }

  .checkbox__box:has(.checkbox__input:focus-visible) {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  .checkbox__input:disabled {
    cursor: not-allowed;
  }

  .checkbox__text {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .checkbox__description {
    font-size: var(--text-xs);
    color: var(--color-text-low);
  }

  @media (prefers-reduced-motion: reduce) {
    .checkbox__box,
    .checkbox__icon {
      transition: none;
    }
  }
</style>
