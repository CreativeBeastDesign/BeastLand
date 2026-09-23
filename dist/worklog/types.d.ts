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
export type WorkEntry = {
    /** Random 20-char alnum id, like customer ids. */
    id: `worklog:${string}`;
    /** Full document id (`document:doc_…`), or `null` when untied to a document. */
    documentId: string | null;
    /** 1-based absolute index into that document's items, or `null`. */
    itemIndex: number | null;
    /**
     * Full project id (`project:…`), set directly when an entry is attributed
     * to a project rather than a document. An entry attributed to a document
     * instead inherits that document's project when hours are rolled up (see
     * `$lib/project/store.svelte.ts#minutesOf`) — this field stays `null` then.
     */
    projectId: string | null;
    note: string;
    /** ISO datetime. */
    startedAt: string;
    /** ISO datetime, or `null` while running. */
    stoppedAt: string | null;
    createdAt: string;
    updatedAt: string;
};
/** Minutes elapsed so far, rounded to the nearest minute. `now` drives running entries. */
export declare function entryMinutes(entry: WorkEntry, now?: number): number;
/** `65` → `1h 05m`; `12` → `12m`. */
export declare function formatDuration(minutes: number): string;
/** ISO datetime → `YYYY-MM-DD`, in local time (matches how the tile groups days). */
export declare function dayKey(iso: string): string;
/** `HH:MM` from an ISO datetime, in local time. */
export declare function timeOfDay(iso: string): string;
