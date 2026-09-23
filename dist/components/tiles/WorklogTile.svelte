<!-- src/lib/components/tiles/WorklogTile.svelte -->
<!-- Tile body for the `worklog` kind. There is only ever one worklog tile, so
     `contentId` (the virtual `worklog:timeline` id) carries no information —
     it exists only to satisfy the tile-component contract every kind shares. -->

<script lang="ts">
  import { worklog, clock } from "../../worklog/store.svelte.js";
  import { kinds } from "../../tiling/kinds.svelte.js";
  import { entryMinutes, formatDuration, dayKey, timeOfDay, type WorkEntry } from "../../worklog/types.js";
  import { formatDate, itemLabels } from "../../data/format.js";
  import { data } from "../../data/store.svelte.js";
    import { shell } from "../../shell/state.svelte.js";
  import ShortId from "../atoms/ShortId.svelte";

  let { contentId: _contentId }: { contentId: string } = $props();

  let running = $derived(worklog.running);
  let runningMinutes = $derived(running ? entryMinutes(running, clock.now) : 0);
  let days = $derived(worklog.byDay());

  let todayKey = $derived(dayKey(new Date(clock.now).toISOString()));
  let yesterdayKey = $derived(dayKey(new Date(clock.now - 86400000).toISOString()));

  function dayHeading(day: string): string {
    if (day === todayKey) return "Today";
    if (day === yesterdayKey) return "Yesterday";
    return formatDate(`${day}T00:00:00`);
  }

  function itemLabelFor(entry: WorkEntry): string | null {
    if (!entry.documentId || entry.itemIndex === null) return null;
    const doc = data.getDocument(entry.documentId);
    if (!doc) return null;
    return itemLabels(doc.items)[entry.itemIndex - 1] ?? null;
  }

  function timeRange(entry: WorkEntry): string {
    const start = timeOfDay(entry.startedAt);
    const end = entry.stoppedAt ? timeOfDay(entry.stoppedAt) : "now";
    return `${start}–${end}`;
  }

  function activateDoc(event: MouseEvent, documentId: string) {
    event.stopPropagation(); // don't also select the tile
    const command = `#${kinds.shortIdOf(documentId).short}`;
    if (event.shiftKey) {
      shell.insert(command);
      return;
    }
    shell.run(command);
  }
</script>

