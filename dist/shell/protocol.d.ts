/**
 * Shell protocol
 *
 * The pure, framework-free half of the shell: the `Command` contract and
 * everything needed to parse a line, dispatch it, preview it and complete
 * it. No stores, no DOM — unit-testable in Node. Built-in commands live in
 * `commands.ts`, which re-exports this module.
 */
/**
 * A styled run of text inside an output line. Commands describe intent
 * (`id`, `key`, `muted`…); the Terminal maps tones to theme tokens.
 */
export type Span = {
    text: string;
    tone?: "id" | "id-rest" | "key" | "muted" | "accent" | "bold" | "code" | "error" | "warning";
    /** Struck through — an invalid proposal, a removed item. */
    strike?: boolean;
    /**
     * Makes the span clickable: click runs this line through the dispatcher
     * (so it lands in history), ⇧-click inserts it into the prompt instead.
     * Only attach navigational commands (select/open), never destructive ones.
     */
    command?: string;
    /**
     * Renders the span as a real link (`target="_blank" rel="noopener
     * noreferrer"`) instead of plain text. Only `http:`/`https:` are ever
     * honoured — `isAllowedLinkHref` (`$lib/shell/linkify.js`) is the
     * allowlist check the Terminal applies at render time, so a disallowed
     * scheme (`javascript:`, `data:`…) falls back to plain text rather than
     * being silently dropped or, worse, executed. Mutually exclusive with
     * `command` in practice — set one or the other, not both.
     */
    href?: string;
};
/**
 * What a partially typed line is about to do. Computed on every keystroke by
 * `previewFor` and published as `shell.preview` so surfaces can react — e.g.
 * a tile glows when it is the target, shows `hint`, or draws `ghost`.
 */
export type Intent = {
    /** Target reference as typed, e.g. `@3` or `#xp`. */
    target?: string;
    /** Short status such as `w 2 → 4` or `move ↑`. */
    hint?: string;
    /** Rectangle (grid units) the action would produce, for a dashed outline. */
    ghost?: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    /** Whether the action would be refused (overlap, edge…). */
    invalid?: boolean;
    /**
     * App-defined structured payload, passed through untouched to
     * `shell.preview` — for data a surface needs that doesn't belong in `hint`
     * (e.g. which row a half-typed `item 3` targets).
     */
    detail?: Record<string, unknown>;
};
export type OutputLine = {
    kind: "input" | "output" | "error" | "system" | "prose";
    /** Plain text of the line (spans joined), always present. */
    text: string;
    /** Optional styled runs; when present they are rendered instead of `text`. */
    spans?: Span[];
    /**
     * Hanging indent in characters: when the line wraps, continuation lines
     * start at this column — keeps two-column output readable in a narrow panel.
     */
    hang?: number;
};
export type PrintOptions = {
    hang?: number;
};
/**
 * Returned by `ctx.print` so a command can keep mutating the line it just
 * printed — the primitive a streaming command (an LLM answer, a progress
 * line…) needs. `set` replaces the content in place (keeping the line's
 * `kind`); `append` grows the text, and the last span's text when the line
 * carries spans. Neither pushes a new line, so streaming a line never
 * re-triggers scroll-to-bottom or the live-region announcement — those fire
 * once, when the block finishes.
 */
export type LineHandle = {
    set(text: string | Span[]): void;
    append(delta: string): void;
};
/**
 * A read-only view of one terminal block (a submitted line and its output),
 * for commands and apps that need the transcript — an LLM's rolling
 * context, "promote the last answer to a record". The Terminal owns the
 * real blocks; this is a snapshot shape.
 */
