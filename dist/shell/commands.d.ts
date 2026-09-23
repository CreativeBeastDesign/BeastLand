/**
 * Shell commands
 *
 * The command registry powering the Terminal organism. Commands read/write
 * the shared `shell` store so any surface (terminal, top bar, showcase) stays
 * in sync with what's typed here.
 */
import { type Command } from "./protocol.js";
export * from "./protocol.js";
/**
 * One line of help output: either a plain `text` line or a two-column row
 * (`name` padded to `width`, then `text`, with a hanging indent). `help`
 * prints these styled; `helpText()` renders the same rows as plain text, so
 * whatever embeds the grammar elsewhere (an LLM system prompt) can't drift
 * from what the user sees.
 */
export type HelpRow = {
    text: string;
    kind?: "output" | "system";
} | {
    indent: number;
    name: string;
    width: number;
    text: string;
};
/** `help <command>` as rows: usage, description, subcommands (with their own flags), then flags. */
export declare function helpRows(command: Command): HelpRow[];
/** Bare `help` as rows: every command with its aliases and description. */
export declare function helpIndexRows(commands: Command[]): HelpRow[];
/** Plain-text `help <command>` — exactly the lines the terminal prints, unstyled. */
export declare function helpText(command: Command): string;
/** Plain-text `help` index over `commands` (prefix commands included, as `help` lists them). */
export declare function helpIndex(commands: Command[]): string;
export declare const shellCommands: Command[];
