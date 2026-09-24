/**
 * Terminal input history
 *
 * The ↑/↓ lines, persisted through the storage seam when the Terminal is
 * given a `historyKey` (`beastland:history:<key>`). Kept out of the
 * component so the key format has one owner and callers that retire a key —
 * `ws rm` on a workspace whose id was the history key — can clear it.
 */
/** Most recent lines kept per key. */
export declare const HISTORY_CAP = 200;
export declare function historyStorageKey(key: string): string;
/** Persisted history for `key`, or `[]` when unset/absent/malformed. */
export declare function loadHistory(key: string | undefined): string[];
export declare function persistHistory(key: string | undefined, value: string[]): void;
/** Drop a key's history. A no-op when nothing was stored under it. */
export declare function clearHistory(key: string): void;
