/**
 * Auto-closing quotes for the Terminal prompt.
 *
 * Pure, framework-free: given the current value and selection, decide what
 * typing a quote (or a Backspace next to one) should do. No DOM — the
 * Terminal calls this from its keydown handler and applies the result.
 */

export type AutoPairResult = { value: string; caret: number };

const QUOTES = new Set(['"', "'"]);

function isWordChar(ch: string | undefined): boolean {
  return ch !== undefined && /\w/.test(ch);
}

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
export function applyAutoPair(value: string, selStart: number, selEnd: number, key: string): AutoPairResult | null {
  if (!QUOTES.has(key)) return null;

  if (selStart !== selEnd) {
    const before = value.slice(0, selStart);
    const selected = value.slice(selStart, selEnd);
    const after = value.slice(selEnd);
    return { value: `${before}${key}${selected}${key}${after}`, caret: selEnd + 2 };
  }

  const before = value.slice(0, selStart);
  const after = value.slice(selStart);
  const nextChar = after[0];

  // Typing the closing quote of a pair already sitting under the caret:
  // step over it rather than inserting a second one.
  if (nextChar === key) return { value, caret: selStart + 1 };

  if (isWordChar(nextChar)) return null;

  if (key === "'") {
    const prevChar = before[before.length - 1];
    const atTokenStart = prevChar === undefined || /\s/.test(prevChar);
    if (!atTokenStart) return null;
  }

  return { value: `${before}${key}${key}${after}`, caret: selStart + 1 };
}

/**
 * What pressing Backspace at `caret` (no selection) should do to `value`:
 * delete both characters of an empty quote pair (`""`/`''`) straddling the
 * caret, or `null` to fall back to a normal single-character delete.
 */
export function applyAutoPairBackspace(value: string, caret: number): AutoPairResult | null {
  const prev = value[caret - 1];
  const next = value[caret];
  if (prev !== undefined && prev === next && QUOTES.has(prev)) {
    return { value: value.slice(0, caret - 1) + value.slice(caret + 1), caret: caret - 1 };
  }
  return null;
}
