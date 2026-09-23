/**
 * Workspace commands
 *
 * The record-agnostic half of the tiling terminal: `@n …` and `#id …` prefix
 * commands (select / open / move / resize / close / retitle / `set`), `ls`,
 * `close`, `ws` (switch/list/manage workspaces), `reset --layout`, plus the
 * print helpers other command groups reuse. Nothing here knows a customer
 * from a document — everything kind-specific comes from the kind registry
 * (`KindSpec.label/ids/view/set/actions`). Register with
 * `registry.register(workspaceCommands)` and your own kinds;
 * `$lib/tiling/commands.ts` is the demo CRM on top of it.
 *
 * `@2 …` and `#xp …` are prefix commands (see `Command.match`): once the
 * target container is resolved, any trailing args are handed to the same
 * `applyContainerArgs` dispatcher, so `#xp set --city Bern` and `@2 set
 * --city Bern` behave identically.
 *
 * `ws` addresses *layouts*, not containers — `@n`/`#id` always act on the
 * active one. It lives in `containerCommands` (not split out) so every
 * bundle built on top (`workspaceCommands`, the demo's `tilingCommands`)
 * gets workspace switching for free, the same way `ls`/`close` do.
 */
import type { Container, Direction } from "./types.js";
import { type KindSpec } from "./kinds.svelte.js";
import { type FieldDef, type Level, type ViewRow } from "./views.js";
import { type Command, type CommandContext, type FlagSpec, type Intent, type ParsedArgs, type Span, type Suggestion } from "../shell/protocol.js";
/** `#` + the shortest unique prefix of a full record id (plain text, for messages). */
export declare function sid(id: string): string;
/** `#xp` bold + dimmed `oakahe` tail, as spans for styled output. Clicking runs `#xp`. */
export declare function idSpans(id: string): Span[];
/** Plain text of a span list (for width calculations). */
export declare function spanText(spans: Span[]): string;
/** Pad a span list with spaces up to `width` characters. */
export declare function padSpans(spans: Span[], width: number): Span[];
/** `created #xp @3` and friends: a message with a styled id in it. */
export declare function say(ctx: CommandContext, before: string, id: string, after?: string): void;
export declare function printAmbiguous(ids: string[], ctx: CommandContext): void;
/** `--details/-d` or `--full/-f` → level; nothing → null. */
export declare function levelFromArgs(parsed: ParsedArgs): Level | null;
/**
 * Print one record as `Label  value` lines. The `list` level collapses to a
 * single line (id + first row).
 */
export declare function printRows(ctx: CommandContext, id: string, rows: ViewRow[], level: Level): void;
/** `printRows` from field definitions. */
export declare function printRecord<T>(ctx: CommandContext, id: string, record: T, defs: FieldDef<T>[], level: Level): void;
/**
 * Print a list of records: one line each. `list` level shows the name/title
 * only; `details` adds the details-level fields as columns.
 */
export declare function printList<T extends {
    id: string;
}>(ctx: CommandContext, records: readonly T[], defs: FieldDef<T>[], level: Level, empty: string): void;
/** Print a record at `level` through its kind's `view` hook (label only without one). */
export declare function showRecord(ctx: CommandContext, kind: string, id: string, level: Level): void;
/** Render `key=value` pairs for a "field(s) changed" confirmation line. */
export declare function describePatch(patch: Record<string, unknown>): string;
/** Print rows as a left-aligned table, columns sized to their widest cell. */
export declare function printTable(ctx: CommandContext, rows: string[][]): void;
export declare const detailFlags: FlagSpec[];
export declare const directionFlags: FlagSpec[];
export declare const sizeFlags: FlagSpec[];
/** Display label for a container, via its kind. */
export declare function containerLabel(c: Container): string;
/** `@2` candidates for every open container, e.g. for `@<partial>` or `close <partial>`. */
export declare function containerSuggestions(): Suggestion[];
/** `#xp` candidates for every record of every registered kind (or of one kind). */
export declare function recordSuggestions(kind?: string): Suggestion[];
/**
 * Every kind that declares a `set` hook can be edited from `@n set …`,
 * `#id set …`, or its own `<kind> set …` command. The hook returns the
 * patch; printing and error handling live here, once.
 */
export declare function runSet(container: Container, args: string[], ctx: CommandContext): void;
export declare function directionFromArgs(parsed: ParsedArgs): Direction | undefined;
/** Dispatch trailing args of `@n …` / `#id …` onto the resolved container. Async when a kind action is. */
export declare function applyContainerArgs(container: Container, args: string[], ctx: CommandContext): void | Promise<void>;
/**
 * `-w 4 -h 3` as a spawn size (for `#id -w 4` on a record that has no
 * container yet). Returns the size and the args with those flags removed.
 */
export declare function spawnSizeFromArgs(args: string[]): {
    size: {
        w?: number;
        h?: number;
    };
    rest: string[];
};
/**
 * Preview of `applyContainerArgs` for an already-resolved container: what
 * closing, retitling, moving, or resizing it would show. Pure — mirrors the
 * dispatch order of `applyContainerArgs` but never prints or mutates.
 */
export declare function previewContainerArgs(container: Container, args: string[]): Intent;
/** A kind's `actions` as subcommand suggestions — the verbs `@n <verb>` / `#id <verb>` accept for that target. */
export declare function actionSuggestions(kind: string | undefined): Suggestion[];
/**
 * Flags for a `<slice> #id <verb> …` line: the verb's own flags on top of
 * `base` (the command-level flags, `detailFlags` by default), or null when
 * the line isn't that shape — then `knownFlags` applies as usual. Hand it to
 * a command's `completeFlags` so `#id <verb> --…` completes and doesn't warn.
 */
export declare function actionFlagsFor(spec: KindSpec, args: string[], base?: FlagSpec[]): FlagSpec[] | null;
/**
 * Dispatch `<slice> #id <verb> …` onto the kind's action. Resolves to false
 * when the kind has no such verb (print your usage line then); otherwise
 * awaits the action, so async actions get `ctx.signal`/`cancelled`
 * semantics like any `Command.run`.
 */
export declare function runKindAction(spec: KindSpec, contentId: string, verb: string, args: string[], ctx: CommandContext): Promise<boolean>;
/** The record-agnostic container commands: `@n`, `#id`, `ls`, `close`, `ws`. */
export declare const containerCommands: Command[];
/** `containerCommands` plus `reset --layout` — everything a workspace needs without any data slice. */
export declare const workspaceCommands: Command[];
