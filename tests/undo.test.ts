/**
 * Undo stack: push/undo semantics, guard refusal, expiry, irreversible
 * entries, the cap, and concurrency — independent of any consumer (layout,
 * shell command…).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { undoStack, undoSpan } from "$lib/shell/undo.svelte.js";

beforeEach(() => undoStack.clear());

describe("push + undo", () => {
  it("runs the inverse and marks the entry undone", async () => {
    let undone = false;
    const id = undoStack.push({ label: "do a thing", undo: () => { undone = true; } });
    const outcome = await undoStack.undo(id);
    expect(outcome.ok).toBe(true);
    expect(undone).toBe(true);
    expect(undoStack.list().find((e) => e.id === id)?.status).toBe("undone");
  });

  it("plain undo() targets the most recent entry", async () => {
    const calls: string[] = [];
    undoStack.push({ label: "first", undo: () => { calls.push("first"); } });
    const second = undoStack.push({ label: "second", undo: () => { calls.push("second"); } });
    const outcome = await undoStack.undo();
    expect(outcome.ok).toBe(true);
    expect(outcome.ok && outcome.entry.id).toBe(second);
    expect(calls).toEqual(["second"]);
  });

  it("undoing an already-undone entry is refused, and the entry stays undone", async () => {
    const id = undoStack.push({ label: "once", undo: () => {} });
    await undoStack.undo(id);
    const outcome = await undoStack.undo(id);
    expect(outcome.ok).toBe(false);
    expect(!outcome.ok && outcome.reason).toBe("already undone");
  });

  it("undo() with no id and an already-undone latest entry names the next undoable one", async () => {
    const olderId = undoStack.push({ label: "older", undo: () => {} });
    const latestId = undoStack.push({ label: "latest", undo: () => {} });
    await undoStack.undo(latestId);
    const outcome = await undoStack.undo();
    expect(outcome.ok).toBe(false);
    expect(!outcome.ok && outcome.nextUndoableId).toBe(olderId);
  });

  it("unknown id is refused", async () => {
    const outcome = await undoStack.undo(999999);
    expect(outcome.ok).toBe(false);
  });

  it("nothing to undo on an empty stack", async () => {
    const outcome = await undoStack.undo();
    expect(outcome.ok).toBe(false);
    expect(!outcome.ok && outcome.reason).toBe("nothing to undo");
  });
});

describe("guard", () => {
  it("refuses with the guard's reason and leaves the entry undoable", async () => {
    const id = undoStack.push({
      label: "risky",
      guard: () => "changed since by Anna",
      undo: () => {
        throw new Error("should never run");
      },
    });
    const outcome = await undoStack.undo(id);
    expect(outcome.ok).toBe(false);
    expect(!outcome.ok && outcome.reason).toBe("changed since by Anna");
    expect(undoStack.list().find((e) => e.id === id)?.status).toBe("undoable");
  });

  it("null guard lets the undo proceed", async () => {
    let ran = false;
    const id = undoStack.push({ label: "fine", guard: () => null, undo: () => { ran = true; } });
    const outcome = await undoStack.undo(id);
    expect(outcome.ok).toBe(true);
    expect(ran).toBe(true);
  });

  it("an async guard is awaited", async () => {
    const id = undoStack.push({
      label: "async guard",
      guard: async () => {
        await Promise.resolve();
        return "still busy";
      },
      undo: () => {},
    });
    const outcome = await undoStack.undo(id);
    expect(outcome.ok).toBe(false);
  });
});

describe("expiry", () => {
  it("an expired entry refuses and reports why", async () => {
    const id = undoStack.push({ label: "stale", expiresAt: Date.now() - 1, undo: () => {} });
    const outcome = await undoStack.undo(id);
    expect(outcome.ok).toBe(false);
    expect(!outcome.ok && outcome.reason).toBe("expired");
    expect(undoStack.list().find((e) => e.id === id)?.status).toBe("expired");
  });

  it("a not-yet-expired entry is still undoable", async () => {
    const id = undoStack.push({ label: "fresh", expiresAt: Date.now() + 100000, undo: () => {} });
    expect(undoStack.list().find((e) => e.id === id)?.status).toBe("undoable");
  });
});

describe("irreversible", () => {
  it("is listed and refuses undo with its reason, without touching older entries", async () => {
    const olderId = undoStack.push({ label: "older undoable", undo: () => {} });
    const badId = undoStack.irreversible("sent an email", "emails can't be unsent");
    expect(undoStack.list().find((e) => e.id === badId)).toMatchObject({
      status: "irreversible",
      reason: "emails can't be unsent",
    });

    const outcome = await undoStack.undo(badId);
    expect(outcome.ok).toBe(false);
    expect(!outcome.ok && outcome.reason).toBe("emails can't be unsent");

    // Plain `undo()` (latest = the irreversible one) explains and points at
    // the next undoable entry instead of reaching past it implicitly.
    const plain = await undoStack.undo();
    expect(plain.ok).toBe(false);
    expect(!plain.ok && plain.nextUndoableId).toBe(olderId);
  });
});

describe("cap", () => {
  it("keeps at most ~50 entries, dropping the oldest", () => {
    let firstId = -1;
    for (let i = 0; i < 60; i++) {
      const id = undoStack.push({ label: `entry ${i}`, undo: () => {} });
      if (i === 0) firstId = id;
    }
    const list = undoStack.list();
    expect(list.length).toBeLessThanOrEqual(50);
    expect(list.some((e) => e.id === firstId)).toBe(false);
  });
});

describe("concurrency", () => {
  it("refuses a second undo while one is in flight", async () => {
    let resolveFirst!: () => void;
    const first = undoStack.push({
      label: "slow",
      undo: () => new Promise<void>((resolve) => { resolveFirst = resolve; }),
    });
    const second = undoStack.push({ label: "quick", undo: () => {} });

    const inFlight = undoStack.undo(first);
    const blocked = await undoStack.undo(second);
    expect(blocked.ok).toBe(false);
    expect(!blocked.ok && blocked.reason).toBe("an undo is already in progress");

    resolveFirst();
    const finished = await inFlight;
    expect(finished.ok).toBe(true);
  });

  it("a failing undo leaves the entry undoable and reports the error", async () => {
    const id = undoStack.push({
      label: "boom",
      undo: () => {
        throw new Error("kaboom");
      },
    });
    const outcome = await undoStack.undo(id);
    expect(outcome.ok).toBe(false);
    expect(!outcome.ok && outcome.reason).toBe("kaboom");
    expect(undoStack.list().find((e) => e.id === id)?.status).toBe("undoable");

    // Retrying (once the underlying cause is fixed) can still succeed.
    const id2 = undoStack.push({ label: "retry", undo: () => {} });
    expect((await undoStack.undo(id2)).ok).toBe(true);
  });
});

describe("undoSpan", () => {
  it("builds a muted, clickable `undo <id>` span", () => {
    expect(undoSpan(7)).toEqual({ text: "undo", tone: "muted", command: "undo 7" });
  });
});
