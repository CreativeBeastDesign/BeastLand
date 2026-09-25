/**
 * Cases store
 *
 * In-memory registry of `CaseEntry` records, the same shape as
 * `$lib/project/store.svelte.ts` but with nothing persisted — a portfolio
 * app owns its case content (usually static, imported components) and
 * re-registers it on every load, the way `kinds.register`/`registry.register`
 * work rather than the way `$lib/project`'s CRUD store does.
 *
 * Also holds the live outline bridge: `attach`/`outline` let `CaseTile`
 * publish its `createOutlineSpy` handle for one open tile, so kind actions
 * (`@n toc`, `@n goto <id>`) can read/drive it without importing anything
 * component-shaped.
 */

import { untrack } from "svelte";
import type { CaseEntry, CaseOutlineHandle } from "./types.js";

function createCases() {
  let entries = $state<CaseEntry[]>([]);

  // Not `$state`: read only from command handlers (imperative), never bound
  // into a template, so it doesn't need to be reactive.
  const outlines = new Map<string, CaseOutlineHandle>();

  /** Register one or more entries; replaces any existing entry with the same slug. */
  function register(input: CaseEntry | CaseEntry[]): () => void {
    const added = Array.isArray(input) ? input : [input];
    const slugs = new Set(added.map((e) => e.slug));
    // Untracked: callers register from an `$effect` (like `kinds.register`),
    // which must not subscribe to the list it writes.
    untrack(() => {
      entries = [...entries.filter((e) => !slugs.has(e.slug)), ...added];
    });
    return () => {
      untrack(() => {
        entries = entries.filter((e) => !added.includes(e));
      });
    };
  }

  function get(slug: string): CaseEntry | undefined {
    return entries.find((e) => e.slug === slug);
  }

  function slugs(): string[] {
    return entries.map((e) => e.slug);
  }

  /** Publish the outline handle for an open tile showing `slug`; call the result to detach it. */
  function attach(slug: string, handle: CaseOutlineHandle): () => void {
    outlines.set(slug, handle);
    return () => {
      if (outlines.get(slug) === handle) outlines.delete(slug);
    };
  }

  function outline(slug: string): CaseOutlineHandle | undefined {
    return outlines.get(slug);
  }

  return {
    get entries(): readonly CaseEntry[] {
      return entries;
    },

    register,
    get,
    slugs,
    attach,
    outline,
  };
}

export const cases = createCases();
