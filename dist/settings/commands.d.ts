/**
 * Settings commands
 *
 * One command, `settings` (alias `prefs`): opens the settings tile (spawning
 * it on first use, selecting it if it's already open — the same `open`
 * every other singleton tile kind uses, see `worklogCommands`'s `log`), and
 * optionally selects a section by id.
 */
import type { Command } from "../shell/protocol.js";
export declare const settingsCommands: Command[];
