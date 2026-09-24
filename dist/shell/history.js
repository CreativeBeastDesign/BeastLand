/**
 * Terminal input history
 *
 * The ↑/↓ lines, persisted through the storage seam when the Terminal is
 * given a `historyKey` (`beastland:history:<key>`). Kept out of the
 * component so the key format has one owner and callers that retire a key —
 * `ws rm` on a workspace whose id was the history key — can clear it.
 */
import { storage } from "./storage.js";
/** Most recent lines kept per key. */
export const HISTORY_CAP = 200;
export function historyStorageKey(key) {
    return `beastland:history:${key}`;
}
/** Persisted history for `key`, or `[]` when unset/absent/malformed. */
export function loadHistory(key) {
    if (!key)
        return [];
    try {
        const stored = storage.getJson(historyStorageKey(key));
        return Array.isArray(stored) ? stored.slice(-HISTORY_CAP) : [];
    }
    catch {
        return [];
    }
}
export function persistHistory(key, value) {
    if (!key)
        return;
    try {
        storage.setJson(historyStorageKey(key), value.slice(-HISTORY_CAP));
    }
    catch {
        /* storage may be unavailable; the in-memory history still works */
    }
}
/** Drop a key's history. A no-op when nothing was stored under it. */
export function clearHistory(key) {
    try {
        storage.remove(historyStorageKey(key));
    }
    catch {
        /* ignore */
    }
}
