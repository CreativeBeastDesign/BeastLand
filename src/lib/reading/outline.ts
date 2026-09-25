/**
 * Outline discovery — pure DOM/logic helpers behind the Outline DOM contract:
 * a section root carries `id`, `data-outline`, `data-outline-level`,
 * `data-outline-label`, and optional `data-outline-number`. No context API,
 * no store — `Outline`/`CaseStudy` call these directly and `outlineSpy`
 * wraps them with a `MutationObserver` + scroll listener.
 */

import type { OutlineEntry } from "./types.js";

/** Reads `[data-outline]` descendants of `root`, in document order. */
export function collectOutline(root: ParentNode): OutlineEntry[] {
  const nodes = root.querySelectorAll("[data-outline]");
  const entries: OutlineEntry[] = [];

  for (const node of nodes) {
    const id = node.getAttribute("id");
    if (!id) continue;
    const label = node.getAttribute("data-outline-label") ?? "";
    const levelAttr = node.getAttribute("data-outline-level");
    const level = levelAttr ? Number(levelAttr) : 2;
    const number = node.getAttribute("data-outline-number") ?? undefined;
    entries.push({ id, label, level: Number.isFinite(level) ? level : 2, number });
  }

  return entries;
}

/**
 * Pure: the id of the last entry whose `top` is at or above `threshold`,
 * i.e. the innermost/most-recent heading currently "passed". Falls back to
 * the first entry when none has scrolled past yet. `null` when `entries`
 * is empty. Document order (as returned by `collectOutline`) means the last
 * matching entry is naturally the innermost/most specific one.
 */
export function activeEntry(entries: { id: string; top: number }[], threshold: number): string | null {
  if (entries.length === 0) return null;

  let active: string | null = null;
  for (const entry of entries) {
    if (entry.top <= threshold) active = entry.id;
  }

  return active ?? entries[0].id;
}

/** Scroll progress in `[0, 1]`. Guards a zero/negative scrollable extent. */
export function scrollProgress(scrollTop: number, scrollHeight: number, clientHeight: number): number {
  const extent = scrollHeight - clientHeight;
  if (extent <= 0) return 0;
  return Math.min(1, Math.max(0, scrollTop / extent));
}

/**
 * First ancestor of `node` with overflow-y auto|scroll, or `null` when none
 * is found (meaning the window itself is the scroll root). Deliberately does
 * not require the ancestor to overflow *yet*: a tile whose content arrives
 * after mount is still the scroller. `<html>`/`<body>` map to `null`, since
 * their scroll events fire on `window`.
 */
export function nearestScrollRoot(node: Element): Element | null {
  let el: Element | null = node.parentElement;
  const doc = node.ownerDocument;

  while (el && el !== doc?.body && el !== doc?.documentElement) {
    const overflowY = getComputedStyle(el).overflowY;
    if (overflowY === "auto" || overflowY === "scroll") return el;
    el = el.parentElement;
  }

  return null;
}

/**
 * Resolves what a reader types (`goto 3`, `goto 03`, `goto details`,
 * `goto lorem-details`) to an outline entry id. Tries, in order: exact id,
 * section number (leading zeros ignored), case-insensitive label, then a
 * unique id-suffix / label-prefix match. `null` when nothing or more than
 * one entry matches.
 */
export function resolveSection(entries: OutlineEntry[], query: string): string | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const exact = entries.find((e) => e.id === query);
  if (exact) return exact.id;
  const num = (n: string) => n.replace(/^0+(?=\d)/, "");
  const byNumber = entries.filter((e) => e.number !== undefined && num(e.number.toLowerCase()) === num(q));
  if (byNumber.length === 1) return byNumber[0].id;
  const byLabel = entries.filter((e) => e.label.toLowerCase() === q);
  if (byLabel.length === 1) return byLabel[0].id;
  const fuzzy = entries.filter((e) => e.id.toLowerCase().endsWith(q) || e.label.toLowerCase().startsWith(q));
  return fuzzy.length === 1 ? fuzzy[0].id : null;
}
