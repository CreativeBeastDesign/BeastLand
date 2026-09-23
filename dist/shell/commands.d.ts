/**
 * Shell commands
 *
 * The command registry powering the Terminal organism. Commands read/write
 * the shared `shell` store so any surface (terminal, top bar, showcase) stays
 * in sync with what's typed here.
 */
import { type Command } from "./protocol.js";
export * from "./protocol.js";
export * from "./undo.svelte.js";
export declare const shellCommands: Command[];
