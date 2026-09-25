/**
 * Section-number display: every dot-separated numeric segment is padded to
 * two digits, so nested numbers line up with top-level ones
 * (`1` → `01`, `2.1` → `02.01`, `"3.12"` → `03.12`). Segments that aren't
 * plain digits (a letter prefix, a range) are kept as given.
 */
export function formatSectionNumber(value: string | number | undefined): string | undefined {
  if (value === undefined) return undefined;
  return String(value)
    .split(".")
    .map((segment) => (/^\d$/.test(segment) ? segment.padStart(2, "0") : segment))
    .join(".");
}
