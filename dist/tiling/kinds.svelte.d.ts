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
import { type Component } from "svelte";
import type { CommandContext, FlagSpec, ParsedArgs } from "../shell/protocol.js";
import { type ShortId } from "./ids.js";
import type { ViewFn } from "./views.js";
export type KindSpec = {
    /** Identifier stored on containers, e.g. `"customer"`. */
    kind: string;
    /** Default spawn size in grid units. */
    size: {
        w: number;
        h: number;
    };
    /** Human label for a record id (tile title, `ls`). */
    label: (contentId: string) => string;
    /** Whether the record still exists — persisted containers are pruned otherwise. */
    exists: (contentId: string) => boolean;
    /**
     * Whether this kind's backing store has finished loading. Omit it when the
     * store is always ready (the common case). While it returns `false`,
     * `exists` behaves as if the kind weren't registered at all — `true` for
     * every id — so `workspace.prune()` (including the pass BeastLand re-runs
     * after a late `hydrate()`) never drops a container just because its
     * record hasn't loaded yet. Resolution (`kinds.resolve`, `ids()`) is
     * unaffected: it stays whatever `ids()` reports regardless of `ready`.
     * Safe to read reactive state (e.g. a `$state` flag) inside it — it is
     * called from derived/effect contexts.
     */
    ready?: () => boolean;
    /** Renders the tile body for a record. */
    component: Component<{
        contentId: string;
    }>;
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
export type SetResult = {
    ok: true;
    patch: Record<string, unknown>;
} | {
    ok: false;
    error: string;
};
type Resolved = {
    kind: string;
    id: string;
} | {
    ambiguous: string[];
} | null;
export declare const kinds: {
    readonly all: KindSpec[];
    get(kind: string): KindSpec | undefined;
    sizeOf(kind: string): {
        w: number;
        h: number;
    };
    labelOf(kind: string, contentId: string): string;
    /** Every `#`-addressable id across all registered kinds. */
    /** Short ids of every registered record, by full id. */
    readonly shortIds: ReadonlyMap<string, ShortId>;
    /** The short id of one record — from the cached index, or computed for an unknown id. */
    shortIdOf(id: string): ShortId;
    readonly allIds: string[];
    /** Resolve `#xp`-style input to a record of whichever kind owns it. */
    /**
     * Resolve `#xp` (or a full id) to one record. Runs against the cached
     * entries — `resolveId`'s own scan recomputes `bareId` for every id, and
     * this runs on every keystroke (completion and previews).
     */
    resolve(input: string): Resolved;
    /**
     * Unknown kinds are kept (their slice may not be mounted yet); a
     * registered kind that reports `ready() === false` is kept the same way.
     */
    exists(kind: string, contentId: string): boolean;
    /** Register a kind; call the returned function to remove it again. */
    register(spec: KindSpec): () => void;
};
export {};
