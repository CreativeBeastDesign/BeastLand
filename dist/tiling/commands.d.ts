/**
 * Tiling commands — the demo CRM
 *
 * `customer`, `docs`, `item` and `reset --data` on top of the record-agnostic
 * workspace commands in `./workspace-commands.ts` (`@n`, `#id`, `ls`,
 * `close`). `tilingCommands` bundles both for the `/tiling` route; an app
 * with its own data registers `workspaceCommands` plus its own groups.
 *
 * `@n item …` / `@n customer set …` reach this file through the document /
 * customer kinds' `actions` (see `$lib/data/kinds.ts`), not through the
 * generic dispatcher.
 */
import { type Command, type CommandContext, type FlagSpec } from "../shell/commands.js";
export { runSet } from "./workspace-commands.js";
declare const itemFieldFlags: FlagSpec[];
/**
 * `item …` on a document: shared by the top-level `item` command and the
 * document kind's `item` action (`@n item …` / `#id item …`, see
 * `$lib/data/kinds.ts`).
 */
export declare function handleItem(documentId: string, args: string[], ctx: CommandContext): void;
/** Item flags, for the document kind's `item` action (`$lib/data/kinds.ts`). */
export { itemFieldFlags };
/** The demo bundle: CRM commands + the generic container commands + `reset --data|--layout`. */
export declare const tilingCommands: Command[];
