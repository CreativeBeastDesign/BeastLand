/**
 * History navigation state machine: draft stash/restore, no-op down on the
 * live line, and per-session edits to recalled entries (readline
 * semantics). Pure — no DOM, no Terminal component involved.
 */
import { describe, expect, it } from "vitest";
import { initHistoryNav, navigateDown, navigateUp, resetHistoryNav, type HistoryNavState } from "$lib/shell/history-nav.js";

const history = ["one", "two", "three"];

describe("navigateUp", () => {
  it("stashes the live draft on the first Up and recalls the newest entry", () => {
    const state = initHistoryNav();
    const result = navigateUp(state, history, "unsent draft", 7);
    expect(result.text).toBe("three");
    expect(result.caret).toBe("three".length);
    expect(result.state.draftText).toBe("unsent draft");
    expect(result.state.draftCaret).toBe(7);
    expect(result.state.index).toBe(2);
  });

  it("steps further back on subsequent Ups", () => {
    let state = initHistoryNav();
    state = navigateUp(state, history, "draft", 5).state;
    const second = navigateUp(state, history, "draft", 5);
    expect(second.text).toBe("two");
    const third = navigateUp(second.state, history, "draft", 5);
    expect(third.text).toBe("one");
  });

  it("is a no-op at the oldest entry", () => {
    let state = initHistoryNav();
    state = navigateUp(state, history, "draft", 5).state;
    state = navigateUp(state, history, "draft", 5).state;
    state = navigateUp(state, history, "draft", 5).state;
    expect(state.index).toBe(0);
    const again = navigateUp(state, history, "draft", 5);
    expect(again.text).toBe("one");
    expect(again.state.index).toBe(0);
  });

  it("is a no-op with empty history", () => {
    const state = initHistoryNav();
    const result = navigateUp(state, [], "typing", 3);
    expect(result.text).toBe("typing");
    expect(result.caret).toBe(3);
    expect(result.state).toBe(state);
  });
});

describe("navigateDown", () => {
  it("does nothing on the live line — never clears the input", () => {
    const state = initHistoryNav();
    const result = navigateDown(state, history, "still typing", 4);
    expect(result.text).toBe("still typing");
    expect(result.caret).toBe(4);
    expect(result.state).toBe(state);
  });

  it("restores the stashed draft when moving past the newest entry", () => {
    let state = initHistoryNav();
    const up = navigateUp(state, history, "my draft", 6);
    state = up.state;
    expect(up.text).toBe("three"); // sanity: we recalled the newest entry

    const down = navigateDown(state, history, up.text, up.caret);
    expect(down.text).toBe("my draft");
    expect(down.caret).toBe(6);
    expect(down.state.index).toBeNull();
  });

  it("keeps edits to a recalled entry for the session (readline semantics)", () => {
    let state = initHistoryNav();
    let r = navigateUp(state, history, "draft", 0); // -> "three" (index 2)
    state = r.state;
    r = navigateUp(state, history, "draft", 0); // -> "two" (index 1)
    state = r.state;

    // Edit the recalled "two" entry in place, then navigate away and back.
    const edited = "two-edited";
    const downToThree = navigateDown(state, history, edited, edited.length); // -> index 2, "three"
    expect(downToThree.text).toBe("three");
    state = downToThree.state;

    const backToEdited = navigateUp(state, history, "unused", 0); // -> index 1
    expect(backToEdited.text).toBe(edited);
  });

  it("discards an edit that matches the original entry", () => {
    let state = initHistoryNav();
    let r = navigateUp(state, history, "draft", 0); // -> index 2 "three"
    state = r.state;
    // "Edit" back to the exact same text.
    r = navigateDown(state, history, "three", 5);
    expect(r.state.edits.has(2)).toBe(false);
  });
});

describe("resetHistoryNav", () => {
  it("submitting or Escape drops the draft and any per-entry edits", () => {
    let state = initHistoryNav();
    state = navigateUp(state, history, "draft", 0).state;
    state = navigateDown(state, history, "edited", 6).state; // records an edit, back to live...
    // (navigateDown from index 2 to past-newest resets already; force an edit scenario)
    state = navigateUp(initHistoryNav(), history, "draft", 0).state;
    state = navigateUp(state, history, "draft", 0).state; // index 1
    state = navigateDown(state, history, "changed", 7).state; // edit recorded, index 2
    expect(state.edits.size).toBeGreaterThan(0);

    const reset: HistoryNavState = resetHistoryNav();
    expect(reset.index).toBeNull();
    expect(reset.draftText).toBe("");
    expect(reset.edits.size).toBe(0);
  });
});