<div class="worklog-tile">
  <div class="worklog-tile__running">
    {#if running}
      {@const current = running}
      <span class="worklog-tile__dot" aria-hidden="true"></span>
      <span class="worklog-tile__running-note">{current.note || "(no note)"}</span>
      {#if current.documentId}
        {@const docId = current.documentId}
        {@const label = itemLabelFor(current)}
        <button
          type="button"
          class="worklog-tile__doc-link"
          title={docId}
          onclick={(event) => activateDoc(event, docId)}
        >
          <ShortId id={docId} all={kinds.allIds} />
          {#if label}<span class="worklog-tile__item-idx">·{label}</span>{/if}
        </button>
      {/if}
      <span class="worklog-tile__running-duration">{formatDuration(runningMinutes)}</span>
    {:else}
      <span class="worklog-tile__idle">nothing running</span>
    {/if}
  </div>

  <div class="worklog-tile__timeline">
    {#if days.length === 0}
      <p class="worklog-tile__empty">(no entries)</p>
    {/if}
    {#each days as group (group.day)}
      <section class="worklog-tile__day">
        <div class="worklog-tile__day-heading">
          <span>{dayHeading(group.day)}</span>
          <span class="worklog-tile__day-total">{formatDuration(group.minutes)}</span>
        </div>
        {#each group.entries as entry (entry.id)}
          {@const docId = entry.documentId}
          {@const label = itemLabelFor(entry)}
          <div class="worklog-tile__row" class:worklog-tile__row--running={entry.stoppedAt === null}>
            <span class="worklog-tile__time">{timeRange(entry)}</span>
            <span class="worklog-tile__note">{entry.note || "(no note)"}</span>
            {#if docId}
              <button
                type="button"
                class="worklog-tile__doc-link"
                title={docId}
                onclick={(event) => activateDoc(event, docId)}
              >
                <ShortId id={docId} all={kinds.allIds} />
                {#if label}<span class="worklog-tile__item-idx">·{label}</span>{/if}
              </button>
            {/if}
            <span class="worklog-tile__duration">{formatDuration(entryMinutes(entry, clock.now))}</span>
          </div>
        {/each}
      </section>
    {/each}
  </div>
</div>

<style>
  .worklog-tile {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    color: var(--color-text-med);
  }

  /* Running-entry header -------------------------------------------------- */

  .worklog-tile__running {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
    padding-bottom: var(--space-3);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .worklog-tile__dot {
    flex: none;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: var(--color-secondary);
    animation: worklog-pulse 1.6s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .worklog-tile__dot {
      animation: none;
    }
  }

  @keyframes worklog-pulse {
    0%,
    100% {
      opacity: 1;
      box-shadow: 0 0 0 0 oklch(from var(--color-secondary) l c h / 0.5);
    }
    50% {
      opacity: 0.6;
      box-shadow: 0 0 0 0.25rem oklch(from var(--color-secondary) l c h / 0);
    }
  }

  .worklog-tile__running-note {
    flex: 1 1 auto;
    min-width: 0;
    font-family: var(--font-ui);
    color: var(--color-text-high);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .worklog-tile__running-duration {
    flex: none;
    font-variant-numeric: tabular-nums;
    font-feature-settings: var(--font-feature-numeric);
    color: var(--color-text-high);
    font-weight: var(--font-weight-semibold);
  }

  .worklog-tile__idle {
    color: var(--color-text-low);
  }

  /* Doc link ---------------------------------------------------------------
     Styled like RecordView's clickable ids: low-chroma link, full colour on
     hover/focus. */
  .worklog-tile__doc-link {
    all: unset;
    flex: none;
    display: inline-flex;
    align-items: baseline;
    cursor: pointer;
  }

  .worklog-tile__doc-link:hover,
  .worklog-tile__doc-link:focus-visible {
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 0.15em;
  }

  .worklog-tile__item-idx {
    color: var(--color-text-low);
    font-variant-numeric: tabular-nums;
    font-feature-settings: var(--font-feature-numeric);
  }

  /* Timeline ---------------------------------------------------------------- */

  .worklog-tile__timeline {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .worklog-tile__empty {
    margin: 0;
    color: var(--color-text-low);
  }

  .worklog-tile__day {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .worklog-tile__day-heading {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-low);
    padding-bottom: var(--space-1);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .worklog-tile__day-total {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-feature-settings: var(--font-feature-numeric);
    text-transform: none;
    letter-spacing: normal;
  }

  /* Slim (default): time + duration on one line, note below, doc link after. */
  .worklog-tile__row {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-1) 0;
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .worklog-tile__row:last-child {
    border-bottom: none;
  }

  .worklog-tile__row--running {
    color: var(--color-text-high);
  }

  .worklog-tile__time,
  .worklog-tile__duration {
    font-variant-numeric: tabular-nums;
    font-feature-settings: var(--font-feature-numeric);
    color: var(--color-text-low);
  }

  .worklog-tile__note {
    font-family: var(--font-ui);
    color: var(--color-text-med);
  }

  .worklog-tile__row--running .worklog-tile__note {
    color: var(--color-text-high);
  }

  /* Wide: single row — time, note (fills), doc link, duration (right-aligned). */
  @container tile (min-width: 22rem) {
    .worklog-tile__row {
      flex-direction: row;
      align-items: baseline;
      gap: var(--space-3);
    }

    .worklog-tile__time {
      flex: none;
      width: 9ch;
    }

    .worklog-tile__note {
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .worklog-tile__duration {
      flex: none;
      width: 5ch;
      text-align: right;
    }
  }
</style>
