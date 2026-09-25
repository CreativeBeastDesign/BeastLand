/**
 * Case commands
 *
 * A single terminal command, `case` (alias `cases`), mirroring
 * `src/lib/project/commands.ts`: `case list` (default), `case open <slug>`,
 * `case toc [slug]`. Registered into the shell via
 * `registry.register(caseCommands)`.
 *
 * `#<slug>` (no `case` prefix) still opens/selects the case via the generic
 * `#<id>` command in `$lib/tiling/workspace-commands.ts` — it works for free
 * once `caseKind` is registered with `ids`. Its `toc`/`goto` verbs likewise
 * work as `@n toc` / `#<slug> goto <id>` for free through `KindSpec.actions`
 * (see `caseKind`) — `case toc [slug]` here is only a convenience so a user
 * doesn't have to know which `@n`/`#id` a case landed on.
 */

import { kinds } from "$lib/tiling/kinds.svelte.js";
import { workspace } from "$lib/tiling/workspace.svelte.js";
import {
  idSpans,
  padSpans,
  printAmbiguous,
  recordSuggestions,
  say,
  spanText,
} from "$lib/tiling/workspace-commands.js";
import type { Command, CommandContext, Span, Suggestion } from "$lib/shell/commands.js";
import { cases } from "./store.svelte.js";
import { caseKind, caseContentId, slugOf } from "./kind.js";

/** Truncate to `max` chars, adding an ellipsis when it doesn't fit. */
function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, Math.max(0, max - 1))}…` : text;
}

/** Resolve `#swsk` / `swsk` (bare slug) input to a slug, printing errors. */
function resolveSlug(token: string, ctx: CommandContext): string | null {
  const direct = cases.get(token);
  if (direct) return direct.slug;

  const resolved = kinds.resolve(token.startsWith("#") ? token : `#${token}`);
  if (!resolved) {
    ctx.print(`unknown case: ${token}`, "error");
    return null;
  }
  if ("ambiguous" in resolved) {
    printAmbiguous(resolved.ambiguous, ctx);
    return null;
  }
  if (resolved.kind !== "case") {
    ctx.print(`${token} is not a case`, "error");
    return null;
  }
  return slugOf(resolved.id);
}

function printCaseList(ctx: CommandContext) {
  if (cases.entries.length === 0) {
    ctx.print("(no cases)", "output");
    return;
  }
  const idWidth = Math.max(...cases.entries.map((e) => spanText(idSpans(caseContentId(e.slug))).length));
  const titleWidth = Math.max(...cases.entries.map((e) => e.title.length));
  for (const entry of cases.entries) {
    const spans: Span[] = [
      ...padSpans(idSpans(caseContentId(entry.slug)), idWidth),
      { text: "  " },
      { text: entry.title.padEnd(titleWidth + 2) },
      { text: truncate(entry.standfirst, 60), tone: "muted" },
    ];
    ctx.print(spans, "output");
  }
}

function printToc(slugArg: string | undefined, ctx: CommandContext) {
  let contentId: string;
  if (slugArg) {
    const slug = resolveSlug(slugArg, ctx);
    if (!slug) return;
    contentId = caseContentId(slug);
  } else if (workspace.selected?.kind === "case") {
    contentId = workspace.selected.contentId;
  } else {
    ctx.print("usage: case toc <slug> (or select a case tile)", "error");
    return;
  }
  const toc = caseKind.actions?.find((a) => a.name === "toc");
  toc?.run(contentId, [], ctx);
}

function caseSuggestions(): Suggestion[] {
  return recordSuggestions("case");
}

export const caseCommand: Command = {
  name: "case",
  aliases: ["cases"],
  description: "List, open, or browse the outline of registered case studies",
  usage: "case [list] | case open <slug> | case toc [slug]",
  subcommands: [
    { name: "list", aliases: ["ls"], description: "List registered cases" },
    { name: "open", description: "Open a case study tile" },
    { name: "toc", description: "Print a case's outline" },
  ],
  complete: (args) => {
    if (args.length === 1) return caseSuggestions();
    if (args.length === 2 && (args[0] === "open" || args[0] === "toc")) return caseSuggestions();
    return [];
  },
  run: (args, ctx) => {
    const [head, ...rest] = args;

    if (!head || head === "list" || head === "ls") {
      printCaseList(ctx);
      return;
    }

    if (head === "open") {
      const token = rest[0];
      if (!token) {
        ctx.print("usage: case open <slug>", "error");
        return;
      }
      const slug = resolveSlug(token, ctx);
      if (!slug) return;
      const container = workspace.open("case", caseContentId(slug));
      say(ctx, "selected ", caseContentId(slug), ` @${container.id}`);
      return;
    }

    if (head === "toc") {
      printToc(rest[0], ctx);
      return;
    }

    ctx.print(`unknown case command: ${head}`, "error");
  },
  preview: (args) => {
    if (args[0] === "open" && args[1]) {
      const rect = workspace.peekSpawnFor("case");
      return { ghost: rect, hint: "spawn" };
    }
    return null;
  },
};

export const caseCommands: Command[] = [caseCommand];
