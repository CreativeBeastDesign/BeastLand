/**
 * Work log store
 *
 * In-memory `WorkEntry` list, persisted through storage (`beastland:worklog`)
 * the same way `$lib/data/store.svelte.ts` persists customers/documents.
 * Enforces the "exactly one running entry" invariant: `start` and `add`
 * (when given no `stoppedAt`) stop whatever is currently running first.
 *
 * Also exports `clock`, a tiny ticking rune store: reading `clock.now`
 * lazily starts a 30s interval, so any `$derived` reading it (running-entry
 * durations) re-renders without a manual timer per component.
 */

import type { WorkEntry } from "./types.js";
import { storage } from "$lib/shell/storage.js";
import { dayKey, entryMinutes } from "./types.js";

const STORAGE_KEY = "beastland:worklog";

const ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

function randomAlnum(len: number): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
  }
  return out;
}

function newEntryId(): WorkEntry["id"] {
  return `worklog:${randomAlnum(20)}`;
}

// Seeded documents (see `$lib/data/seed.ts`) the seed entries link to.
const SEED_DOC_1 = "document:doc_fab90cb3-c39b-440c-91de-861431c639a9";
const SEED_DOC_2 = "document:doc_e368a757-37ff-4eeb-a474-85c9e7e2a337";

/** ~6 entries over the last 5 days, one still running (started 25 minutes ago). */
function seedEntries(): WorkEntry[] {
  const now = Date.now();
  const DAY = 86400000;

  const at = (daysAgo: number, hh: number, mm: number): string => {
    const d = new Date(now - daysAgo * DAY);
    d.setHours(hh, mm, 0, 0);
    return d.toISOString();
  };

  const mk = (
    id: string,
    documentId: string | null,
    itemIndex: number | null,
    note: string,
    startedAt: string,
    stoppedAt: string | null,
  ): WorkEntry => ({
    id: `worklog:${id}`,
    documentId,
    itemIndex,
    // Seed entries attribute to a project only via their document's own
    // `projectId` (see `$lib/project/store.svelte.ts#minutesOf`), never directly.
    projectId: null,
    note,
    startedAt,
    stoppedAt,
    createdAt: startedAt,
    updatedAt: stoppedAt ?? startedAt,
  });

  return [
    mk("seedaaaaaaaaaaaaaaaa1", SEED_DOC_1, 1, "Fallback-Counter Analyse", at(4, 9, 10), at(4, 10, 15)),
    mk("seedaaaaaaaaaaaaaaaa2", SEED_DOC_1, 2, "Kalibrierungsqualität skizzieren", at(3, 14, 0), at(3, 15, 30)),
    mk("seedaaaaaaaaaaaaaaaa3", SEED_DOC_2, 1, "Corporate Design Kickoff", at(2, 9, 30), at(2, 11, 0)),
    mk("seedaaaaaaaaaaaaaaaa4", SEED_DOC_1, 3, "Unmögliche Zustände", at(1, 13, 0), at(1, 13, 45)),
    mk("seedaaaaaaaaaaaaaaaa5", SEED_DOC_2, 1, "Feedback einarbeiten", at(1, 15, 0), at(1, 16, 20)),
    mk(
      "seedaaaaaaaaaaaaaaaa6",
      SEED_DOC_1,
      2,
      "Kalibrierung",
      new Date(now - 25 * 60000).toISOString(),
      null,
    ),
  ];
}

type Persisted = { entries: WorkEntry[] };

