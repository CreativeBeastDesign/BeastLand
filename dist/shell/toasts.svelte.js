/**
 * Toast store
 *
 * A single rune-backed store for transient chrome notifications ("toasts"),
 * shared between whatever pushes them (commands, async work, showcase demos)
 * and `ToastStack`, which renders `toasts.items`.
 *
 * Import it as `import { toasts, notify } from "./toasts.svelte";`.
 */
const MAX_VISIBLE = 5;
const DEFAULT_TIMEOUT = 5000;
let seq = 0;
function makeId() {
    seq += 1;
    return `toast-${seq}-${Date.now().toString(36)}`;
}
function createToasts() {
    let items = $state([]);
    // Timer bookkeeping lives outside reactive state — it's not UI, and mixing
    // setTimeout handles into $state would just cause needless reactivity.
    const timers = new Map();
    const remaining = new Map(); // ms left as of `startedAt`
    const startedAt = new Map(); // when the current run began
    function clearTimer(id) {
        const handle = timers.get(id);
        if (handle !== undefined) {
            clearTimeout(handle);
            timers.delete(id);
        }
    }
    function scheduleTimer(id, ms) {
        clearTimer(id);
        if (ms <= 0)
            return; // sticky — never auto-dismisses
        startedAt.set(id, Date.now());
        timers.set(id, setTimeout(() => dismiss(id), ms));
    }
    function dismiss(id) {
        clearTimer(id);
        remaining.delete(id);
        startedAt.delete(id);
        items = items.filter((toast) => toast.id !== id);
    }
    function push(input) {
        const tone = input.tone ?? "info";
        const timeout = input.timeout ?? (tone === "danger" ? 0 : DEFAULT_TIMEOUT);
        const toast = {
            id: makeId(),
            title: input.title,
            message: input.message,
            tone,
            timeout,
            createdAt: Date.now(),
            action: input.action,
        };
        items = [...items, toast];
        remaining.set(toast.id, timeout);
        scheduleTimer(toast.id, timeout);
        if (items.length > MAX_VISIBLE) {
            for (const stale of items.slice(0, items.length - MAX_VISIBLE)) {
                dismiss(stale.id);
            }
        }
        return toast.id;
    }
    /** Pause a toast's auto-dismiss timer, remembering how much time is left. */
    function pause(id) {
        const handle = timers.get(id);
        if (handle === undefined)
            return; // sticky, or already paused
        const started = startedAt.get(id) ?? Date.now();
        const left = remaining.get(id) ?? 0;
        remaining.set(id, Math.max(0, left - (Date.now() - started)));
        clearTimer(id);
    }
    /** Resume a toast's auto-dismiss timer from wherever `pause` left it. */
    function resume(id) {
        const left = remaining.get(id);
        if (left === undefined || left <= 0)
            return;
        scheduleTimer(id, left);
    }
    function clear() {
        for (const id of timers.keys())
            clearTimer(id);
        remaining.clear();
        startedAt.clear();
        items = [];
    }
    return {
        get items() {
            return items;
        },
        push,
        dismiss,
        pause,
        resume,
        clear,
    };
}
export const toasts = createToasts();
/** Convenience alias for `toasts.push`. */
export function notify(input) {
    return toasts.push(input);
}
