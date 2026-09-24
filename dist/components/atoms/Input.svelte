<!-- src/lib/components/atoms/Input.svelte -->

<script lang="ts">
  import type { HTMLInputAttributes } from "svelte/elements";

  type Size = "sm" | "md" | "lg";

  type Props = Omit<HTMLInputAttributes, "size" | "value"> & {
    size?: Size;
    invalid?: boolean;
    /** Bindable: `<Input bind:value={name} />`. */
    value?: string;
  };

  let { size = "md", invalid, value = $bindable(""), ...restProps }: Props = $props();
</script>

<input
  class="input"
  class:input--invalid={invalid}
  data-size={size}
  bind:value
  {...restProps}
/>

<style>
  .input {
    width: 100%;
    padding: 0.45rem 0.75rem;
    border-radius: var(--radius-control);
    border: var(--border-width) solid var(--color-border);
    background: var(--color-surface-1);
    color: var(--color-text-high);
    box-sizing: border-box;

    font-family: var(--font-ui);
    font-size: 0.875rem;

    transition:
      border-color var(--duration-fast) var(--ease-out),
      box-shadow var(--duration-fast) var(--ease-out),
      background var(--duration-fast) var(--ease-out);
  }

  .input::placeholder {
    color: var(--color-text-low);
  }

  .input:hover {
    border-color: var(--color-border-strong);
  }

  .input:focus-visible {
    outline: 2px solid var(--color-focus, var(--color-accent));
    outline-offset: 2px;
    border-color: var(--color-border-active);
    box-shadow: 0 0 0 1px var(--color-border-active);
  }

  .input--invalid {
    border-color: var(--color-danger);
  }

  .input[data-size="sm"] {
    padding: 0.25rem 0.5rem;
    font-size: 0.8125rem;
  }

  .input[data-size="lg"] {
    padding: 0.6rem 0.9rem;
    font-size: 1rem;
  }
</style>
