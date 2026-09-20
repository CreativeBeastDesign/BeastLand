<!-- src/lib/components/atoms/Tooltip.svelte -->

<script lang="ts">
  import type { Snippet } from "svelte";

  type Placement = "top" | "bottom" | "left" | "right";

  type Props = {
    text: string;
    placement?: Placement;
    delay?: number;
    children: Snippet;
  };

  let { text, placement = "top", delay = 400, children }: Props = $props();

  const uid = $props.id();
  const tooltipId = `tooltip-${uid}`;

  let visible = $state(false);
  let showTimer: ReturnType<typeof setTimeout> | null = null;

  function clearTimer() {
    if (showTimer) {
      clearTimeout(showTimer);
      showTimer = null;
    }
  }

  function scheduleShow() {
    clearTimer();
    showTimer = setTimeout(() => {
      visible = true;
    }, delay);
  }

  function hide() {
    clearTimer();
    visible = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") hide();
  }
</script>

<span
  class="tooltip-wrapper"
  aria-describedby={visible ? tooltipId : undefined}
  {...{}}
  onmouseenter={scheduleShow}
  onmouseleave={hide}
  onfocusin={scheduleShow}
  onfocusout={hide}
  onkeydown={handleKeydown}
>
  {@render children()}
  {#if visible}
    <span
      id={tooltipId}
      class="tooltip motion-fade-in"
      role="tooltip"
      data-placement={placement}
    >
      {text}
    </span>
  {/if}
</span>

<style>
  .tooltip-wrapper {
    position: relative;
    display: inline-block;
  }

  .tooltip {
    position: absolute;
    z-index: var(--layer-tooltip);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-control);
    border: var(--border-width) solid var(--color-border);
    background: var(--color-popover);
    backdrop-filter: blur(var(--fx-blur-lg)) saturate(var(--fx-glass-saturation));
    box-shadow: var(--shadow-popup);

    font-family: var(--font-ui);
    font-size: var(--text-xs);
    color: var(--color-text-high);
    white-space: nowrap;
    pointer-events: none;
  }

  .tooltip::before {
    content: "";
    position: absolute;
    width: 0.5rem;
    height: 0.5rem;
    background: inherit;
    border: inherit;
    border-radius: 2px;
  }

  .tooltip[data-placement="top"] {
    bottom: calc(100% + var(--space-2));
    left: 50%;
    transform: translateX(-50%);
  }
  .tooltip[data-placement="top"]::before {
    bottom: -0.25rem;
    left: 50%;
    transform: translateX(-50%) rotate(45deg);
    border-top: none;
    border-left: none;
  }

  .tooltip[data-placement="bottom"] {
    top: calc(100% + var(--space-2));
    left: 50%;
    transform: translateX(-50%);
  }
  .tooltip[data-placement="bottom"]::before {
    top: -0.25rem;
    left: 50%;
    transform: translateX(-50%) rotate(45deg);
    border-bottom: none;
    border-right: none;
  }

  .tooltip[data-placement="left"] {
    right: calc(100% + var(--space-2));
    top: 50%;
    transform: translateY(-50%);
  }
  .tooltip[data-placement="left"]::before {
    right: -0.25rem;
    top: 50%;
    transform: translateY(-50%) rotate(45deg);
    border-bottom: none;
    border-left: none;
  }

  .tooltip[data-placement="right"] {
    left: calc(100% + var(--space-2));
    top: 50%;
    transform: translateY(-50%);
  }
  .tooltip[data-placement="right"]::before {
    left: -0.25rem;
    top: 50%;
    transform: translateY(-50%) rotate(45deg);
    border-top: none;
    border-right: none;
  }

  @media (hover: none) {
    .tooltip {
      display: none;
    }
  }
</style>
