<!-- src/lib/components/molecules/DatePicker.svelte -->
<!-- A trigger field (typeable, dd.mm.yyyy) + calendar popover. No date
     library: all math goes through local-time `Date` constructors so it
     never drifts across a timezone boundary, and ISO strings are built by
     hand. -->

<script lang="ts">
  import { tick } from "svelte";

  type YMD = { y: number; m: number; d: number };
  type Size = "sm" | "md";

  type Props = {
    value?: string;
    min?: string;
    max?: string;
    placeholder?: string;
    size?: Size;
    invalid?: boolean;
    disabled?: boolean;
    locale?: string;
    weekStart?: 0 | 1;
    onchange?: (iso: string) => void;
  };

  let {
    value = $bindable(""),
    min,
    max,
    placeholder = "dd.mm.yyyy",
    size = "md",
    invalid,
    disabled,
    locale = "de-CH",
    weekStart = 1,
    onchange,
  }: Props = $props();

  const uid = $props.id();
  const popoverId = `${uid}-popover`;
  const headerId = `${uid}-month`;

  function pad2(n: number): string {
    return n.toString().padStart(2, "0");
  }
  function toISO(ymd: YMD): string {
    return `${ymd.y}-${pad2(ymd.m + 1)}-${pad2(ymd.d)}`;
  }
  function toDisplay(ymd: YMD): string {
    return `${pad2(ymd.d)}.${pad2(ymd.m + 1)}.${ymd.y}`;
  }
  function isValidYMD(y: number, m: number, d: number): boolean {
    const dt = new Date(y, m, d);
    return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d;
  }
  function parseISO(iso: string): YMD | null {
    const mt = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!mt) return null;
    const y = +mt[1], m = +mt[2] - 1, d = +mt[3];
    return isValidYMD(y, m, d) ? { y, m, d } : null;
  }
  function parseDisplay(text: string): YMD | null {
    const mt = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(text.trim());
    if (!mt) return null;
    const d = +mt[1], m = +mt[2] - 1, y = +mt[3];
    return isValidYMD(y, m, d) ? { y, m, d } : null;
  }
  function todayYMD(): YMD {
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() };
  }
  function sameYMD(a: YMD, b: YMD): boolean {
    return a.y === b.y && a.m === b.m && a.d === b.d;
  }
  function compareYMD(a: YMD, b: YMD): number {
    return a.y !== b.y ? a.y - b.y : a.m !== b.m ? a.m - b.m : a.d - b.d;
  }
  function addDays(ymd: YMD, delta: number): YMD {
    const dt = new Date(ymd.y, ymd.m, ymd.d + delta);
    return { y: dt.getFullYear(), m: dt.getMonth(), d: dt.getDate() };
  }
  function addMonths(ymd: YMD, delta: number): YMD {
    const dt = new Date(ymd.y, ymd.m + delta, 1);
    const daysInTarget = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
    return { y: dt.getFullYear(), m: dt.getMonth(), d: Math.min(ymd.d, daysInTarget) };
  }
  function weekdayIndex(ymd: YMD): number {
    const dow = new Date(ymd.y, ymd.m, ymd.d).getDay();
    return (dow - weekStart + 7) % 7;
  }
  function buildGrid(viewYear: number, viewMonth: number): YMD[] {
    const offset = weekdayIndex({ y: viewYear, m: viewMonth, d: 1 });
    const start = new Date(viewYear, viewMonth, 1 - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const dt = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      return { y: dt.getFullYear(), m: dt.getMonth(), d: dt.getDate() };
    });
  }
  function weekdayLabels(): string[] {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
    // 2023-01-01 is a Sunday; format Sun..Sat then rotate to `weekStart`.
    const sunFirst = Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2023, 0, 1 + i)).slice(0, 2));
    return [...sunFirst.slice(weekStart), ...sunFirst.slice(0, weekStart)];
  }

  const today = todayYMD();

  let open = $state(false);
  let inputText = $state("");
  let focused = $state<YMD>(today);
  let viewYear = $state(today.y);
  let viewMonth = $state(today.m);

  let rootEl: HTMLDivElement | undefined = $state();
  let popoverEl: HTMLDivElement | undefined = $state();
  let fieldEl: HTMLInputElement | undefined = $state();

  const selected = $derived(value ? parseISO(value) : null);
  const minYMD = $derived(min ? parseISO(min) : null);
  const maxYMD = $derived(max ? parseISO(max) : null);
  const gridDays = $derived(buildGrid(viewYear, viewMonth));
  const gridRows = $derived(Array.from({ length: 6 }, (_, i) => gridDays.slice(i * 7, i * 7 + 7)));
  const weekdays = $derived(weekdayLabels());
  const headerLabel = $derived(
    new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
      new Date(viewYear, viewMonth, 1),
    ),
  );

  $effect(() => {
    const parsed = value ? parseISO(value) : null;
    inputText = parsed ? toDisplay(parsed) : "";
    if (parsed) {
      viewYear = parsed.y;
      viewMonth = parsed.m;
    }
  });

  function isDayDisabled(ymd: YMD): boolean {
    if (minYMD && compareYMD(ymd, minYMD) < 0) return true;
    if (maxYMD && compareYMD(ymd, maxYMD) > 0) return true;
    return false;
  }

  function focusGridCell(ymd: YMD) {
    popoverEl?.querySelector<HTMLButtonElement>(`[data-date="${toISO(ymd)}"]`)?.focus();
  }

  function openPopover() {
    if (disabled) return;
    const base = selected ?? focused ?? today;
    focused = base;
    viewYear = base.y;
    viewMonth = base.m;
    open = true;
    tick().then(() => focusGridCell(base));
  }

  function closePopover(returnFocus = true) {
    open = false;
    if (returnFocus) fieldEl?.focus();
  }

  function toggleOpen() {
    if (open) closePopover(false);
    else openPopover();
  }

  function commitSelection(ymd: YMD) {
    if (isDayDisabled(ymd)) return;
    const iso = toISO(ymd);
    value = iso;
    onchange?.(iso);
    closePopover();
  }

  function moveFocus(step: (ymd: YMD) => YMD) {
    const next = step(focused);
    focused = next;
    viewYear = next.y;
    viewMonth = next.m;
    tick().then(() => focusGridCell(next));
  }

  function prevMonth() {
    const anchor = addMonths({ ...focused, d: 1 }, -1);
    viewYear = anchor.y;
    viewMonth = anchor.m;
  }
  function nextMonth() {
    const anchor = addMonths({ ...focused, d: 1 }, 1);
    viewYear = anchor.y;
    viewMonth = anchor.m;
  }

  function handleGridKeydown(event: KeyboardEvent) {
    switch (event.key) {
      case "ArrowLeft": event.preventDefault(); moveFocus((f) => addDays(f, -1)); break;
      case "ArrowRight": event.preventDefault(); moveFocus((f) => addDays(f, 1)); break;
      case "ArrowUp": event.preventDefault(); moveFocus((f) => addDays(f, -7)); break;
      case "ArrowDown": event.preventDefault(); moveFocus((f) => addDays(f, 7)); break;
      case "PageUp": event.preventDefault(); moveFocus((f) => addMonths(f, -1)); break;
      case "PageDown": event.preventDefault(); moveFocus((f) => addMonths(f, 1)); break;
      case "Home": event.preventDefault(); moveFocus((f) => addDays(f, -weekdayIndex(f))); break;
      case "End": event.preventDefault(); moveFocus((f) => addDays(f, 6 - weekdayIndex(f))); break;
      case "Enter":
      case " ":
        event.preventDefault();
        commitSelection(focused);
        break;
      case "Escape":
        event.preventDefault();
        closePopover();
        break;
    }
  }

  function commitFieldText() {
    const trimmed = inputText.trim();
    if (trimmed === "") {
      if (value !== "") {
        value = "";
        onchange?.("");
      }
      return;
    }
    const parsed = parseDisplay(trimmed);
    if (parsed && !isDayDisabled(parsed)) {
      const iso = toISO(parsed);
      if (iso !== value) {
        value = iso;
        onchange?.(iso);
      } else {
        inputText = toDisplay(parsed);
      }
    } else {
      const current = value ? parseISO(value) : null;
      inputText = current ? toDisplay(current) : "";
    }
  }

  function handleFieldKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      commitFieldText();
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      closePopover(false);
    } else if (event.key === "ArrowDown" && !open) {
      event.preventDefault();
      openPopover();
    }
  }

  $effect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (rootEl && !rootEl.contains(e.target as Node)) open = false;
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  });
</script>

