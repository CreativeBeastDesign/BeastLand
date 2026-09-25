/**
 * Content ids for the `case` kind. Kept in their own module (no imports) so
 * `CaseTile` can use them without importing `kind.ts`, which imports
 * `CaseTile` — that cycle crashed on module load.
 */

const PREFIX = "case:";

/** `case:swsk` → `swsk`. */
export function slugOf(contentId: string): string {
  return contentId.startsWith(PREFIX) ? contentId.slice(PREFIX.length) : contentId;
}

/** `swsk` → `case:swsk`. */
export function caseContentId(slug: string): string {
  return `${PREFIX}${slug}`;
}
