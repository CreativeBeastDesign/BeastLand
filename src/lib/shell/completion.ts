/**
 * Completion engine
 *
 * Pure functions: given the line being typed and the command list, produce
 * ranked suggestions for the token under the cursor. The Terminal renders
 * them; commands contribute candidates through `flags`, `subcommands` and
 * `complete(args)`. No DOM, no state.
 */

import { flagsFor, tokenize, type Command, type Suggestion } from "./protocol.js";

// ---------------------------------------------------------------------------
// Fuzzy scoring (fzf-style subsequence match)
// ---------------------------------------------------------------------------

const BONUS_CONSECUTIVE = 8;
const BONUS_WORD_START = 6;
const BONUS_PREFIX = 10;
const PENALTY_GAP = 1;

function isWordStart(text: string, i: number): boolean {
  if (i === 0) return true;
  const prev = text[i - 1];
  return prev === " " || prev === "-" || prev === "_" || prev === ":" || prev === "." || prev === "#" || prev === "@";
}

/**
 * Score `query` against `candidate`; null when the query is not a
 * subsequence. Higher is better. Case-insensitive; an exact prefix and
 * consecutive/word-start matches score highest.
 */
export function fuzzyScore(query: string, candidate: string): number | null {
  const q = query.toLowerCase();
  const c = candidate.toLowerCase();
  if (q.length === 0) return 0;
  if (q.length > c.length) return null;

  let score = 0;
  let ci = 0;
  let lastMatch = -1;
  for (let qi = 0; qi < q.length; qi++) {
    const idx = c.indexOf(q[qi], ci);
    if (idx === -1) return null;
    if (lastMatch !== -1) {
      if (idx === lastMatch + 1) score += BONUS_CONSECUTIVE;
      else score -= (idx - lastMatch - 1) * PENALTY_GAP;
    }
    if (isWordStart(c, idx)) score += BONUS_WORD_START;
    lastMatch = idx;
    ci = idx + 1;
  }
  if (c.startsWith(q)) score += BONUS_PREFIX;
  // Shorter candidates win ties.
  score -= (c.length - q.length) * 0.1;
  return score;
}

