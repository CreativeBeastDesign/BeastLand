/**
 * Command index
 *
 * `matchCommand` and `candidatesFor` are called on every keystroke (via
 * `previewFor`) against a `Command[]` that rarely changes between calls.
 * Both used to do two linear `commands.find` scans — one for exact
 * name/alias, one for prefix `match`. This builds an index once per distinct
 * command array and reuses it.
 *
 * Caching strategy: memoise by the array's *identity* in a `WeakMap`. This
 * is safe only because nothing in this codebase mutates a commands array in
 * place — `registry.commands` (src/lib/shell/registry.svelte.ts) always
 * returns a fresh `[...shellCommands, ...extensions.flat()]` array when the
 * registered set changes, and `shellCommands` / route-level command arrays
 * are static literals. A `WeakMap<readonly Command[], Index>` therefore
 * never sees the same reference twice with different contents, so there is
 * no staleness risk and entries are garbage-collected automatically when a
 * commands array falls out of scope (e.g. a route unmounts).
 *
 * If a caller ever starts mutating a commands array in place (push/splice on
 * `shellCommands` or an extension group) this cache would go stale, since
 * the same reference would then map to outdated content. Grep for
 * `commands.push`/`commands.splice` before relying on identity alone; if
 * that ever shows up, key the cache on `[commands, commands.length]` (or a
 * cheap content signature) instead of the bare array.
 */
import type { Command } from "./protocol.js";
export interface CommandIndex {
    /** Exact name or alias -> command. First registration wins. */
    byName: Map<string, Command>;
    /** Commands with a `match` predicate, in registration order, for prefix scans. */
    matchers: Command[];
}
/** Build (or reuse) the lookup index for a commands array. */
export declare function indexCommands(commands: readonly Command[]): CommandIndex;
