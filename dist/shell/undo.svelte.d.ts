/**
 * Undo stack
 *
 * A generic, in-memory undo facility the shell exposes and any consumer
 * (built-in layout commands, an application slice) can feed. It knows
 * nothing about tiles, records or any other domain — it stores closures.
 *
 * `push` records an inverse (`undo`) plus optional `guard` (re-checked right
 * before the inverse runs — refuse with a reason if the world moved on,
 * e.g. "changed since by Anna") and `expiresAt` (a hard cutoff after which
 * the entry refuses on its own). `irreversible` records a non-undoable
 * action so `undo -l` can show it and `undo` can explain why it won't touch
 * it, instead of silently reaching past it to something older.
 *
 * Plain `undo()` (no id) always targets the single most recent entry,
 * undoable or not: if that entry is irreversible, expired or already
 * undone, it reports why and names the next undoable entry's id (`undo
 * <id>`) rather than reaching past it implicitly. Only an explicit `undo
 * <id>` ever undoes something other than the most recent entry.
 *
 * Entries are marked done after a successful undo, not removed — `list()`
 * still shows them (as `"undone"`). The stack is capped at `CAP` entries
 * (oldest dropped first). Everything lives in memory: a reload clears it,
 * same as the workspace's own in-flight state before it's persisted.
 *
 * Concurrency: one undo runs at a time; a second call while one is in
 * flight is refused outright. A failing inverse leaves its entry undoable
 * and reports the thrown error.
 */
export type UndoStatus = "undoable" | "undone" | "expired" | "irreversible";
export type UndoPushInput = {
    label: string;
    undo: () => void | Promise<void>;
    /** Re-checked right before `undo` runs; a non-null return refuses with that reason. */
    guard?: () => string | null | Promise<string | null>;
    /** ms epoch; past this, the entry reports `"expired"` and refuses. */
    expiresAt?: number;
    /** Free-form grouping, e.g. `"layout"` — not interpreted by the stack itself. */
    group?: string;
};
/** Read-only snapshot of one entry, as `list()` and `undo()` report it. */
export type UndoEntry = {
    id: number;
    label: string;
    group?: string;
    createdAt: number;
    expiresAt?: number;
    status: UndoStatus;
    /** Set when `status` is `"irreversible"` — why it can't be undone. */
    reason?: string;
};
export type UndoOutcome = {
    ok: true;
    entry: UndoEntry;
} | {
    ok: false;
    reason: string;
    entry?: UndoEntry;
    nextUndoableId?: number;
};
declare function createUndoStack(): {
    readonly entries: UndoEntry[];
    readonly busy: boolean;
    push: (input: UndoPushInput) => number;
    irreversible: (label: string, reason: string) => number;
    list: () => UndoEntry[];
    undo: (id?: number) => Promise<UndoOutcome>;
    clear: () => void;
};
export type UndoStack = ReturnType<typeof createUndoStack>;
export declare const undoStack: UndoStack;
/**
 * `{ text: "undo", tone: "muted", command: "undo <id>" }` — append it to an
 * output line (`ctx.print(["…", " ", undoSpan(id)], "output")`) so the line
 * carries a clickable `[undo]`. Clicking it runs `undo <id>` through the
 * dispatcher exactly as if typed (and echoed in history); it is keyboard
 * accessible and does not double up the terminal's click-to-focus handling.
 */
export declare function undoSpan(id: number): import("./protocol.js").Span;
export {};