/** Rank suggestions by fuzzy score of `query` against value and label. */
export function rank(query: string, suggestions: Suggestion[], limit = 8): Suggestion[] {
  const scored = suggestions
    .map((s) => {
      // A match on the value is primary; a label match (e.g. a customer
      // name for `#xp`) counts, but at half weight so aliases never beat
      // the real name they alias.
      const byValue = fuzzyScore(query, s.value);
      // `#rob` should find "Rob Van Der Linden": drop a leading sigil when
      // matching against the label.
      const labelQuery = query.replace(/^[#@]/, "");
      const byLabel = s.label ? fuzzyScore(labelQuery, s.label) : null;
      let best: number | null = null;
      if (byValue !== null) best = byValue;
      if (byLabel !== null) best = Math.max(best ?? -Infinity, byLabel * 0.5 - 1);
      return { s, score: best === null ? null : best + (s.boost ?? 0) };
    })
    .filter((x): x is { s: Suggestion; score: number } => x.score !== null);
  scored.sort((a, b) => b.score - a.score || a.s.value.localeCompare(b.s.value));
  const seen = new Set<string>();
  const out: Suggestion[] = [];
  for (const { s } of scored) {
    if (seen.has(s.value)) continue;
    seen.add(s.value);
    out.push(s);
    if (out.length >= limit) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Candidate collection
// ---------------------------------------------------------------------------

/** Split the input into completed tokens and the partial token under the cursor. */
export function splitInput(input: string): { tokens: string[]; partial: string } {
  const tokens = tokenize(input);
  if (input.length === 0) return { tokens: [], partial: "" };
  if (/\s$/.test(input)) return { tokens, partial: "" };
  return { tokens: tokens.slice(0, -1), partial: tokens[tokens.length - 1] ?? "" };
}

function flagSuggestions(command: Command, args: string[]): Suggestion[] {
  return flagsFor(command, args).flatMap((f) => {
    const out: Suggestion[] = [
      { value: `--${f.name}`, description: f.description, kind: "flag", boost: 1 },
    ];
    if (f.short) out.push({ value: `-${f.short}`, label: `--${f.name}`, description: f.description, kind: "flag" });
    return out;
  });
}

/** The flag spec a token names, if any. */
function flagByToken(command: Command, args: string[], token: string | undefined) {
  if (!token || !token.startsWith("-")) return undefined;
  const key = token.replace(/^--?/, "").split("=")[0];
  return flagsFor(command, args).find((f) => f.name === key || f.short === key);
}

/**
 * Completion state when a flag wants a value: either its declared values,
 * or `"free"` (a value is required but nothing can be suggested — show
 * nothing rather than listing unrelated flags), or null.
 */
function valueContext(command: Command, args: string[]): Suggestion[] | "free" | null {
  const partial = args[args.length - 1];
  // `--status dra|` → values of the flag before the partial.
  const prev = flagByToken(command, args, args[args.length - 2]);
  if (prev?.takesValue) {
    if (!prev.values) return "free";
    const values = typeof prev.values === "function" ? prev.values() : prev.values;
    return values.map((v) => ({ value: v, kind: "value" }));
  }
  // `-w|` — the token IS a complete value-taking flag: the next thing to
  // type is its value, so completions would only be noise.
  const exact = flagByToken(command, args, partial);
  if (exact?.takesValue && (partial === `--${exact.name}` || partial === `-${exact.short}`)) return "free";
  return null;
}

/**
 * All candidates for the token being typed, already ranked. Empty when the
 * input is empty or nothing matches.
 */
export function candidatesFor(input: string, commands: Command[], limit = 8): Suggestion[] {
  const { tokens, partial } = splitInput(input);
  if (tokens.length === 0 && partial.length === 0) return [];

  // First token: command names, aliases — or a prefix command's own completion.
  if (tokens.length === 0) {
    const prefixed = commands.find((c) => c.match?.(partial) && c.complete);
    if (prefixed) return rank(partial, prefixed.complete!([partial], commands), limit);

    const names = commands
      .filter((c) => !c.match)
      .flatMap((c) => [
        { value: c.name, description: c.description, kind: "command" as const },
        ...(c.aliases ?? []).map((a) => ({ value: a, label: c.name, description: c.description, kind: "command" as const })),
      ]);
    const ranked = rank(partial, names, limit);
    return ranked.some((s) => s.value === partial) ? [] : ranked;
  }

  const [name, ...rest] = tokens;
  const command =
    commands.find((c) => c.name === name || c.aliases?.includes(name)) ??
    commands.find((c) => c.match?.(name));
  if (!command) return [];

  // Prefix commands get the raw first token as args[0], like `run` does.
  const args = command.match && !(command.name === name || command.aliases?.includes(name))
    ? [name, ...rest, partial]
    : [...rest, partial];

  const out: Suggestion[] = [];

  // A flag waiting for its value: its declared values, or nothing at all.
  const valueState = valueContext(command, args);
  if (valueState === "free") return [];
  if (valueState) return rank(partial, valueState, limit);

  // Subcommands, only in the second position.
  if (args.length === 1 || (command.match && args.length === 2)) {
    for (const s of command.subcommands ?? []) {
      out.push({ value: s.name, description: s.description, kind: "subcommand" });
      for (const a of s.aliases ?? []) out.push({ value: a, label: s.name, description: s.description, kind: "subcommand" });
    }
  }

  // Dynamic values from the command.
  if (command.complete) out.push(...command.complete(args, commands));

  // Flags: always available, but when the partial does not start with `-`
  // they only appear if nothing else matches (keeps value lists clean).
  const flags = flagSuggestions(command, args);
  if (partial.startsWith("-")) out.unshift(...flags);
  const ranked = rank(partial, out, limit);
  const result = ranked.length > 0 || partial.startsWith("-") ? ranked : rank(partial, flags, limit);
  // The token already IS one of the candidates: nothing left to complete.
  return result.some((s) => s.value === partial) ? [] : result;
}

/**
 * Apply a suggestion: replace the partial token with `value` and append a
 * space so typing can continue.
 */
export function applySuggestion(input: string, value: string): string {
  const { partial } = splitInput(input);
  const base = partial.length === 0 ? input : input.slice(0, input.length - partial.length);
  return `${base}${value} `;
}
