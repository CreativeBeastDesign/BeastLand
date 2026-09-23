/**
 * Auto-closing quotes for the Terminal prompt.
 *
 * Pure, framework-free: given the current value and selection, decide what
 * typing a quote (or a Backspace next to one) should do. No DOM — the
 * Terminal calls this from its keydown handler and applies the result.
 */
export type AutoPairResult = {
    value: string;
    caret: number;
};
/**
 * What typing `key` (`"` or `'`) should do to `value`, given the current
 * selection `[selStart, selEnd)`. Returns `null` when the quote should just
 * be inserted literally (let the caller fall through to default behaviour).
 *
 * Rules:
 * - a selection is wrapped in quotes rather than paired;
 * - typing the same quote that's already immediately after the caret steps
 *   over it instead of inserting another;
 * - never pairs when the next character is a non-space word character
 *   (typing a quote mid-word inserts just that character);
 * - `'` only opens a pair at a token boundary (start of input or right
 *   after whitespace) so apostrophes in prose (`don't`) aren't paired.
 */
export declare function applyAutoPair(value: string, selStart: number, selEnd: number, key: string): AutoPairResult | null;
/**
 * What pressing Backspace at `caret` (no selection) should do to `value`:
 * delete both characters of an empty quote pair (`""`/`''`) straddling the
 * caret, or `null` to fall back to a normal single-character delete.
 */
export declare function applyAutoPairBackspace(value: string, caret: number): AutoPairResult | null;
