/**
 * Work log store
 *
 * In-memory `WorkEntry` list, persisted through storage (`beastland:worklog`)
 * the same way `$lib/data/store.svelte.ts` persists customers/documents.
 * Enforces the "exactly one running entry" invariant: `start` and `add`
 * (when given no `stoppedAt`) stop whatever is currently running first.
 *
 * Also exports `clock`, a tiny ticking rune store: reading `clock.now`
 * lazily starts a 30s interval, so any `$derived` reading it (running-entry
 * durations) re-renders without a manual timer per component.
 */
import type { WorkEntry } from "./types.js";
export declare const worklog: {
    readonly entries: readonly WorkEntry[];
    readonly running: WorkEntry | null;
    start: (input: {
        documentId?: string | null;
        itemIndex?: number | null;
        projectId?: string | null;
        note?: string;
    }) => WorkEntry;
    stop: () => WorkEntry | null;
    add: (input: {
        documentId?: string | null;
        itemIndex?: number | null;
        projectId?: string | null;
        note?: string;
        startedAt: string;
        stoppedAt: string | null;
    }) => WorkEntry;
    remove: (id: string) => boolean;
    update: (id: string, patch: Partial<WorkEntry>) => WorkEntry | undefined;
    byDay: (range?: {
        from: string;
        to: string;
    }) => {
        day: string;
        entries: WorkEntry[];
        minutes: number;
    }[];
    minutesFor: (documentId: string, itemIndex?: number) => number;
    reset: () => void;
};
/** Ticks every 30s once read; lets `$derived` running-duration values re-render. */
export declare const clock: {
    readonly now: number;
};
