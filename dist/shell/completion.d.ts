/**
 * Completion engine
 *
 * Pure functions: given the line being typed and the command list, produce
 * ranked suggestions for the token under the cursor. The Terminal renders
 * them; commands contribute candidates through `flags`, `subcommands` and
 * `complete(args)`. No DOM, no state.
 */
import { type Command, type Suggestion } from "./protocol.js";
/**
 * Score `query` against `candidate`; null when the query is not a
 * subsequence. Higher is better. Case-insensitive; an exact prefix and
 * consecutive/word-start matches score highest.
 */
export declare function fuzzyScore(query: string, candidate: string): number | null;
/** Rank suggestions by fuzzy score of `query` against value and label. */
export declare function rank(query: string, suggestions: Suggestion[], limit?: number): Suggestion[];
/** Split the input into completed tokens and the partial token under the cursor. */
export declare function splitInput(input: string): {
    tokens: string[];
    partial: string;
};
/**
 * All candidates for the token being typed, already ranked. Empty when the
 * input is empty or nothing matches.
 */
export declare function candidatesFor(input: string, commands: Command[], limit?: number): Suggestion[];
/**
 * Apply a suggestion: replace the partial token with `value` and append a
 * space so typing can continue.
 */
export declare function applySuggestion(input: string, value: string): string;
