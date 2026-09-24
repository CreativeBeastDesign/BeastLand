/**
 * Work log domain types
 *
 * A `WorkEntry` is a span of time spent on (optionally) a document, and
 * within that document, one item. Unlike customers/documents it is not a
 * `#`-addressable record — there is exactly one worklog tile, keyed by the
 * virtual content id `"worklog:timeline"` (see `$lib/worklog/kind.ts`).
 *
 * Exactly one entry may be running (`stoppedAt === null`) at a time; the
 * store enforces that.
 */
/** Minutes elapsed so far, rounded to the nearest minute. `now` drives running entries. */
export function entryMinutes(entry, now = Date.now()) {
    const start = new Date(entry.startedAt).getTime();
    const end = entry.stoppedAt ? new Date(entry.stoppedAt).getTime() : now;
    return Math.max(0, Math.round((end - start) / 60000));
}
/** `65` → `1h 05m`; `12` → `12m`. */
export function formatDuration(minutes) {
    const total = Math.max(0, Math.round(minutes));
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h === 0)
        return `${m}m`;
    return `${h}h ${m.toString().padStart(2, "0")}m`;
}
/** ISO datetime → `YYYY-MM-DD`, in local time (matches how the tile groups days). */
export function dayKey(iso) {
    const d = new Date(iso);
    const yyyy = d.getFullYear();
    const mm = (d.getMonth() + 1).toString().padStart(2, "0");
    const dd = d.getDate().toString().padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}
/** `HH:MM` from an ISO datetime, in local time. */
export function timeOfDay(iso) {
    const d = new Date(iso);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}