<div class="date-picker" data-size={size} bind:this={rootEl}>
  <div class="date-picker__trigger" class:date-picker__trigger--invalid={invalid}>
    <input
      bind:this={fieldEl}
      class="date-picker__field"
      type="text"
      inputmode="numeric"
      autocomplete="off"
      {placeholder}
      {disabled}
      value={inputText}
      role="combobox"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={popoverId}
      oninput={(e) => (inputText = e.currentTarget.value)}
      onkeydown={handleFieldKeydown}
      onblur={commitFieldText}
    />
    <button
      type="button"
      class="date-picker__toggle"
      aria-label={open ? "Close calendar" : "Open calendar"}
      {disabled}
      onclick={toggleOpen}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
    </button>
  </div>

  {#if open}
    <div bind:this={popoverEl} id={popoverId} class="date-picker__popover motion-pop-in" role="dialog" aria-label="Choose date">
      <div class="date-picker__header">
        <button type="button" class="date-picker__nav" aria-label="Previous month" onclick={prevMonth}>‹</button>
        <span class="date-picker__month" id={headerId}>{headerLabel}</span>
        <button type="button" class="date-picker__nav" aria-label="Next month" onclick={nextMonth}>›</button>
      </div>

      <div class="date-picker__weekdays" aria-hidden="true">
        {#each weekdays as wd, i (i)}
          <span class="date-picker__weekday">{wd}</span>
        {/each}
      </div>

      <div class="date-picker__grid" role="grid" tabindex="-1" aria-labelledby={headerId} onkeydown={handleGridKeydown}>
        {#each gridRows as row, ri (ri)}
          <div class="date-picker__row" role="row">
            {#each row as day (toISO(day))}
              <button
                type="button"
                role="gridcell"
                class="date-picker__day"
                class:date-picker__day--out={day.m !== viewMonth}
                class:date-picker__day--today={sameYMD(day, today)}
                class:date-picker__day--selected={selected ? sameYMD(day, selected) : false}
                data-date={toISO(day)}
                tabindex={sameYMD(day, focused) ? 0 : -1}
                aria-selected={selected ? sameYMD(day, selected) : false}
                disabled={isDayDisabled(day)}
                onclick={() => commitSelection(day)}
                onfocus={() => (focused = day)}
              >
                {day.d}
              </button>
            {/each}
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .date-picker {
    position: relative;
    display: inline-block;
    width: 100%;
    font-family: var(--font-ui);
  }

  .date-picker__trigger {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding-right: var(--space-1);
    border-radius: var(--radius-control);
    border: var(--border-width) solid var(--color-border);
    background: var(--color-surface-1);
    transition: border-color var(--duration-fast) var(--ease-out);
  }

  .date-picker__trigger:focus-within {
    border-color: var(--color-border-active);
    box-shadow: 0 0 0 1px var(--color-border-active);
  }

  .date-picker__trigger--invalid {
    border-color: var(--color-danger);
  }

  .date-picker__field {
    flex: 1;
    min-width: 0;
    padding: 0.45rem 0.75rem;
    border: none;
    background: transparent;
    color: var(--color-text-high);
    font-family: var(--font-mono);
    font-size: 0.875rem;
  }

  .date-picker__field:focus-visible {
    outline: none;
  }

  .date-picker__field::placeholder {
    color: var(--color-text-low);
  }

  .date-picker__field:disabled {
    color: var(--color-text-disabled);
  }

  .date-picker[data-size="sm"] .date-picker__field {
    padding: 0.25rem 0.5rem;
    font-size: 0.8125rem;
  }

  .date-picker__toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border: none;
    border-radius: var(--radius-xs);
    background: transparent;
    color: var(--color-text-low);
    cursor: pointer;
  }

  .date-picker__toggle:hover:not(:disabled) {
    color: var(--color-text-high);
  }

  .date-picker__toggle:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  .date-picker__popover {
    position: absolute;
    top: calc(100% + var(--space-1));
    left: 0;
    z-index: var(--layer-popover);
    width: 17rem;
    padding: var(--space-3);
    border-radius: var(--radius-popup);
    border: var(--border-width) solid var(--color-border);
    background: var(--color-popover);
    backdrop-filter: blur(var(--fx-blur-lg)) saturate(var(--fx-glass-saturation));
    box-shadow: var(--shadow-popup);
  }

  .date-picker__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-2);
  }

  .date-picker__month {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    color: var(--color-text-high);
  }

  .date-picker__nav {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border: none;
    border-radius: var(--radius-xs);
    background: transparent;
    color: var(--color-text-med);
    font-family: var(--font-mono);
    cursor: pointer;
  }

  .date-picker__nav:hover {
    color: var(--color-text-high);
    background: color-mix(in oklab, var(--color-text-high) 8%, transparent);
  }

  .date-picker__nav:focus-visible,
  .date-picker__day:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  .date-picker__weekdays,
  .date-picker__row {
    display: grid;
    grid-template-columns: repeat(7, 2rem);
    justify-content: space-between;
  }

  .date-picker__weekday {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-low);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
  }

  .date-picker__day {
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border: var(--border-width) solid transparent;
    border-radius: var(--radius-control);
    background: transparent;
    color: var(--color-text-high);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    cursor: pointer;
  }

  .date-picker__day:hover:not(:disabled) {
    background: color-mix(in oklab, var(--color-text-high) 8%, transparent);
  }

  .date-picker__day--out {
    color: var(--color-text-low);
  }

  .date-picker__day--today {
    border-color: var(--color-border-strong);
  }

  .date-picker__day--selected {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: var(--color-on-accent);
  }

  .date-picker__day:disabled {
    color: var(--color-text-disabled);
    cursor: not-allowed;
  }
</style>
