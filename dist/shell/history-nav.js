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
export function initHistoryNav() {
    return { index: null, draftText: "", draftCaret: 0, edits: new Map() };
}
/** Submitting or Escape-clearing drops the draft and any per-entry edits. */
export function resetHistoryNav() {
    return initHistoryNav();
}
function entryAt(state, history, index) {
    return state.edits.get(index) ?? history[index];
}
/**
 * ArrowUp: recall an older entry. On the live line this stashes `liveText`/
 * `liveCaret` as the draft and jumps to the newest entry; from a recalled
 * entry it steps one further back. Already at the oldest entry, or with an
 * empty history, it's a no-op (returns the input unchanged).
 */
export function navigateUp(state, history, liveText, liveCaret) {
    if (history.length === 0)
        return { state, text: liveText, caret: liveCaret };
    if (state.index === null) {
        const index = history.length - 1;
        const next = { ...state, index, draftText: liveText, draftCaret: liveCaret };
        const text = entryAt(next, history, index);
        return { state: next, text, caret: text.length };
    }
    if (state.index === 0)
        return { state, text: entryAt(state, history, 0), caret: liveCaret };
    const index = state.index - 1;
    const next = { ...state, index };
    const text = entryAt(next, history, index);
    return { state: next, text, caret: text.length };
}
/**
 * ArrowDown: recall a newer entry. Past the newest entry it restores the
 * stashed draft and returns to the live line. On the live line (no
 * navigation in progress) it's a no-op — `currentText` is handed back
 * unchanged so the caller never clears the input.
 */
export function navigateDown(state, history, currentText, currentCaret) {
    if (state.index === null)
        return { state, text: currentText, caret: currentCaret };
    // Readline semantics: keep an edit to the entry we're leaving for the rest
    // of the session, so navigating back to it later shows the edited text.
    const edits = new Map(state.edits);
    if (currentText !== history[state.index])
        edits.set(state.index, currentText);
    else
        edits.delete(state.index);
    const index = state.index + 1;
    if (index >= history.length) {
        const next = { index: null, draftText: "", draftCaret: 0, edits };
        return { state: next, text: state.draftText, caret: state.draftCaret };
    }
    const next = { ...state, index, edits };
    const text = entryAt(next, history, index);
    return { state: next, text, caret: text.length };
}
