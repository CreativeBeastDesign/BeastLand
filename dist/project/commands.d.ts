/**
 * Project commands
 *
 * A single terminal command, `project` (alias `p`), covering the whole
 * slice: list/create/edit/remove projects, open/print one, list its linked
 * documents, link/unlink a document, and print an hours summary. Registered
 * into the shell via `registry.register(projectCommands)` from the tiling
 * route.
 *
 * Grammar mirrors `customer`/`docs` in `$lib/tiling/commands.ts`: the first
 * positional token is either a verb (`list`, `new`, `set`, `rm`) or a `#id`,
 * in which case a second positional token (`docs`, `link`, `unlink`, `log`)
 * may follow. Bare `#pr` (no `project` prefix) still opens/selects the
 * project via the generic `#<id>` command in `$lib/tiling/commands.ts` — it
 * works for free once a kind is registered with `ids`.
 */
import { type Command } from "../shell/commands.js";
export declare const projectCommand: Command;
export declare const projectCommands: Command[];
