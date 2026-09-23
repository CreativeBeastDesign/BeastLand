/**
 * Shell protocol
 *
 * The pure, framework-free half of the shell: the `Command` contract and
 * everything needed to parse a line, dispatch it, preview it and complete
 * it. No stores, no DOM — unit-testable in Node. Built-in commands live in
 * `commands.ts`, which re-exports this module.
 */

import { indexCommands } from "./command-index.js";

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
  ghost?: { x: number; y: number; w: number; h: number };
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

export type PrintOptions = { hang?: number };

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
export function parseArgs(args: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags: Record<string, string | true> = {};

  for (let i = 0; i < args.length; i++) {
    const token = args[i];
    const isFlag = token.startsWith("-") && token.length > 1 && !/^-\d/.test(token);
    if (!isFlag) {
      positional.push(token);
      continue;
    }

    const key = token.replace(/^--?/, "");
    const eq = key.indexOf("=");
    if (eq !== -1) {
      flags[key.slice(0, eq)] = key.slice(eq + 1);
      continue;
    }

    const next = args[i + 1];
    const nextIsFlag = next !== undefined && next.startsWith("-") && next.length > 1 && !/^-\d/.test(next);
    if (next === undefined || nextIsFlag) {
      flags[key] = true;
    } else {
      flags[key] = next;
      i++;
    }
  }

  return { positional, flags };
}

/** Read a flag by its long name or short alias, e.g. `flag(p, "width", "w")`. */
export function flag(parsed: ParsedArgs, long: string, short?: string): string | true | undefined {
  return parsed.flags[long] ?? (short ? parsed.flags[short] : undefined);
}

/** A raw token plus whether any of it came from inside `"…"`/`'…'` quoting. */
type QuotedToken = { value: string; quoted: boolean };

/**
 * Shared quoting state machine behind `tokenize` and `inUnterminatedQuote`:
 * `"` always opens/closes a span; `'` only opens one at a token boundary
 * (start of input or right after whitespace) so apostrophes in prose
 * (`don't`) stay literal — once open, either quote reads everything
 * (including spaces) up to its matching close. Scans only the first `limit`
 * characters of `input`, so the same code answers "what is `caret` inside".
 * Each token also records whether it was (partly) quoted — the help-flag
 * interception in `runCommand` needs this to tell a literal `"-h"` argument
 * (data) from the bare `-h` flag (a request for help).
 */
function scanQuoted(input: string, limit: number): { tokens: QuotedToken[]; openQuote: '"' | "'" | null } {
  const tokens: QuotedToken[] = [];
  let current = "";
  let currentQuoted = false;
  let quote: '"' | "'" | null = null;
  let atTokenStart = true;

  for (let i = 0; i < limit; i++) {
    const char = input[i];
    if (quote) {
      if (char === quote) {
        quote = null;
        atTokenStart = false;
      } else {
        current += char;
      }
      continue;
    }
    if (char === '"' || (char === "'" && atTokenStart)) {
      quote = char;
      currentQuoted = true;
      atTokenStart = false;
      continue;
    }
    if (char === " ") {
      if (current) {
        tokens.push({ value: current, quoted: currentQuoted });
        current = "";
        currentQuoted = false;
      }
      atTokenStart = true;
      continue;
    }
    current += char;
    atTokenStart = false;
  }
  if (current) tokens.push({ value: current, quoted: currentQuoted });

  return { tokens, openQuote: quote };
}

/**
 * Tokenise a raw input line on whitespace, honouring `"…"` quoting anywhere
 * and `'…'` quoting when the opening `'` starts a token — see `scanQuoted`.
 */
export function tokenize(input: string): string[] {
  return scanQuoted(input, input.length).tokens.map((t) => t.value);
}

/** Like `tokenize`, but keeps each token's quoted-ness alongside its text. */
function tokenizeDetailed(input: string): QuotedToken[] {
  return scanQuoted(input, input.length).tokens;
}

/**
 * Whether `caret` (an index into `input`) sits inside a `"…"`/`'…'` span
 * that hasn't been closed yet, per the exact rules `tokenize` uses. Drives
 * quote-aware completion: no suggestions, no preview churn, while the user
 * is still typing a quoted argument.
 */
