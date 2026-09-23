/**
 * Work log commands
 *
 * A single terminal command, `log` (alias `l`), covering the whole slice:
 * list/print the timeline, start/stop tracking, add a historical entry,
 * remove one, and open the tile. Registered into the shell via
 * `registry.register(worklogCommands)` from the tiling route.
 *
 * Unlike `customer`/`docs`, `log` targets are not `#`-addressable records —
 * the worklog tile is a single virtual content id (`WORKLOG_CONTENT_ID`).
 * `log start`/`log add` instead take an *optional* `#id` of a document (and,
 * after it, an item ref) or a project — to attribute the entry to.
 */
import { type Command } from "../shell/commands.js";
export declare const logCommand: Command;
export declare const worklogCommands: Command[];
