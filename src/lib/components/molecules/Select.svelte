<!-- src/lib/components/molecules/Select.svelte -->
<!-- A custom listbox select (not a native <select>): trigger + popup listbox,
     full keyboard support (arrows, Home/End, Enter/Space, Escape, type-ahead). -->

<script lang="ts">
  type Option = {
    value: string;
    label: string;
    description?: string;
    disabled?: boolean;
  };

  type Size = "sm" | "md" | "lg";

  type Props = {
    value?: string;
    options: Option[];
    placeholder?: string;
    size?: Size;
    invalid?: boolean;
    disabled?: boolean;
    onchange?: (value: string) => void;
  };

  let {
    value = $bindable(undefined),
    options,
    placeholder = "Select…",
    size = "md",
    invalid,
    disabled,
    onchange,
  }: Props = $props();

  const uid = $props.id();
  const listboxId = `${uid}-listbox`;

  let open = $state(false);
  let activeIndex = $state(-1);
  let triggerEl: HTMLButtonElement | undefined = $state();
  let listboxEl: HTMLUListElement | undefined = $state();

  let typeahead = "";
  let typeaheadTimer: ReturnType<typeof setTimeout> | undefined;

  let selected = $derived(options.find((o) => o.value === value));

  function firstEnabled(): number {
    const i = options.findIndex((o) => !o.disabled);
    return i === -1 ? 0 : i;
  }

  function lastEnabled(): number {
    for (let i = options.length - 1; i >= 0; i--) if (!options[i].disabled) return i;
    return options.length - 1;
  }

  function step(from: number, dir: 1 | -1): number {
    let i = from;
    do {
      i += dir;
    } while (i >= 0 && i < options.length && options[i].disabled);
    if (i < 0) return firstEnabled();
    if (i >= options.length) return lastEnabled();
    return i;
  }

  function openList() {
    if (disabled) return;
    open = true;
    const current = value ? options.findIndex((o) => o.value === value) : -1;
    activeIndex = current !== -1 && !options[current].disabled ? current : firstEnabled();
  }

  function closeList() {
    open = false;
  }

  function toggleOpen() {
    if (open) closeList();
    else openList();
  }

  function selectActive() {
    const opt = options[activeIndex];
    if (!opt || opt.disabled) return;
    value = opt.value;
    onchange?.(opt.value);
    closeList();
    triggerEl?.focus();
  }

  function selectOption(i: number) {
    if (options[i].disabled) return;
    activeIndex = i;
    selectActive();
  }

  function typeaheadSearch(char: string) {
    if (typeaheadTimer) clearTimeout(typeaheadTimer);
    typeahead += char.toLowerCase();
    typeaheadTimer = setTimeout(() => (typeahead = ""), 1000);

    const n = options.length;
    const startFrom = open ? activeIndex : -1;
    for (let s = 0; s < n; s++) {
      const i = (startFrom + 1 + s) % n;
      if (!options[i].disabled && options[i].label.toLowerCase().startsWith(typeahead)) {
        activeIndex = i;
        if (!open) open = true;
        return;
      }
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (disabled) return;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) openList();
        else activeIndex = step(activeIndex, 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!open) openList();
        else activeIndex = step(activeIndex, -1);
        break;
      case "Home":
        if (open) {
          event.preventDefault();
          activeIndex = firstEnabled();
        }
        break;
      case "End":
        if (open) {
          event.preventDefault();
          activeIndex = lastEnabled();
        }
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (!open) openList();
        else selectActive();
        break;
      case "Escape":
        if (open) {
          event.preventDefault();
          closeList();
        }
        break;
      case "Tab":
        closeList();
        break;
      default:
        if (event.key.length === 1 && /\S/.test(event.key)) {
          typeaheadSearch(event.key);
        }
    }
  }

  $effect(() => {
    if (!open) return;
    function handleOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerEl?.contains(target) || listboxEl?.contains(target)) return;
      closeList();
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  });

  $effect(() => {
    if (open && activeIndex >= 0 && listboxEl) {
      const el = listboxEl.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
      el?.scrollIntoView({ block: "nearest" });
    }
  });
</script>