export function inUnterminatedQuote(input: string, caret: number): boolean {
  const limit = Math.max(0, Math.min(caret, input.length));
  return scanQuoted(input, limit).openQuote !== null;
}

/** Flags known for `args` of a command: its own plus the matched subcommand's. */
/** Flags valid for `args`: the command's contextual answer, else the static declaration. */
export function flagsFor(command: Command, args: string[]): FlagSpec[] {
  return command.completeFlags?.(args) ?? knownFlags(command, args);
}

export function knownFlags(command: Command, args: string[]): FlagSpec[] {
  // Prefix commands (`@2 set …`) carry the raw token in args[0]; the
  // subcommand then sits at args[1].
  const subToken = command.match && command.match(args[0] ?? "") ? args[1] : args[0];
  const sub = command.subcommands?.find((s) => s.name === subToken || s.aliases?.includes(subToken));
  return [...(command.flags ?? []), ...(sub?.flags ?? [])];
}

/**
 * Print a muted warning for flags the command did not declare. Only active
 * when the command declares flags at all; never blocks execution.
 */
function warnUnknownFlags(command: Command, args: string[], ctx: CommandContext) {
  if (!command.flags && !command.subcommands && !command.completeFlags) return;
  const known = flagsFor(command, args);
  const names = new Set(known.flatMap((f) => [f.name, ...(f.short ? [f.short] : [])]));
  for (const key of Object.keys(parseArgs(args).flags)) {
    if (!names.has(key)) ctx.print(`unknown flag: ${key.length === 1 ? "-" : "--"}${key}`, "system");
  }
}

/** Find the command a line would dispatch to, plus the args it would get. */
export function matchCommand(
  input: string,
  commands: Command[],
): { command: Command; args: string[] } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const [name, ...args] = tokenize(trimmed);
  const { byName, matchers } = indexCommands(commands);
  const byNameHit = byName.get(name);
  if (byNameHit) return { command: byNameHit, args };
  const prefixed = matchers.find((c) => c.match?.(name));
  if (prefixed) return { command: prefixed, args: [name, ...args] };
  return null;
}

