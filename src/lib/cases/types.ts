/**
 * Cases domain types
 *
 * A `CaseEntry` is what a consuming app registers: the same `CaseSummary`
 * `CaseCard`/`CaseIndex` render (slug, title, standfirst, tags, metric) plus
 * the Svelte component that renders the full case study body (typically a
 * `CaseStudy` wired up with `Section`/`Callout`/`Pipeline`/… — see
 * `$lib/reading`). BeastLand never looks inside `component`; it only mounts
 * it inside `CaseTile`.
 */

import type { Component } from "svelte";
import type { CaseSummary, OutlineEntry } from "$lib/reading/types.js";

export type CaseEntry = CaseSummary & { component: Component<Record<string, never>> };

/**
 * Live outline bridge for one open case tile — `CaseTile` attaches one via
 * `cases.attach(slug, handle)` so the terminal (`@n toc` / `@n goto <id>`)
 * can read and drive the same `createOutlineSpy` the tile itself uses.
 */
export type CaseOutlineHandle = {
  entries: () => OutlineEntry[];
  activeId: () => string | null;
  goto: (id: string) => void;
};
