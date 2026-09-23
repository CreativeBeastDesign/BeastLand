/**
 * Kind registry
 *
 * A *kind* is a type of content a container can show (customer, document,
 * work log…). The workspace itself knows nothing about records; each slice
 * registers its kinds while mounted:
 *
 *   $effect(() => kinds.register(customerKind));
 *
 * The registry answers the three questions the workspace and the tiles ask:
 * how big a new container should be, what to call a record, and whether it
 * still exists — plus which component renders it.
 */

import { untrack, type Component } from "svelte";
import type { CommandContext, FlagSpec, ParsedArgs } from "$lib/shell/protocol.js";
import { DEFAULT_SIZE } from "./types.js";
import { bareId, shortId, shortIdIndex, type ShortId } from "./ids.js";
import type { ViewFn } from "./views.js";

export type KindSpec = {
  /** Identifier stored on containers, e.g. `"customer"`. */
  kind: string;
  /** Default spawn size in grid units. */
  size: { w: number; h: number };
  /** Human label for a record id (tile title, `ls`). */
  label: (contentId: string) => string;
  /** Whether the record still exists — persisted containers are pruned otherwise. */
  exists: (contentId: string) => boolean;
  /** Renders the tile body for a record. */
  component: Component<{ contentId: string }>;
  /**
   * Every record id of this kind, for `#id` resolution and short-id
   * computation. Kinds without ids (singleton tiles) omit it.
   */
  ids?: () => string[];
  /**
   * Flags `@n set …` / `#id set …` accept for this kind. Drives completion,
   * `help`, and unknown-flag warnings on the generic `set`.
   */
  setFlags?: FlagSpec[];
  /**
   * Apply `set` flags to a record. Returns the patch that was applied (the
   * dispatcher prints `updated #xp: key=value`) or an error string; it never
   * prints itself.
   */
  set?: (contentId: string, parsed: ParsedArgs) => SetResult;
  /**
   * Rows to print for `#id -d` / `-f` (and the label column of `ls`). Build
   * one with `viewFrom(fieldDefs, lookup)`. Without it, `#id -d` prints the
   * label only.
   */
  view?: ViewFn;
  /**
   * What a language model should see for this record — the text an `ask`
   * command puts in context. Redact (emails) or enrich (linked records)
   * here; without it, apps fall back to `view(id, "full")` rendered as text.
   */
  context?: (contentId: string) => string;
  /**
   * Extra verbs after a container ref — `@n <name> …` / `#id <name> …` —
   * e.g. `item` on documents. They join `move`/`close`/`title`/`set` in
   * completion and `help`; names must not collide with those four.
   */
  actions?: KindAction[];
};

export type KindAction = {
  name: string;
  description: string;
  /** Flags the action accepts (completion + unknown-flag warnings). */
  flags?: FlagSpec[];
  /** May be async: the dispatcher awaits it, so `ctx.signal` and `cancelled` apply like for `Command.run`. */
  run: (contentId: string, args: string[], ctx: CommandContext) => void | Promise<void>;
};

export type SetResult =
  | { ok: true; patch: Record<string, unknown> }
  | { ok: false; error: string };

export type Resolved = { kind: string; id: string } | { ambiguous: string[] } | null;

function createKinds() {
  let specs = $state<Record<string, KindSpec>>({});

  // Every registered record, once per change: its kind, its bare id (for
  // `#id` resolution) and its short id. Rebuilt only when a kind's id array
  // changes, instead of rescanning every id per row and per keystroke.
  const records = $derived.by(() => {
    const entries = Object.values(specs).flatMap((spec) =>
      (spec.ids?.() ?? []).map((id) => ({ id, kind: spec.kind, bare: bareId(id) })),
    );
    return { entries, shorts: shortIdIndex(entries.map((e) => e.id)) };
  });

  return {
    get all(): KindSpec[] {
      return Object.values(specs);
    },

    get(kind: string): KindSpec | undefined {
      return specs[kind];
    },

    sizeOf(kind: string): { w: number; h: number } {
      return specs[kind]?.size ?? DEFAULT_SIZE;
    },

    labelOf(kind: string, contentId: string): string {
      return specs[kind]?.label(contentId) ?? contentId;
    },

    /** Every `#`-addressable id across all registered kinds. */
    /** Short ids of every registered record, by full id. */
    get shortIds(): ReadonlyMap<string, ShortId> {
      return records.shorts;
    },

    /** The short id of one record — from the cached index, or computed for an unknown id. */
    shortIdOf(id: string): ShortId {
      return records.shorts.get(id) ?? shortId(id, this.allIds);
    },

    get allIds(): string[] {
      return Object.values(specs).flatMap((s) => s.ids?.() ?? []);
    },

    /** Resolve `#xp`-style input to a record of whichever kind owns it. */
    /**
     * Resolve `#xp` (or a full id) to one record. Runs against the cached
     * entries — `resolveId`'s own scan recomputes `bareId` for every id, and
     * this runs on every keystroke (completion and previews).
     */
    resolve(input: string): Resolved {
      const needle = bareId(input.replace(/^#/, ""));
      if (!needle) return null;
      const { entries } = records;

      const exact = entries.find((e) => e.id === input || e.bare === needle);
      if (exact) return { kind: exact.kind, id: exact.id };

      const matches = entries.filter((e) => e.bare.startsWith(needle));
      if (matches.length === 1) return { kind: matches[0].kind, id: matches[0].id };
      if (matches.length > 1) return { ambiguous: matches.map((m) => m.id) };
      return null;
    },

    /** Unknown kinds are kept (their slice may not be mounted yet). */
    exists(kind: string, contentId: string): boolean {
      return specs[kind]?.exists(contentId) ?? true;
    },

    /** Register a kind; call the returned function to remove it again. */
    register(spec: KindSpec): () => void {
      untrack(() => {
        specs = { ...specs, [spec.kind]: spec };
      });
      return () => {
        untrack(() => {
          if (specs[spec.kind] === spec) {
            const next = { ...specs };
            delete next[spec.kind];
            specs = next;
          }
        });
      };
    },
  };
}

export const kinds = createKinds();
