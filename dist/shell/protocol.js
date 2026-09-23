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
/** Tokenise a raw input line on whitespace, honouring simple double-quoted spans. */
export function tokenize(input) {
    const tokens = [];
    let current = "";
    let inQuotes = false;
    for (const char of input) {
        if (char === '"') {
            inQuotes = !inQuotes;
            continue;
        }
        if (char === " " && !inQuotes) {
            if (current) {
                tokens.push(current);
                current = "";
            }
            continue;
        }
        current += char;
    }
    if (current)
        tokens.push(current);
    return tokens;
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
/** Parse and dispatch a single input line against a command list. */
export async function runCommand(input, commands, ctx) {
    const trimmed = input.trim();
    if (!trimmed)
        return;
    const [name, ...args] = tokenize(trimmed);
    const command = commands.find((c) => c.name === name || c.aliases?.includes(name));
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
