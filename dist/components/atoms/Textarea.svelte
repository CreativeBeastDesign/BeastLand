<!-- src/lib/components/atoms/Textarea.svelte -->

<script lang="ts">
  import type { HTMLTextareaAttributes } from "svelte/elements";

  type Size = "sm" | "md" | "lg";
  const maxRows = 6;

  type Props = Omit<HTMLTextareaAttributes, "size"> & {
    value?: string;
    size?: Size;
    invalid?: boolean;
    autoResize?: boolean;
    mono?: boolean;
  };

  let {
    value = $bindable(""),
    size = "md",
    invalid,
    autoResize,
    mono,
    ...restProps
  }: Props = $props();

  let textareaEl: HTMLTextAreaElement | undefined = $state();

  function resize() {
    if (!textareaEl) return;
    textareaEl.style.height = "auto";
    const lineHeight = parseFloat(getComputedStyle(textareaEl).lineHeight) || 20;
    const maxHeight = lineHeight * maxRows;
    const next = Math.min(textareaEl.scrollHeight, maxHeight);
    textareaEl.style.height = `${next}px`;
    textareaEl.style.overflowY = textareaEl.scrollHeight > maxHeight ? "auto" : "hidden";
  }

  $effect(() => {
    if (!autoResize) return;
    void value; // track value changes so typed input re-triggers the resize
    resize();
  });
</script>

<textarea
  bind:this={textareaEl}
  bind:value
  class="textarea"
  class:textarea--invalid={invalid}
  class:textarea--mono={mono}
  class:textarea--auto-resize={autoResize}
  data-size={size}
  {...restProps}
></textarea>

<style>
  .textarea {
    display: block;
    width: 100%;
    min-height: 4.5rem;
    padding: 0.45rem 0.75rem;
    border-radius: var(--radius-control);
    border: var(--border-width) solid var(--color-border);
    background: var(--color-surface-1);
    color: var(--color-text-high);
    box-sizing: border-box;
    resize: vertical;

    font-family: var(--font-ui);
    font-size: 0.875rem;
    line-height: 1.5;

    transition:
      border-color var(--duration-fast) var(--ease-out),
      box-shadow var(--duration-fast) var(--ease-out),
      background var(--duration-fast) var(--ease-out);
  }

  .textarea::placeholder {
    color: var(--color-text-low);
  }

  .textarea:hover {
    border-color: var(--color-border-strong);
  }

  .textarea:focus-visible {
    outline: none;
    border-color: var(--color-border-active);
    box-shadow: 0 0 0 1px var(--color-border-active);
  }

  .textarea--invalid {
    border-color: var(--color-danger);
  }

  .textarea--mono {
    font-family: var(--font-mono);
  }

  .textarea--auto-resize {
    resize: none;
    overflow: hidden;
  }

  .textarea[data-size="sm"] {
    padding: 0.25rem 0.5rem;
    font-size: 0.8125rem;
  }

  .textarea[data-size="lg"] {
    padding: 0.6rem 0.9rem;
    font-size: 1rem;
  }
</style>