export type TerminalBlock = {
    id: number;
    /** The submitted line; undefined for the motd/system block. */
    input?: string;
    kind: "ack" | "data" | "error";
    running: boolean;
    lines: OutputLine[];
    startedAt: number;
    finishedAt?: number;
};
export type CommandContext = {
    print: (text: string | Span[], kind?: OutputLine["kind"], opts?: PrintOptions) => LineHandle;
    clear: () => void;
    commands: Command[];
    /** The terminal's blocks so far (oldest first), when a Terminal is dispatching; `[]` otherwise. */
    blocks?: readonly TerminalBlock[];
    /**
     * Aborted when the user cancels this line (Esc while its block is still
     * running) or the Terminal unmounts. A streaming `run` should pass this to
     * `fetch`, or check `signal.aborted` in its loop; when the resulting
     * rejection's `name` is `"AbortError"` the Terminal prints `cancelled`
     * instead of treating it as a command error.
     */
    signal: AbortSignal;
};
/** A declared flag. Drives completion, `help <command>`, and unknown-flag warnings. */
export type FlagSpec = {
    /** Long name without dashes, e.g. `width`. */
    name: string;
    /** Short alias without dash, e.g. `w`. */
    short?: string;
    description: string;
    /** Whether the flag expects a value (`--width 4`) or is boolean (`--optional`). */
    takesValue?: boolean;
    /** Static or computed value candidates for completion. */
    values?: string[] | (() => string[]);
};
/** A subcommand such as `customer new`; its flags extend the command's flags. */
export type SubcommandSpec = {
    name: string;
    aliases?: string[];
    description: string;
    flags?: FlagSpec[];
};
/** One completion candidate. `value` replaces the token being typed. */
export type Suggestion = {
    value: string;
    /** Human label shown next to the value, e.g. a customer name for `#xp`. */
    label?: string;
    description?: string;
    /** Grouping hint for the popup: command, subcommand, flag, value. */
    kind?: "command" | "subcommand" | "flag" | "value";
    /** Added to the fuzzy score; use small values (±1…3) to break ties. */
    boost?: number;
};
export type Command = {
    name: string;
    aliases?: string[];
    description: string;
    usage?: string;
    /** Flags valid for the whole command (subcommand flags add to these). */
    flags?: FlagSpec[];
    subcommands?: SubcommandSpec[];
    /**
     * Dynamic value completion. `args` is what `run` would receive, with the
     * token being typed as the last element (`""` after a trailing space).
     * Return candidates for that last token only; the engine fuzzy-ranks them.
     */
    complete?: (args: string[], commands: Command[]) => Suggestion[];
    /**
     * Context-dependent flags: return the flags valid for *these* args (e.g.
     * the target container's kind for `@2 set …`), or null to fall back to the
     * static `flags`/`subcommands` declaration. Drives completion AND
     * unknown-flag warnings, so both agree.
     */
    completeFlags?: (args: string[]) => FlagSpec[] | null;
    /**
     * Optional predicate for prefix-style commands such as `@2` or `#xpoa`.
     * When present it is consulted after the name/alias lookup fails; the raw
     * first token is then passed to `run` as `args[0]`.
     */
    match?: (token: string) => boolean;
    run: (args: string[], ctx: CommandContext) => void | Promise<void>;
    /**
     * Describe what `run(args)` would do, without doing it. Called on every
     * keystroke with the same `args` shape `run` gets; return null when there
     * is nothing to show. Must be pure and cheap.
     */
    preview?: (args: string[]) => Intent | null;
};
/**
 * Parsed flags of an argument list.
 *
 * `--name "Doe"` / `-w 4`   -> flags.name = "Doe", flags.w = "4"
 * `--optional` / `-u`       -> flags.optional = true (when no value follows,
 *                               or the next token is itself a flag)
 * everything else           -> positional, in order
 */
export type ParsedArgs = {
    positional: string[];
    flags: Record<string, string | true>;
};
/** Split `args` into positional tokens and `--long`/`-s` flags. */
export declare function parseArgs(args: string[]): ParsedArgs;
/** Read a flag by its long name or short alias, e.g. `flag(p, "width", "w")`. */
export declare function flag(parsed: ParsedArgs, long: string, short?: string): string | true | undefined;
/**
 * Tokenise a raw input line on whitespace, honouring `"…"` quoting anywhere
 * and `'…'` quoting when the opening `'` starts a token — see `scanQuoted`.
 */
export declare function tokenize(input: string): string[];
/**
 * Whether `caret` (an index into `input`) sits inside a `"…"`/`'…'` span
 * that hasn't been closed yet, per the exact rules `tokenize` uses. Drives
 * quote-aware completion: no suggestions, no preview churn, while the user
 * is still typing a quoted argument.
 */
export declare function inUnterminatedQuote(input: string, caret: number): boolean;
/** Flags known for `args` of a command: its own plus the matched subcommand's. */
/** Flags valid for `args`: the command's contextual answer, else the static declaration. */
export declare function flagsFor(command: Command, args: string[]): FlagSpec[];
export declare function knownFlags(command: Command, args: string[]): FlagSpec[];
/** Find the command a line would dispatch to, plus the args it would get. */
export declare function matchCommand(input: string, commands: Command[]): {
    command: Command;
    args: string[];
} | null;
/** Intent of a partially typed line, or null. Safe to call per keystroke. */
export declare function previewFor(input: string, commands: Command[]): Intent | null;
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
/** Print help rows styled: names in the key tone, hanging indent on wrapped descriptions. */
export declare function printHelpRows(rows: HelpRow[], ctx: CommandContext): void;
/**
 * Context-specific help rows for `command` given the `args` typed so far
 * (before any `-h`/`--help`, and before `help <command>`'s own name token) —
 * what `<command> <args…> -h` and `help <command> <args…>` both render, so
 * neither can drift from the other or from what completion would offer at
 * that exact point. Unlike `helpRows`, verbs come from live suggestions
 * (`complete`) instead of the static `subcommands` declaration alone, and
 * flags are bundled short+long on one line via `completeFlags(args)` (or
 * the static `flags`/subcommand-flags fallback — see `flagsFor`).
 */
export declare function helpRowsFor(command: Command, args: string[], commands: Command[]): HelpRow[];
/** Parse and dispatch a single input line against a command list. */
export declare function runCommand(input: string, commands: Command[], ctx: CommandContext): Promise<void>;
