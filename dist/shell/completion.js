/**
 * Completion engine
 *
 * Pure functions: given the line being typed and the command list, produce
 * ranked suggestions for the token under the cursor. The Terminal renders
 * them; commands contribute candidates through `flags`, `subcommands` and
 * `complete(args)`. No DOM, no state.
 */
import { indexCommands } from "./command-index.js";
import { flagsFor, inUnterminatedQuote, tokenize } from "./protocol.js";
// ---------------------------------------------------------------------------
// Fuzzy scoring (fzf-style subsequence match)
// ---------------------------------------------------------------------------
const BONUS_CONSECUTIVE = 8;
const BONUS_WORD_START = 6;
const BONUS_PREFIX = 10;
const PENALTY_GAP = 1;
function isWordStart(text, i) {
    if (i === 0)
        return true;
    const prev = text[i - 1];
    return prev === " " || prev === "-" || prev === "_" || prev === ":" || prev === "." || prev === "#" || prev === "@";
}
/**
 * Score `query` against `candidate`; null when the query is not a
 * subsequence. Higher is better. Case-insensitive; an exact prefix and
 * consecutive/word-start matches score highest.
 */
export function fuzzyScore(query, candidate) {
    return fuzzyScoreLower(query.toLowerCase(), candidate);
}
/**
 * Same as `fuzzyScore`, but takes an already-lowercased query. `rank` calls
 * this directly so the same query isn't re-lowercased for every candidate in
 * the list — a per-keystroke hot path over the whole command/suggestion set.
 */
