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
const CAP = 50;
let seq = 0;
function statusOf(e) {
    if (e.irreversible)
        return "irreversible";
    if (e.done)
        return "undone";
    if (e.expiresAt !== undefined && Date.now() >= e.expiresAt)
        return "expired";
    return "undoable";
}
function reasonFor(e, status) {
    if (status === "irreversible")
        return e.reason ?? "cannot be undone";
    if (status === "expired")
        return "expired";
    if (status === "undone")
        return "already undone";
    return "";
}
function toView(e) {
    const status = statusOf(e);
    return {
        id: e.id,
        label: e.label,
        group: e.group,
        createdAt: e.createdAt,
        expiresAt: e.expiresAt,
        status,
        reason: status === "irreversible" ? (e.reason ?? "cannot be undone") : undefined,
    };
}
function createUndoStack() {
    let entries = $state([]);
    let busy = $state(false);
    function trim() {
        if (entries.length > CAP)
            entries = entries.slice(entries.length - CAP);
    }
    function push(input) {
        seq += 1;
        const entry = {
            id: seq,
            label: input.label,
            group: input.group,
            createdAt: Date.now(),
            expiresAt: input.expiresAt,
            undoFn: input.undo,
            guard: input.guard,
            done: false,
            irreversible: false,
        };
        entries = [...entries, entry];
        trim();
        return entry.id;
    }
    function irreversible(label, reason) {
        seq += 1;
        const entry = {
            id: seq,
            label,
            createdAt: Date.now(),
            done: false,
            irreversible: true,
            reason,
        };
        entries = [...entries, entry];
        trim();
        return entry.id;
    }
    function list() {
        return entries.map(toView);
    }
    /** The nearest undoable entry strictly before `index`, if any. */
    function nextUndoableBefore(index) {
        for (let i = index - 1; i >= 0; i--) {
            if (statusOf(entries[i]) === "undoable")
                return entries[i];
        }
        return undefined;
    }
    async function undo(id) {
        if (busy) {
            return { ok: false, reason: "an undo is already in progress" };
        }
        if (entries.length === 0) {
            return { ok: false, reason: "nothing to undo" };
        }
        const index = id === undefined ? entries.length - 1 : entries.findIndex((e) => e.id === id);
        if (index === -1) {
            return { ok: false, reason: `no undo entry #${id}` };
        }
        const entry = entries[index];
        const status = statusOf(entry);
        if (status !== "undoable") {
            const next = nextUndoableBefore(index);
            return {
                ok: false,
                reason: reasonFor(entry, status),
                entry: toView(entry),
                nextUndoableId: next?.id,
            };
        }
        busy = true;
        try {
            if (entry.guard) {
                const refusal = await entry.guard();
                if (refusal) {
                    return { ok: false, reason: refusal, entry: toView(entry) };
                }
            }
            await entry.undoFn?.();
            entries = entries.map((e) => (e.id === entry.id ? { ...e, done: true } : e));
            return { ok: true, entry: toView(entries.find((e) => e.id === entry.id)) };
        }
        catch (err) {
            return { ok: false, reason: err instanceof Error ? err.message : String(err), entry: toView(entry) };
        }
        finally {
            busy = false;
        }
    }
    /** Drop every entry (e.g. on logout, or between tests). Does not run any inverse. */
    function clear() {
        entries = [];
    }
    return {
        get entries() {
            return list();
        },
        get busy() {
            return busy;
        },
        push,
        irreversible,
        list,
        undo,
        clear,
    };
}
export const undoStack = createUndoStack();
/**
 * `{ text: "undo", tone: "muted", command: "undo <id>" }` — append it to an
 * output line (`ctx.print(["…", " ", undoSpan(id)], "output")`) so the line
 * carries a clickable `[undo]`. Clicking it runs `undo <id>` through the
 * dispatcher exactly as if typed (and echoed in history); it is keyboard
 * accessible and does not double up the terminal's click-to-focus handling.
 */
export function undoSpan(id) {
    return { text: "undo", tone: "muted", command: `undo ${id}` };
}
