/**
 * The `case` tile kind. Registered by a consuming app (or the demo tiling
 * route) while mounted, exactly like `projectKind`/`worklogKind`.
 *
 * Content id scheme: `case:<slug>` — the `case:` table prefix follows the
 * same convention as `project:<id>`/`customer:<id>` (see `bareId` in
 * `$lib/tiling/ids.ts`, which strips it), so `#<slug>` resolves like any
 * other record once the slug is unique, and short ids never collide with
 * another kind's ids that happen to share a prefix.
 */

import type { KindSpec } from "$lib/tiling/kinds.svelte.js";
import type { Span } from "$lib/shell/protocol.js";
import { cases } from "./store.svelte.js";
import { caseContentId, slugOf } from "./ids.js";
import { resolveSection } from "$lib/reading/outline.js";
import CaseTile from "$lib/components/tiles/CaseTile.svelte";

export const caseKind: KindSpec = {
  kind: "case",
  // Large by default — reading needs width (see the reading spec's global
  // rules: `CaseStudy` wants a wide container to show its outline rail).
  size: { w: 6, h: 6 },
  label: (id) => cases.get(slugOf(id))?.title ?? "?",
  exists: (id) => !!cases.get(slugOf(id)),
  component: CaseTile,
  ids: () => cases.entries.map((e) => caseContentId(e.slug)),
  view: (id, level) => {
    const entry = cases.get(slugOf(id));
    if (!entry) return null;
    const rows = [{ label: "Title", value: entry.title }];
    if (level === "list") return rows;
    rows.push({ label: "Standfirst", value: entry.standfirst });
    rows.push({ label: "Tags", value: entry.tags.length > 0 ? entry.tags.map((t) => `#${t}`).join(" ") : "—" });
    if (entry.metric) rows.push({ label: entry.metric.label, value: entry.metric.value });
    return rows;
  },
  context: (id) => {
    const entry = cases.get(slugOf(id));
    if (!entry) return "";
    const lines = [entry.title, entry.standfirst];
    if (entry.tags.length > 0) lines.push(`tags: ${entry.tags.join(", ")}`);
    if (entry.metric) lines.push(`${entry.metric.label}: ${entry.metric.value}${entry.metric.detail ? ` (${entry.metric.detail})` : ""}`);
    return lines.join("\n");
  },
  actions: [
    {
      name: "toc",
      description: "Print the case's outline",
      run: (id, _args, ctx) => {
        const handle = cases.outline(slugOf(id));
        const outline = handle?.entries() ?? [];
        if (outline.length === 0) {
          ctx.print("(no outline)", "output");
          return;
        }
        // The full slug, not the (possibly shorter) computed short id: still
        // resolves — `kinds.resolve` matches an exact bare id first — and
        // keeps the printed command predictable regardless of what else is
        // registered.
        const ref = `#${slugOf(id)}`;
        for (const entry of outline) {
          const prefix = entry.number ? `${entry.number} ` : "";
          const spans: Span[] = [
            { text: `${"  ".repeat(Math.max(0, entry.level - 2))}${prefix}${entry.label}`, command: `${ref} goto ${entry.id}` },
          ];
          ctx.print(spans, "output");
        }
      },
    },
    {
      name: "goto",
      description: "Scroll the case tile to a section (id, number or title)",
      run: (id, args, ctx) => {
        const query = args.join(" ");
        if (!query) {
          ctx.print("usage: goto <section id | number | title>", "error");
          return;
        }
        const handle = cases.outline(slugOf(id));
        if (!handle) {
          ctx.print(`${slugOf(id)} is not open in a tile`, "error");
          return;
        }
        const target = resolveSection(handle.entries(), query);
        if (!target) {
          ctx.print(`no such section: ${query} (try toc)`, "error");
          return;
        }
        handle.goto(target);
      },
    },
  ],
  preview: (_id, args) => {
    if (args[0] === "toc") return { hint: "toc" };
    if (args[0] === "goto" && args[1]) return { hint: `goto ${args[1]}` };
    return null;
  },
};

export { caseContentId, slugOf };
