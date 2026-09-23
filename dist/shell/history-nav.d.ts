/**
 * History navigation state machine for the Terminal prompt.
 *
 * Pure, framework-free: given the current nav state, the persisted
 * `history` array, and the live (unsent) input, decides what ArrowUp/
 * ArrowDown should show next. No DOM — the Terminal calls this from its
 * keydown handler and applies the returned text/caret.
 *
 * Shell-style draft preservation (bash/zsh/fish):
 * - The first ArrowUp from the live line stashes the current unsent input
 *   (text + caret) as the "draft" before recalling history.
 * - ArrowDown past the newest history entry restores that draft rather than
 *   clearing the line.
 * - ArrowDown while not navigating (already on the live line) is a no-op —
 *   it must never wipe what's being typed.
 * - Edits made to a recalled entry are kept for the rest of the session
 *   (readline semantics): navigating away and back shows the edited text,
 *   not the original history line. These edits are never persisted to
 *   storage — only `submitLine` writes to persisted history, and a fresh
 *   `resetHistoryNav()` (submit or Escape) drops them.
 */
export type HistoryNavState = {
    /** `null` = live line (not navigating). Otherwise an index into `history`. */
    index: number | null;
    /** Stashed live-line text, valid only while `index !== null`. */
    draftText: string;
    draftCaret: number;
    /** Per-session edits to recalled entries, keyed by their `history` index. */
    edits: Map<number, string>;
};
export type HistoryNavResult = {
    state: HistoryNavState;
    text: string;
    caret: number;
};
export declare function initHistoryNav(): HistoryNavState;
/** Submitting or Escape-clearing drops the draft and any per-entry edits. */
export declare function resetHistoryNav(): HistoryNavState;
/**
 * ArrowUp: recall an older entry. On the live line this stashes `liveText`/
 * `liveCaret` as the draft and jumps to the newest entry; from a recalled
 * entry it steps one further back. Already at the oldest entry, or with an
 * empty history, it's a no-op (returns the input unchanged).
 */
export declare function navigateUp(state: HistoryNavState, history: string[], liveText: string, liveCaret: number): HistoryNavResult;
/**
 * ArrowDown: recall a newer entry. Past the newest entry it restores the
 * stashed draft and returns to the live line. On the live line (no
 * navigation in progress) it's a no-op — `currentText` is handed back
 * unchanged so the caller never clears the input.
 */
export declare function navigateDown(state: HistoryNavState, history: string[], currentText: string, currentCaret: number): HistoryNavResult;