function fuzzyScoreLower(q, candidate) {
    const c = candidate.toLowerCase();
    if (q.length === 0)
        return 0;
    if (q.length > c.length)
        return null;
    let score = 0;
    let ci = 0;
    let lastMatch = -1;
    for (let qi = 0; qi < q.length; qi++) {
        const idx = c.indexOf(q[qi], ci);
        if (idx === -1)
            return null;
        if (lastMatch !== -1) {
            if (idx === lastMatch + 1)
                score += BONUS_CONSECUTIVE;
            else
                score -= (idx - lastMatch - 1) * PENALTY_GAP;
        }
        if (isWordStart(c, idx))
            score += BONUS_WORD_START;
        lastMatch = idx;
        ci = idx + 1;
    }
    if (c.startsWith(q))
        score += BONUS_PREFIX;
    // Shorter candidates win ties.
    score -= (c.length - q.length) * 0.1;
    return score;
}
/** Rank suggestions by fuzzy score of `query` against value and label. */
export function rank(query, suggestions, limit = 8) {
    // Hoisted out of the loop: same for every suggestion, so lowercase/strip
    // once per `rank` call instead of once per candidate.
    const q = query.toLowerCase();
    // `#rob` should find "Rob Van Der Linden": drop a leading sigil when
    // matching against the label.
    const labelQuery = q.replace(/^[#@]/, "");
    const scored = suggestions
        .map((s) => {
        // A match on the value is primary; a label match (e.g. a customer
        // name for `#xp`) counts, but at half weight so aliases never beat
        // the real name they alias.
        const byValue = fuzzyScoreLower(q, s.value);
        const byLabel = s.label ? fuzzyScoreLower(labelQuery, s.label) : null;
        let best = null;
        if (byValue !== null)
            best = byValue;
        if (byLabel !== null)
            best = Math.max(best ?? -Infinity, byLabel * 0.5 - 1);
        return { s, score: best === null ? null : best + (s.boost ?? 0) };
    })
        .filter((x) => x.score !== null);
    scored.sort((a, b) => b.score - a.score || a.s.value.localeCompare(b.s.value));
    const seen = new Set();
    const out = [];
    for (const { s } of scored) {
        if (seen.has(s.value))
            continue;
        seen.add(s.value);
        out.push(s);
        if (out.length >= limit)
            break;
    }
    return out;
}
// ---------------------------------------------------------------------------
// Candidate collection
// ---------------------------------------------------------------------------
/** Split the input into completed tokens and the partial token under the cursor. */
export function splitInput(input) {
    const tokens = tokenize(input);
    if (input.length === 0)
        return { tokens: [], partial: "" };
    // A trailing space only ends a token outside quotes — inside an
    // unterminated `"…"`/`'…'` it's part of the value still being typed, so
    // `tokenize` folds it (and everything since the opening quote) into the
    // last token, which is exactly the partial we want here.
    if (/\s$/.test(input) && !inUnterminatedQuote(input, input.length))
        return { tokens, partial: "" };
    return { tokens: tokens.slice(0, -1), partial: tokens[tokens.length - 1] ?? "" };
}
/**
 * One suggestion per flag, labelled `-a, --all` (or just `--all` when there
 * is no short form) — never a separate row per alias. `partial` decides
 * which spelling gets inserted: a single leading `-` inserts the short form
 * when one exists, `--` (or no dash yet) inserts the long form.
 */
function flagSuggestions(command, args, partial) {
    const wantsShort = partial.startsWith("-") && !partial.startsWith("--");
    return flagsFor(command, args).map((f) => {
        const long = `--${f.name}`;
        const short = f.short ? `-${f.short}` : undefined;
        return {
            value: wantsShort && short ? short : long,
            label: short ? `${short}, ${long}` : long,
            description: f.description,
            kind: "flag",
            boost: 1,
        };
    });
}
/** The flag spec a token names, if any. */
function flagByToken(command, args, token) {
    if (!token || !token.startsWith("-"))
        return undefined;
    const key = token.replace(/^--?/, "").split("=")[0];
    return flagsFor(command, args).find((f) => f.name === key || f.short === key);
}
/**
 * Completion state when a flag wants a value: either its declared values,
 * or `"free"` (a value is required but nothing can be suggested — show
 * nothing rather than listing unrelated flags), or null.
 */
function valueContext(command, args) {
    const partial = args[args.length - 1];
    // `--status dra|` → values of the flag before the partial.
    const prev = flagByToken(command, args, args[args.length - 2]);
    if (prev?.takesValue) {
        if (!prev.values)
            return "free";
        const values = typeof prev.values === "function" ? prev.values() : prev.values;
        return values.map((v) => ({ value: v, kind: "value" }));
    }
    // `-w|` — the token IS a complete value-taking flag: the next thing to
    // type is its value, so completions would only be noise.
    const exact = flagByToken(command, args, partial);
    if (exact?.takesValue && (partial === `--${exact.name}` || partial === `-${exact.short}`))
        return "free";
    return null;
}
/**
 * All candidates for the token being typed, already ranked. Empty when the
 * input is empty or nothing matches.
 */
export function candidatesFor(input, commands, limit = 8) {
    // Nothing to suggest while a quoted argument is still open — the token
    // being typed is free text, not a command/flag/value name.
    if (inUnterminatedQuote(input, input.length))
        return [];
    const { tokens, partial } = splitInput(input);
    if (tokens.length === 0 && partial.length === 0)
        return [];
    // First token: command names, aliases — or a prefix command's own completion.
    if (tokens.length === 0) {
        const prefixed = commands.find((c) => c.match?.(partial) && c.complete);
        if (prefixed)
            return rank(partial, prefixed.complete([partial], commands), limit);
        const names = commands
            .filter((c) => !c.match)
            .flatMap((c) => [
            { value: c.name, description: c.description, kind: "command" },
            ...(c.aliases ?? []).map((a) => ({ value: a, label: c.name, description: c.description, kind: "command" })),
        ]);
        const ranked = rank(partial, names, limit);
        return ranked.some((s) => s.value === partial) ? [] : ranked;
    }
    const [name, ...rest] = tokens;
    const { byName, matchers } = indexCommands(commands);
    const command = byName.get(name) ?? matchers.find((c) => c.match?.(name));
    if (!command)
        return [];
    // Prefix commands get the raw first token as args[0], like `run` does.
    const args = command.match && !(command.name === name || command.aliases?.includes(name))
        ? [name, ...rest, partial]
        : [...rest, partial];
    const out = [];
    // A flag waiting for its value: its declared values, or nothing at all.
    const valueState = valueContext(command, args);
    if (valueState === "free")
        return [];
    if (valueState)
        return rank(partial, valueState, limit);
    // Subcommands, only in the second position.
    if (args.length === 1 || (command.match && args.length === 2)) {
        for (const s of command.subcommands ?? []) {
            out.push({ value: s.name, description: s.description, kind: "subcommand" });
            for (const a of s.aliases ?? [])
                out.push({ value: a, label: s.name, description: s.description, kind: "subcommand" });
        }
    }
    // Dynamic values from the command.
    if (command.complete)
        out.push(...command.complete(args, commands));
    // Flags: always available, but when the partial does not start with `-`
    // they only appear if nothing else matches (keeps value lists clean).
    const flags = flagSuggestions(command, args, partial);
    if (partial.startsWith("-"))
        out.unshift(...flags);
    const ranked = rank(partial, out, limit);
    const result = ranked.length > 0 || partial.startsWith("-") ? ranked : rank(partial, flags, limit);
    // The token already IS one of the candidates: nothing left to complete.
    return result.some((s) => s.value === partial) ? [] : result;
}
/**
 * Apply a suggestion: replace the partial token with `value` and append a
 * space so typing can continue.
 */
export function applySuggestion(input, value) {
    const { partial } = splitInput(input);
    const base = partial.length === 0 ? input : input.slice(0, input.length - partial.length);
    return `${base}${value} `;
}
