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

export type UndoOutcome =
  | { ok: true; entry: UndoEntry }
  | { ok: false; reason: string; entry?: UndoEntry; nextUndoableId?: number };

type Entry = {
  id: number;
  label: string;
  group?: string;
  createdAt: number;
  expiresAt?: number;
  undoFn?: () => void | Promise<void>;
  guard?: () => string | null | Promise<string | null>;
  done: boolean;
  irreversible: boolean;
  reason?: string;
};

let seq = 0;

function statusOf(e: Entry): UndoStatus {
  if (e.irreversible) return "irreversible";
  if (e.done) return "undone";
  if (e.expiresAt !== undefined && Date.now() >= e.expiresAt) return "expired";
  return "undoable";
}

function reasonFor(e: Entry, status: UndoStatus): string {
  if (status === "irreversible") return e.reason ?? "cannot be undone";
  if (status === "expired") return "expired";
  if (status === "undone") return "already undone";
  return "";
}

function toView(e: Entry): UndoEntry {
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
  let entries = $state<Entry[]>([]);
  let busy = $state(false);

  function trim() {
    if (entries.length > CAP) entries = entries.slice(entries.length - CAP);
  }

  function push(input: UndoPushInput): number {
    seq += 1;
    const entry: Entry = {
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

  function irreversible(label: string, reason: string): number {
    seq += 1;
    const entry: Entry = {
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

  function list(): UndoEntry[] {
    return entries.map(toView);
  }

  /** The nearest undoable entry strictly before `index`, if any. */
  function nextUndoableBefore(index: number): Entry | undefined {
    for (let i = index - 1; i >= 0; i--) {
      if (statusOf(entries[i]) === "undoable") return entries[i];
    }
    return undefined;
  }

  async function undo(id?: number): Promise<UndoOutcome> {
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
      return { ok: true, entry: toView(entries.find((e) => e.id === entry.id)!) };
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : String(err), entry: toView(entry) };
    } finally {
      busy = false;
    }
  }

  /** Drop every entry (e.g. on logout, or between tests). Does not run any inverse. */
  function clear(): void {
    entries = [];
  }

  return {
    get entries(): UndoEntry[] {
      return list();
    },
    get busy(): boolean {
      return busy;
    },
    push,
    irreversible,
    list,
    undo,
    clear,
  };
}

export type UndoStack = ReturnType<typeof createUndoStack>;

export const undoStack: UndoStack = createUndoStack();

/**
 * `{ text: "undo", tone: "muted", command: "undo <id>" }` — append it to an
 * output line (`ctx.print(["…", " ", undoSpan(id)], "output")`) so the line
 * carries a clickable `[undo]`. Clicking it runs `undo <id>` through the
 * dispatcher exactly as if typed (and echoed in history); it is keyboard
 * accessible and does not double up the terminal's click-to-focus handling.
 */
export function undoSpan(id: number): import("./protocol.js").Span {
  return { text: "undo", tone: "muted", command: `undo ${id}` };
}