function readPersisted(): Persisted | null {
  try {
    const raw = storage.get(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    if (!Array.isArray(parsed.entries)) return null;
    return { entries: parsed.entries };
  } catch {
    return null;
  }
}

function createWorklog() {
  let entries = $state<WorkEntry[]>([]);

  function hydrate() {
    const persisted = readPersisted();
    entries = persisted ? persisted.entries : seedEntries();
  }
  hydrate();
  storage.register(STORAGE_KEY, hydrate);

  function persist() {
    try {
      storage.setJson(STORAGE_KEY, { entries });
    } catch {
      /* storage may be unavailable; the in-memory state still works */
    }
  }

  function findRunning(): WorkEntry | undefined {
    return entries.find((e) => e.stoppedAt === null);
  }

  /** Stop whatever is running, at `at` (an ISO datetime). No-op if nothing is running. */
  function stopRunningAt(at: string) {
    const running = findRunning();
    if (!running) return;
    entries = entries.map((e) => (e.id === running.id ? { ...e, stoppedAt: at, updatedAt: at } : e));
  }

  function start(input: {
    documentId?: string | null;
    itemIndex?: number | null;
    projectId?: string | null;
    note?: string;
  }): WorkEntry {
    const now = new Date().toISOString();
    stopRunningAt(now);
    const entry: WorkEntry = {
      id: newEntryId(),
      documentId: input.documentId ?? null,
      itemIndex: input.itemIndex ?? null,
      projectId: input.projectId ?? null,
      note: input.note ?? "",
      startedAt: now,
      stoppedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    entries = [...entries, entry];
    persist();
    return entry;
  }

  function stop(): WorkEntry | null {
    const running = findRunning();
    if (!running) return null;
    const now = new Date().toISOString();
    const updated: WorkEntry = { ...running, stoppedAt: now, updatedAt: now };
    entries = entries.map((e) => (e.id === running.id ? updated : e));
    persist();
    return updated;
  }

  function add(input: {
    documentId?: string | null;
    itemIndex?: number | null;
    projectId?: string | null;
    note?: string;
    startedAt: string;
    stoppedAt: string | null;
  }): WorkEntry {
    // A historical entry with no `stoppedAt` would violate the "exactly one
    // running entry" invariant, so treat it like `start`: stop the current one.
    if (input.stoppedAt === null) stopRunningAt(input.startedAt);
    const now = new Date().toISOString();
    const entry: WorkEntry = {
      id: newEntryId(),
      documentId: input.documentId ?? null,
      itemIndex: input.itemIndex ?? null,
      projectId: input.projectId ?? null,
      note: input.note ?? "",
      startedAt: input.startedAt,
      stoppedAt: input.stoppedAt,
      createdAt: now,
      updatedAt: now,
    };
    entries = [...entries, entry];
    persist();
    return entry;
  }

  function remove(id: string): boolean {
    const before = entries.length;
    entries = entries.filter((e) => e.id !== id);
    if (entries.length === before) return false;
    persist();
    return true;
  }

  function update(id: string, patch: Partial<WorkEntry>): WorkEntry | undefined {
    const existing = entries.find((e) => e.id === id);
    if (!existing) return undefined;
    const updated: WorkEntry = { ...existing, ...patch, id: existing.id, updatedAt: new Date().toISOString() };
    entries = entries.map((e) => (e.id === id ? updated : e));
    persist();
    return updated;
  }

  function byDay(range?: { from: string; to: string }): { day: string; entries: WorkEntry[]; minutes: number }[] {
    const filtered = range
      ? entries.filter((e) => {
          const k = dayKey(e.startedAt);
          return k >= range.from && k <= range.to;
        })
      : entries;

    const groups = new Map<string, WorkEntry[]>();
    for (const e of filtered) {
      const k = dayKey(e.startedAt);
      const list = groups.get(k);
      if (list) list.push(e);
      else groups.set(k, [e]);
    }

    return [...groups.entries()]
      .sort((a, b) => b[0].localeCompare(a[0])) // newest day first
      .map(([day, es]) => {
        const sorted = [...es].sort((a, b) => a.startedAt.localeCompare(b.startedAt)); // chronological within a day
        const minutes = sorted.reduce((sum, e) => sum + entryMinutes(e), 0);
        return { day, entries: sorted, minutes };
      });
  }

  function minutesFor(documentId: string, itemIndex?: number): number {
    return entries
      .filter((e) => e.documentId === documentId && (itemIndex === undefined || e.itemIndex === itemIndex))
      .reduce((sum, e) => sum + entryMinutes(e), 0);
  }

  function reset(): void {
    entries = seedEntries();
    storage.remove(STORAGE_KEY);
  }

  return {
    get entries(): readonly WorkEntry[] {
      return entries;
    },
    get running(): WorkEntry | null {
      return findRunning() ?? null;
    },

    start,
    stop,
    add,
    remove,
    update,
    byDay,
    minutesFor,
    reset,
  };
}

export const worklog = createWorklog();

function createClock() {
  let now = $state(Date.now());
  let started = false;

  function ensureStarted() {
    if (started || typeof window === "undefined") return;
    started = true;
    setInterval(() => {
      now = Date.now();
    }, 30000);
  }

  return {
    get now(): number {
      ensureStarted();
      return now;
    },
  };
}

/** Ticks every 30s once read; lets `$derived` running-duration values re-render. */
export const clock = createClock();
