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

/**
 * Shared quoting state machine behind `tokenize` and `inUnterminatedQuote`:
 * `"` always opens/closes a span; `'` only opens one at a token boundary
 * (start of input or right after whitespace) so apostrophes in prose
 * (`don't`) stay literal — once open, either quote reads everything
 * (including spaces) up to its matching close. Scans only the first `limit`
 * characters of `input`, so the same code answers "what is `caret` inside".
 */
function scanQuoted(input: string, limit: number): { tokens: string[]; openQuote: '"' | "'" | null } {
  const tokens: string[] = [];
  let current = "";
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
      atTokenStart = false;
      continue;
    }
    if (char === " ") {
      if (current) {
        tokens.push(current);
        current = "";
      }
      atTokenStart = true;
      continue;
    }
    current += char;
    atTokenStart = false;
  }
  if (current) tokens.push(current);

  return { tokens, openQuote: quote };
}

/**
 * Tokenise a raw input line on whitespace, honouring `"…"` quoting anywhere
 * and `'…'` quoting when the opening `'` starts a token — see `scanQuoted`.
 */
export function tokenize(input: string): string[] {
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

/** Parse and dispatch a single input line against a command list. */
export async function runCommand(
  input: string,
  commands: Command[],
  ctx: CommandContext,
): Promise<void> {
  const trimmed = input.trim();
  if (!trimmed) return;

  const [name, ...args] = tokenize(trimmed);
  const command = commands.find(
    (c) => c.name === name || c.aliases?.includes(name),
  );

  if (command) {
    warnUnknownFlags(command, args, ctx);
    await command.run(args, ctx);
    return;
  }

  // Prefix-style commands (`@2 …`, `#xpoa …`) receive the raw token as args[0].
  const prefixed = commands.find((c) => c.match?.(name));
  if (prefixed) {
    // Same shape `run`, `complete` and `completeFlags` see: raw token first.
    warnUnknownFlags(prefixed, [name, ...args], ctx);
    await prefixed.run([name, ...args], ctx);
    return;
  }

  ctx.print(`command not found: ${name}`, "error");
}

