/**
 * Prose lines
 *
 * `OutputLine.kind === "prose"` renders in the UI font with light inline
 * markdown instead of the terminal's monospace/pre-wrap output. This module
 * turns that text into the same `Span[]` shape every other output line
 * uses, so the Terminal needs no separate rendering path. Pure — no Svelte
 * imports — so it is unit-testable in Node and reusable outside the
 * Terminal.
 *
 * Handled, deliberately little more: `**bold**`, `` `inline code` `` (mono),
 * fenced ``` blocks (mono/pre; a `beast`/`sh` info string makes each
 * non-empty line a runnable command span, like the existing `beast`/`sh`
 * fences), and refs (`@12`, `#xp`) turned into clickable `id` spans exactly
 * like ids in data output. Not a markdown renderer — no nesting, no lists,
 * no links.
 */
import type { Span } from "./protocol.js";
/** Fence info strings whose lines are commands, not code. */
export declare const RUNNABLE_FENCE_LANGS: ReadonlySet<string>;
/**
 * A ref (`@12`, `#xp`), word-boundaried so it doesn't fire inside an
 * identifier or an email (`a@b`), and at least 2 chars after `#`. Exported
 * as a source string because every consumer needs its own `lastIndex`; this
 * is the one definition of the grammar, shared with `$lib/markdown/refs.ts`.
 */
export declare const REF_SOURCE: string;
/** A fresh global matcher for refs. */
export declare function refMatcher(): RegExp;
/** Verdict on one proposed command line (a runnable fence line). */
export type LineVerdict = {
    ok: true;
} | {
    ok: false;
    reason: string;
};
export type ProseOptions = {
    /**
     * Validate each runnable fence line before it becomes clickable. An
     * invalid line renders struck through in the error tone with its reason
     * after it, and carries no `command` — the human sees why before anything
     * can run. Apps check proposals against the command registry here.
     */
    validate?: (line: string) => LineVerdict;
};
/** Is this fence info string one whose lines are commands? */
export declare function isRunnableFenceInfo(info: string | undefined): boolean;
/** Spans for one runnable fence line: clickable, or struck through with its reason. */
export declare function commandLineSpans(line: string, validate?: ProseOptions["validate"]): Span[];
/** Turn prose `text` into the `Span[]` the Terminal renders a line from. */
export declare function proseSpans(text: string, opts?: ProseOptions): Span[];