/** Intent of a partially typed line, or null. Safe to call per keystroke. */
export function previewFor(input: string, commands: Command[]): Intent | null {
  const matched = matchCommand(input, commands);
  if (!matched?.command.preview) return null;
  try {
    return matched.command.preview(matched.args);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Help rendering
//
// Two flavours share the row/print machinery below:
//  - the STATIC manual (`helpRows`/`helpText`/`helpIndex`): the command's
//    declared `subcommands` (with their own nested flags, aliases combined
//    into one column) and `flags`. This is what bare `help <command>` has
//    always printed — unchanged, so existing consumers don't reflow.
//  - the CONTEXTUAL renderer (`helpRowsFor`): what `<command> [args…] -h`
//    (any depth, intercepted centrally in `runCommand`) and `help <command>
//    [args…]` (when args are given) print instead — the verbs/flags valid
//    for those exact `args`, computed the same way completion would
//    (`complete`/`completeFlags`), so it can never drift from what the
//    popup offers. Flags in this flavour are bundled short+long on one row
//    (`-a, --all`), not the long-first `--all, -a` the static manual uses.
// ---------------------------------------------------------------------------

/**
 * One line of help output: either a plain `text` line or a two-column row
 * (`name` padded to `width`, then `text`, with a hanging indent). `help`
 * prints these styled; `helpText()` renders the same rows as plain text, so
 * whatever embeds the grammar elsewhere (an LLM system prompt) can't drift
 * from what the user sees.
 */
export type HelpRow = { text: string; kind?: "output" | "system" } | { indent: number; name: string; width: number; text: string };

const HELP_GAP = 2;

function padName(command: Command): string {
  return [command.name, ...(command.aliases ?? [])].join(", ");
}

/** `--width, -w <value>` — the left column of a static flag help line. */
function flagLabel(f: FlagSpec): string {
  const names = [`--${f.name}`, ...(f.short ? [`-${f.short}`] : [])].join(", ");
  return f.takesValue ? `${names} <value>` : names;
}

function flagRows(flags: FlagSpec[], indent: number): HelpRow[] {
  if (flags.length === 0) return [];
  const labels = flags.map(flagLabel);
  const width = Math.max(...labels.map((l) => l.length));
  return flags.map((f, i) => ({ indent, name: labels[i], width, text: f.description }));
}

/** `help <command>` as rows: usage, description, subcommands (with their own flags), then flags. */
export function helpRows(command: Command): HelpRow[] {
  const rows: HelpRow[] = [{ text: `usage: ${command.usage ?? command.name}` }, { text: command.description }];

  if (command.subcommands && command.subcommands.length > 0) {
    rows.push({ text: "" }, { text: "subcommands:" });
    const labels = command.subcommands.map((s) => [s.name, ...(s.aliases ?? [])].join(", "));
    const width = Math.max(...labels.map((l) => l.length));
    command.subcommands.forEach((s, i) => {
      rows.push({ indent: 2, name: labels[i], width, text: s.description });
      if (s.flags && s.flags.length > 0) rows.push(...flagRows(s.flags, 6));
    });
  }

  if (command.flags && command.flags.length > 0) {
    rows.push({ text: "" }, { text: "flags:" }, ...flagRows(command.flags, 2));
  }
  return rows;
}

/** Bare `help` as rows: every command with its aliases and description. */
export function helpIndexRows(commands: Command[]): HelpRow[] {
  const width = Math.max(0, ...commands.map((c) => padName(c).length));
  return [
    { text: "commands:" },
    ...commands.map((c): HelpRow => ({ indent: 2, name: padName(c), width, text: c.description })),
    { text: "" },
    { text: "help <command> shows its subcommands and flags", kind: "system" },
  ];
}

function rowText(row: HelpRow): string {
  if ("name" in row) return `${" ".repeat(row.indent)}${row.name.padEnd(row.width)}${" ".repeat(HELP_GAP)}${row.text}`;
  return row.text;
}

/** Plain-text `help <command>` — exactly the lines the terminal prints, unstyled. */
export function helpText(command: Command): string {
  return helpRows(command).map(rowText).join("\n");
}

/** Plain-text `help` index over `commands` (prefix commands included, as `help` lists them). */
export function helpIndex(commands: Command[]): string {
  return helpIndexRows(commands).map(rowText).join("\n");
}

/** Print help rows styled: names in the key tone, hanging indent on wrapped descriptions. */
export function printHelpRows(rows: HelpRow[], ctx: CommandContext) {
  for (const row of rows) {
    if ("name" in row) {
      ctx.print(
        [
          { text: " ".repeat(row.indent) },
          { text: row.name.padEnd(row.width), tone: "key" },
          { text: " ".repeat(HELP_GAP) + row.text },
        ],
        "output",
        { hang: row.indent + row.width + HELP_GAP },
      );
    } else {
      ctx.print(row.text, row.kind ?? "output");
    }
  }
}

/**
 * The verbs/actions `complete` would offer right after `args` — i.e. what
 * typing `<command> <args…> ` (a trailing space) would show in the popup,
 * filtered to `kind: "subcommand"` (both declared `subcommands` and a
 * kind's dynamic `actions`, which suggestion-producing helpers also tag
 * `"subcommand"` — see `actionSuggestions`). Static subcommands only apply
 * in the same position `candidatesFor` would show them: right after the
 * command name (or, for a prefix command, right after its raw token).
 */
function verbSuggestionsFor(command: Command, args: string[], commands: Command[]): Suggestion[] {
  const probe = [...args, ""];
  const out: Suggestion[] = [];
  const atSubPosition = probe.length === 1 || (command.match !== undefined && probe.length === 2);
  if (atSubPosition) {
    for (const s of command.subcommands ?? []) out.push({ value: s.name, description: s.description, kind: "subcommand" });
  }
  if (command.complete) out.push(...command.complete(probe, commands));

  const seen = new Set<string>();
  return out.filter((s) => {
    if (s.kind !== "subcommand" || seen.has(s.value)) return false;
    seen.add(s.value);
    return true;
  });
}

/** `-l, --limit <value>` — the left column of a bundled (short+long) flag help line. */
function bundledFlagLabel(f: FlagSpec): string {
  const names = f.short ? [`-${f.short}`, `--${f.name}`] : [`--${f.name}`];
  return f.takesValue ? `${names.join(", ")} <value>` : names.join(", ");
}

function bundledFlagRows(flags: FlagSpec[], indent: number): HelpRow[] {
  if (flags.length === 0) return [];
  const labels = flags.map(bundledFlagLabel);
  const width = Math.max(...labels.map((l) => l.length));
  return flags.map((f, i) => ({ indent, name: labels[i], width, text: f.description }));
}

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
export function helpRowsFor(command: Command, args: string[], commands: Command[]): HelpRow[] {
  const rows: HelpRow[] = [{ text: `usage: ${command.usage ?? command.name}` }, { text: command.description }];

  const verbs = verbSuggestionsFor(command, args, commands);
  if (verbs.length > 0) {
    rows.push({ text: "" }, { text: "subcommands:" });
    const width = Math.max(...verbs.map((v) => v.value.length));
    for (const v of verbs) rows.push({ indent: 2, name: v.value, width, text: v.description ?? "" });
  }

  const flags = flagsFor(command, args);
  if (flags.length > 0) {
    rows.push({ text: "" }, { text: "flags:" }, ...bundledFlagRows(flags, 2));
  }
  return rows;
}

/** Whether `command` already claims `-h`/`--help` itself, at this position — then we must not hijack it. */
function definesHelpFlag(command: Command, args: string[]): boolean {
  return flagsFor(command, args).some((f) => f.short === "h" || f.name === "help");
}

/**
 * Index of an unquoted `-h`/`--help` token in `args`, or -1. `tokens` is
 * `args` with quote info, same length and order (see `tokenizeDetailed`) —
 * a literal `"-h"` argument (data, not a flag) must not trigger help.
 */
function helpFlagIndex(args: string[], tokens: QuotedToken[]): number {
  return args.findIndex((a, i) => !tokens[i]?.quoted && (a === "-h" || a === "--help"));
}

/**
 * If `args` (with `tokens` carrying quote info in the same positions) asks
 * for help — an unquoted trailing `-h`/`--help` the command hasn't claimed
 * for itself — print it and report that dispatch should stop there.
 */
function maybeInterceptHelp(
  command: Command,
  args: string[],
  tokens: QuotedToken[],
  commands: Command[],
  ctx: CommandContext,
): boolean {
  const idx = helpFlagIndex(args, tokens);
  if (idx === -1) return false;
  const before = args.slice(0, idx);
  if (definesHelpFlag(command, before)) return false;
  printHelpRows(helpRowsFor(command, before, commands), ctx);
  return true;
}

/** Parse and dispatch a single input line against a command list. */
export async function runCommand(
  input: string,
  commands: Command[],
  ctx: CommandContext,
): Promise<void> {
  const trimmed = input.trim();
  if (!trimmed) return;

  const detailed = tokenizeDetailed(trimmed);
  const [nameToken, ...restTokens] = detailed;
  const name = nameToken.value;
  const args = restTokens.map((t) => t.value);

  const command = commands.find(
    (c) => c.name === name || c.aliases?.includes(name),
  );

  if (command) {
    if (maybeInterceptHelp(command, args, restTokens, commands, ctx)) return;
    warnUnknownFlags(command, args, ctx);
    await command.run(args, ctx);
    return;
  }

  // Prefix-style commands (`@2 …`, `#xpoa …`) receive the raw token as args[0].
  const prefixed = commands.find((c) => c.match?.(name));
  if (prefixed) {
    // Same shape `run`, `complete` and `completeFlags` see: raw token first.
    const fullArgs = [name, ...args];
    if (maybeInterceptHelp(prefixed, fullArgs, detailed, commands, ctx)) return;
    warnUnknownFlags(prefixed, fullArgs, ctx);
    await prefixed.run(fullArgs, ctx);
    return;
  }

  ctx.print(`command not found: ${name}`, "error");
}