<div class="select" data-size={size}>
  <button
    bind:this={triggerEl}
    type="button"
    class="select__trigger"
    class:select__trigger--invalid={invalid}
    role="combobox"
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-controls={listboxId}
    aria-activedescendant={open && activeIndex >= 0 ? `${uid}-option-${activeIndex}` : undefined}
    {disabled}
    onclick={toggleOpen}
    onkeydown={handleKeydown}
  >
    <span class="select__value" class:select__value--placeholder={!selected}>
      {selected ? selected.label : placeholder}
    </span>
    <svg
      class="select__chevron"
      class:select__chevron--open={open}
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  </button>

  {#if open}
    <ul bind:this={listboxEl} class="select__popup" role="listbox" id={listboxId} tabindex="-1">
      {#each options as opt, i (opt.value)}
        <!-- svelte-ignore a11y_click_events_have_key_events -- keyboard selection is handled on the
             trigger (arrows + Enter/Space via aria-activedescendant); click here is a mouse convenience. -->
        <li
          id={`${uid}-option-${i}`}
          role="option"
          aria-selected={opt.value === value}
          aria-disabled={opt.disabled || undefined}
          data-index={i}
          class="select__option"
          class:select__option--active={i === activeIndex}
          class:select__option--selected={opt.value === value}
          class:select__option--disabled={opt.disabled}
          onclick={() => selectOption(i)}
          onmouseenter={() => {
            if (!opt.disabled) activeIndex = i;
          }}
        >
          <span class="select__option-label">{opt.label}</span>
          {#if opt.description}
            <span class="select__option-description">{opt.description}</span>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .select {
    position: relative;
    display: inline-block;
    width: 100%;
  }

  .select__trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    width: 100%;
    padding: 0.45rem 0.75rem;
    border-radius: var(--radius-control);
    border: var(--border-width) solid var(--control-border);
    background: var(--control-bg);
    color: var(--color-text-high);
    cursor: pointer;

    font-family: var(--font-ui);
    font-size: 0.875rem;

    transition:
      border-color var(--duration-fast) var(--ease-out),
      background var(--duration-fast) var(--ease-out);
  }

  .select[data-size="sm"] .select__trigger {
    padding: 0.25rem 0.5rem;
    font-size: 0.8125rem;
  }

  .select[data-size="lg"] .select__trigger {
    padding: 0.6rem 0.9rem;
    font-size: 1rem;
  }

  .select__trigger:hover:not(:disabled) {
    border-color: var(--color-border-strong);
    background: var(--control-bg-hover);
  }

  .select__trigger:focus-visible {
    outline: none;
    border-color: var(--control-border-focus);
    box-shadow: 0 0 0 1px var(--control-border-focus);
  }

  .select__trigger:disabled {
    cursor: not-allowed;
    color: var(--color-text-disabled);
  }

  .select__trigger--invalid {
    border-color: var(--color-danger);
  }

  .select__value {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .select__value--placeholder {
    color: var(--color-text-low);
  }

  .select__chevron {
    flex: none;
    color: var(--color-text-low);
    transition: transform var(--duration-fast) var(--ease-out);
  }

  .select__chevron--open {
    transform: rotate(180deg);
  }

  .select__popup {
    position: absolute;
    top: calc(100% + var(--space-1));
    left: 0;
    right: 0;
    z-index: var(--layer-popover);
    margin: 0;
    padding: var(--space-1);
    list-style: none;
    max-height: 14rem;
    overflow: auto;
    border-radius: var(--radius-popup);
    border: var(--border-width) solid var(--color-border);
    background: var(--color-popover);
    backdrop-filter: blur(var(--fx-blur-lg)) saturate(var(--fx-glass-saturation));
    box-shadow: var(--shadow-popup);
  }

  .select__option {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    padding: var(--space-2);
    border-radius: var(--radius-xs);
    cursor: pointer;
    color: var(--color-text-high);
    font-family: var(--font-ui);
    font-size: 0.875rem;
  }

  .select__option-description {
    font-size: var(--text-xs);
    color: var(--color-text-low);
  }

  .select__option--active {
    background: color-mix(in oklab, var(--color-text-high) 8%, transparent);
  }

  .select__option--selected {
    color: var(--color-accent);
  }

  .select__option--selected.select__option--active {
    background: var(--color-accent-soft);
  }

  .select__option--disabled {
    color: var(--color-text-disabled);
    cursor: not-allowed;
  }

  @media (prefers-reduced-motion: reduce) {
    .select__trigger,
    .select__chevron {
      transition: none;
    }
  }
</style>
