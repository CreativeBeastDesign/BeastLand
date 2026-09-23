/**
 * Shell protocol
 *
 * The pure, framework-free half of the shell: the `Command` contract and
 * everything needed to parse a line, dispatch it, preview it and complete
 * it. No stores, no DOM — unit-testable in Node. Built-in commands live in
 * `commands.ts`, which re-exports this module.
 */
import { indexCommands } from "./command-index.js";
/** Split `args` into positional tokens and `--long`/`-s` flags. */
export function parseArgs(args) {
    const positional = [];
    const flags = {};
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
        }
        else {
            flags[key] = next;
            i++;
        }
    }
    return { positional, flags };
}
/** Read a flag by its long name or short alias, e.g. `flag(p, "width", "w")`. */
export function flag(parsed, long, short) {
    return parsed.flags[long] ?? (short ? parsed.flags[short] : undefined);
}
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
function scanQuoted(input, limit) {
    const tokens = [];
    let current = "";
    let currentQuoted = false;
    let quote = null;
    let atTokenStart = true;
    for (let i = 0; i < limit; i++) {
        const char = input[i];
        if (quote) {
            if (char === quote) {
                quote = null;
                atTokenStart = false;
            }
            else {
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
    if (current)
        tokens.push({ value: current, quoted: currentQuoted });
    return { tokens, openQuote: quote };
}
/**
 * Tokenise a raw input line on whitespace, honouring `"…"` quoting anywhere
 * and `'…'` quoting when the opening `'` starts a token — see `scanQuoted`.
 */
export function tokenize(input) {
    return scanQuoted(input, input.length).tokens.map((t) => t.value);
}
/** Like `tokenize`, but keeps each token's quoted-ness alongside its text. */
function tokenizeDetailed(input) {
    return scanQuoted(input, input.length).tokens;
}
/**
 * Whether `caret` (an index into `input`) sits inside a `"…"`/`'…'` span
 * that hasn't been closed yet, per the exact rules `tokenize` uses. Drives
 * quote-aware completion: no suggestions, no preview churn, while the user
 * is still typing a quoted argument.
 */
export function inUnterminatedQuote(input, caret) {
    const limit = Math.max(0, Math.min(caret, input.length));
    return scanQuoted(input, limit).openQuote !== null;
}
/** Flags known for `args` of a command: its own plus the matched subcommand's. */
/** Flags valid for `args`: the command's contextual answer, else the static declaration. */
export function flagsFor(command, args) {
    return command.completeFlags?.(args) ?? knownFlags(command, args);
}
export function knownFlags(command, args) {
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
function warnUnknownFlags(command, args, ctx) {
    if (!command.flags && !command.subcommands && !command.completeFlags)
        return;
    const known = flagsFor(command, args);
    const names = new Set(known.flatMap((f) => [f.name, ...(f.short ? [f.short] : [])]));
    for (const key of Object.keys(parseArgs(args).flags)) {
        if (!names.has(key))
            ctx.print(`unknown flag: ${key.length === 1 ? "-" : "--"}${key}`, "system");
    }
}
/** Find the command a line would dispatch to, plus the args it would get. */
export function matchCommand(input, commands) {
    const trimmed = input.trim();
    if (!trimmed)
        return null;
    const [name, ...args] = tokenize(trimmed);
    const { byName, matchers } = indexCommands(commands);
    const byNameHit = byName.get(name);
    if (byNameHit)
        return { command: byNameHit, args };
    const prefixed = matchers.find((c) => c.match?.(name));
    if (prefixed)
        return { command: prefixed, args: [name, ...args] };
    return null;
}
/** Intent of a partially typed line, or null. Safe to call per keystroke. */
export function previewFor(input, commands) {
    const matched = matchCommand(input, commands);
    if (!matched?.command.preview)
        return null;
    try {
        return matched.command.preview(matched.args);
    }
    catch {
        return null;
    }
}
const HELP_GAP = 2;
function padName(command) {
    return [command.name, ...(command.aliases ?? [])].join(", ");
}
/** `--width, -w <value>` — the left column of a static flag help line. */
function flagLabel(f) {
    const names = [`--${f.name}`, ...(f.short ? [`-${f.short}`] : [])].join(", ");
    return f.takesValue ? `${names} <value>` : names;
}
function flagRows(flags, indent) {
    if (flags.length === 0)
        return [];
    const labels = flags.map(flagLabel);
    const width = Math.max(...labels.map((l) => l.length));
    return flags.map((f, i) => ({ indent, name: labels[i], width, text: f.description }));
}
/** `help <command>` as rows: usage, description, subcommands (with their own flags), then flags. */
export function helpRows(command) {
    const rows = [{ text: `usage: ${command.usage ?? command.name}` }, { text: command.description }];
    if (command.subcommands && command.subcommands.length > 0) {
        rows.push({ text: "" }, { text: "subcommands:" });
        const labels = command.subcommands.map((s) => [s.name, ...(s.aliases ?? [])].join(", "));
        const width = Math.max(...labels.map((l) => l.length));
        command.subcommands.forEach((s, i) => {
            rows.push({ indent: 2, name: labels[i], width, text: s.description });
            if (s.flags && s.flags.length > 0)
                rows.push(...flagRows(s.flags, 6));
        });
    }
    if (command.flags && command.flags.length > 0) {
        rows.push({ text: "" }, { text: "flags:" }, ...flagRows(command.flags, 2));
    }
    return rows;
}
/** Bare `help` as rows: every command with its aliases and description. */
export function helpIndexRows(commands) {
    const width = Math.max(0, ...commands.map((c) => padName(c).length));
    return [
        { text: "commands:" },
        ...commands.map((c) => ({ indent: 2, name: padName(c), width, text: c.description })),
        { text: "" },
        { text: "help <command> shows its subcommands and flags", kind: "system" },
    ];
}
function rowText(row) {
    if ("name" in row)
        return `${" ".repeat(row.indent)}${row.name.padEnd(row.width)}${" ".repeat(HELP_GAP)}${row.text}`;
    return row.text;
}
/** Plain-text `help <command>` — exactly the lines the terminal prints, unstyled. */
export function helpText(command) {
    return helpRows(command).map(rowText).join("\n");
}
/** Plain-text `help` index over `commands` (prefix commands included, as `help` lists them). */
export function helpIndex(commands) {
    return helpIndexRows(commands).map(rowText).join("\n");
}
/** Print help rows styled: names in the key tone, hanging indent on wrapped descriptions. */
export function printHelpRows(rows, ctx) {
    for (const row of rows) {
        if ("name" in row) {
            ctx.print([
                { text: " ".repeat(row.indent) },
                { text: row.name.padEnd(row.width), tone: "key" },
                { text: " ".repeat(HELP_GAP) + row.text },
            ], "output", { hang: row.indent + row.width + HELP_GAP });
        }
        else {
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
function verbSuggestionsFor(command, args, commands) {
    const probe = [...args, ""];
    const out = [];
    const atSubPosition = probe.length === 1 || (command.match !== undefined && probe.length === 2);
    if (atSubPosition) {
        for (const s of command.subcommands ?? [])
            out.push({ value: s.name, description: s.description, kind: "subcommand" });
    }
    if (command.complete)
        out.push(...command.complete(probe, commands));
    const seen = new Set();
    return out.filter((s) => {
        if (s.kind !== "subcommand" || seen.has(s.value))
            return false;
        seen.add(s.value);
        return true;
    });
}
/** `-l, --limit <value>` — the left column of a bundled (short+long) flag help line. */
function bundledFlagLabel(f) {
    const names = f.short ? [`-${f.short}`, `--${f.name}`] : [`--${f.name}`];
    return f.takesValue ? `${names.join(", ")} <value>` : names.join(", ");
}
function bundledFlagRows(flags, indent) {
    if (flags.length === 0)
        return [];
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
export function helpRowsFor(command, args, commands) {
    const rows = [{ text: `usage: ${command.usage ?? command.name}` }, { text: command.description }];
    const verbs = verbSuggestionsFor(command, args, commands);
    if (verbs.length > 0) {
        rows.push({ text: "" }, { text: "subcommands:" });
        const width = Math.max(...verbs.map((v) => v.value.length));
        for (const v of verbs)
            rows.push({ indent: 2, name: v.value, width, text: v.description ?? "" });
    }
    const flags = flagsFor(command, args);
    if (flags.length > 0) {
        rows.push({ text: "" }, { text: "flags:" }, ...bundledFlagRows(flags, 2));
    }
    return rows;
}
/** Whether `command` already claims `-h`/`--help` itself, at this position — then we must not hijack it. */
function definesHelpFlag(command, args) {
    return flagsFor(command, args).some((f) => f.short === "h" || f.name === "help");
}
/**
 * Index of an unquoted `-h`/`--help` token in `args`, or -1. `tokens` is
 * `args` with quote info, same length and order (see `tokenizeDetailed`) —
 * a literal `"-h"` argument (data, not a flag) must not trigger help.
 */
function helpFlagIndex(args, tokens) {
    return args.findIndex((a, i) => !tokens[i]?.quoted && (a === "-h" || a === "--help"));
}
/**
 * If `args` (with `tokens` carrying quote info in the same positions) asks
 * for help — an unquoted trailing `-h`/`--help` the command hasn't claimed
 * for itself — print it and report that dispatch should stop there.
 */
function maybeInterceptHelp(command, args, tokens, commands, ctx) {
    const idx = helpFlagIndex(args, tokens);
    if (idx === -1)
        return false;
    const before = args.slice(0, idx);
    if (definesHelpFlag(command, before))
        return false;
    printHelpRows(helpRowsFor(command, before, commands), ctx);
    return true;
}
/** Parse and dispatch a single input line against a command list. */
export async function runCommand(input, commands, ctx) {
    const trimmed = input.trim();
    if (!trimmed)
        return;
    const detailed = tokenizeDetailed(trimmed);
    const [nameToken, ...restTokens] = detailed;
    const name = nameToken.value;
    const args = restTokens.map((t) => t.value);
    const command = commands.find((c) => c.name === name || c.aliases?.includes(name));
    if (command) {
        if (maybeInterceptHelp(command, args, restTokens, commands, ctx))
            return;
        warnUnknownFlags(command, args, ctx);
        await command.run(args, ctx);
        return;
    }
    // Prefix-style commands (`@2 …`, `#xpoa …`) receive the raw token as args[0].
    const prefixed = commands.find((c) => c.match?.(name));
    if (prefixed) {
        // Same shape `run`, `complete` and `completeFlags` see: raw token first.
        const fullArgs = [name, ...args];
        if (maybeInterceptHelp(prefixed, fullArgs, detailed, commands, ctx))
            return;
        warnUnknownFlags(prefixed, fullArgs, ctx);
        await prefixed.run(fullArgs, ctx);
        return;
    }
    ctx.print(`command not found: ${name}`, "error");
}
