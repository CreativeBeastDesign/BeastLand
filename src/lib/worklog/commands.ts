/**
 * Work log commands
 *
 * A single terminal command, `log` (alias `l`), covering the whole slice:
 * list/print the timeline, start/stop tracking, add a historical entry,
 * remove one, and open the tile. Registered into the shell via
 * `registry.register(worklogCommands)` from the tiling route.
 *
 * Unlike `customer`/`docs`, `log` targets are not `#`-addressable records —
 * the worklog tile is a single virtual content id (`WORKLOG_CONTENT_ID`).
 * `log start`/`log add` instead take an *optional* `#id` of a document (and,
 * after it, an item ref) or a project — to attribute the entry to.
 */

import { kinds } from "$lib/tiling/kinds.svelte.js";
import { data } from "$lib/data/store.svelte.js";
import { workspace } from "$lib/tiling/workspace.svelte.js";
import { shortId } from "$lib/tiling/ids.js";
import { itemLabels, resolveItemRef, formatDate } from "$lib/data/format.js";
import {
  flag,
  parseArgs,
  type Command,
  type CommandContext,
  type FlagSpec,
  type Intent,
  type ParsedArgs,
  type Span,
  type Suggestion,
} from "$lib/shell/commands.js";
import { worklog, clock } from "./store.svelte.js";
import { entryMinutes, formatDuration, dayKey, timeOfDay, type WorkEntry } from "./types.js";
import { WORKLOG_CONTENT_ID } from "./kind.js";

// ---------------------------------------------------------------------------
// Shared helpers (mirror the style of `$lib/tiling/commands.ts`)
// ---------------------------------------------------------------------------

/** `#` + the shortest unique prefix of a full record id (plain text, for messages). */
function sid(id: string): string {
  return `#${shortId(id, kinds.allIds).short}`;
}

/** `#fa` bold + dimmed tail, as spans for styled output. Clicking runs `#fa`. */
function idSpans(id: string): Span[] {
  const parts = shortId(id, kinds.allIds);
  return [
    { text: `#${parts.short}`, tone: "id", command: `#${parts.short}` },
    { text: parts.rest, tone: "id-rest" },
  ];
}

function printAmbiguous(ids: string[], ctx: CommandContext) {
  const labels = ids.map((id) => `#${shortId(id, kinds.allIds).short}…`);
  ctx.print(`ambiguous: ${labels.join(" ")}`, "error");
}

/** `3` / `a` label for an entry's item, via the document's own numbering. */
function itemLabelFor(entry: Pick<WorkEntry, "documentId" | "itemIndex">): string | null {
  if (!entry.documentId || entry.itemIndex === null) return null;
  const doc = data.getDocument(entry.documentId);
  if (!doc) return null;
  return itemLabels(doc.items)[entry.itemIndex - 1] ?? null;
}

/**
 * `#fa·3` for a document (optionally with its item), `#pr` for a project-only
 * entry, or nothing when the entry is attributed to neither.
 */
function entryRefSpans(entry: Pick<WorkEntry, "documentId" | "itemIndex" | "projectId">): Span[] {
  if (entry.documentId) {
    const spans = idSpans(entry.documentId);
    const label = itemLabelFor(entry);
    return label ? [...spans, { text: `·${label}`, tone: "muted" }] : spans;
  }
  if (entry.projectId) return idSpans(entry.projectId);
  return [];
}

const todayKeyNow = () => dayKey(new Date(clock.now).toISOString());
const yesterdayKeyNow = () => dayKey(new Date(clock.now - 86400000).toISOString());

function dayHeading(day: string): string {
  if (day === todayKeyNow()) return "Today";
  if (day === yesterdayKeyNow()) return "Yesterday";
  return formatDate(`${day}T00:00:00`);
}

// ---------------------------------------------------------------------------
// Target parsing shared by `log start` and `log add`: `[#id] [<n|a|last>] ["note"]`
// ---------------------------------------------------------------------------

type LogTarget = { documentId: string | null; itemIndex: number | null; projectId: string | null; note: string };

/**
 * Consume an optional leading `#id` — a document (as before) or a project
 * (`#pr`) — an optional item ref right after a document id, and treat
 * everything left over as the note. With no `#id`, falls back to the
 * selected container, if it's a document or a project. Returns `null`
 * (after printing an error) only when an explicitly typed `#id` fails to
 * resolve or names neither kind.
 */
function parseLogTarget(positional: string[], ctx: CommandContext): LogTarget | null {
  let rest = positional;
  let documentId: string | null = null;
  let projectId: string | null = null;

  if (rest[0]?.startsWith("#")) {
    const token = rest[0];
    const resolved = kinds.resolve(token);
    if (!resolved) {
      ctx.print(`unknown id: ${token}`, "error");
      return null;
    }
    if ("ambiguous" in resolved) {
      printAmbiguous(resolved.ambiguous, ctx);
      return null;
    }
    if (resolved.kind === "document") {
      documentId = resolved.id;
    } else if (resolved.kind === "project") {
      projectId = resolved.id;
    } else {
      ctx.print(`${token} is not a document or project`, "error");
      return null;
    }
    rest = rest.slice(1);
  } else if (workspace.selected?.kind === "document") {
    documentId = workspace.selected.contentId;
  } else if (workspace.selected?.kind === "project") {
    projectId = workspace.selected.contentId;
  }

  let itemIndex: number | null = null;
  if (documentId && rest.length > 0) {
    const doc = data.getDocument(documentId);
    if (doc) {
      const index = resolveItemRef(doc.items, rest[0]);
      if (index !== null) {
        itemIndex = index;
        rest = rest.slice(1);
      }
    }
  }

  return { documentId, itemIndex, projectId, note: rest.join(" ") };
}

// ---------------------------------------------------------------------------
// list / ls
// ---------------------------------------------------------------------------

const listFlags: FlagSpec[] = [
  { name: "week", short: "w", description: "Show the last 7 days" },
  { name: "day", short: "d", description: "Show today only" },
  { name: "all", short: "a", description: "Show every entry" },
];

function rangeFromFlags(parsed: ParsedArgs): { from: string; to: string } | undefined {
  if (flag(parsed, "all", "a") !== undefined) return undefined;
  const today = todayKeyNow();
  if (flag(parsed, "week", "w") !== undefined) {
    const from = dayKey(new Date(clock.now - 6 * 86400000).toISOString());
    return { from, to: today };
  }
  if (flag(parsed, "day", "d") !== undefined) return { from: today, to: today };
  // Default: today + yesterday.
  return { from: yesterdayKeyNow(), to: today };
}

/** Entry ids in the order they were last printed, so `log rm <n>` can target one by index. */
let lastPrinted: string[] = [];

function printTimeline(args: string[], ctx: CommandContext) {
  const range = rangeFromFlags(parseArgs(args));
  const days = worklog.byDay(range);
  lastPrinted = [];

  if (days.length === 0) {
    ctx.print("(no entries)", "output");
    return;
  }

  for (const group of days) {
    ctx.print(
      [
        { text: dayHeading(group.day), tone: "key" },
        { text: `  ${formatDuration(group.minutes)}`, tone: "muted" },
      ],
      "output",
    );
    for (const entry of group.entries) {
      lastPrinted.push(entry.id);
      const running = entry.stoppedAt === null;
      const refSpans = entryRefSpans(entry);
      const time = `${timeOfDay(entry.startedAt)}–${entry.stoppedAt ? timeOfDay(entry.stoppedAt) : "now"}`;
      const spans: Span[] = [
        { text: running ? "▶ " : "  " },
        { text: `${time}  `, tone: "muted" },
        { text: `${formatDuration(entryMinutes(entry, clock.now)).padStart(6)}  `, tone: "muted" },
        ...refSpans,
        { text: refSpans.length > 0 ? "  " : "" },
        { text: entry.note || "(no note)" },
      ];
      ctx.print(spans, "output", { hang: 4 });
    }
  }
}

// ---------------------------------------------------------------------------
// start / stop / status
// ---------------------------------------------------------------------------

function doStart(args: string[], ctx: CommandContext) {
  const target = parseLogTarget(parseArgs(args).positional, ctx);
  if (!target) return;

  const entry = worklog.start(target);
  workspace.open("worklog", WORKLOG_CONTENT_ID);

  const refSpans = entryRefSpans(entry);
  const spans: Span[] = [{ text: "started" }];
  if (refSpans.length > 0) spans.push({ text: " " }, ...refSpans);
  if (entry.note) spans.push({ text: `${refSpans.length > 0 ? "  " : " "}${entry.note}` });
  ctx.print(spans, "output");
}

function doStop(ctx: CommandContext) {
  const entry = worklog.stop();
  if (!entry) {
    ctx.print("nothing running", "error");
    return;
  }
  ctx.print(`stopped after ${formatDuration(entryMinutes(entry))}`, "output");
}

function doStatus(ctx: CommandContext) {
  const running = worklog.running;
  if (!running) {
    ctx.print("nothing running", "output");
    return;
  }
  const refSpans = entryRefSpans(running);
  const spans: Span[] = [];
  if (refSpans.length > 0) spans.push(...refSpans, { text: "  " });
  spans.push({ text: running.note || "(no note)" });
  spans.push({ text: `  ${formatDuration(entryMinutes(running, clock.now))}`, tone: "muted" });
  ctx.print(spans, "output");
}

// ---------------------------------------------------------------------------
// add
// ---------------------------------------------------------------------------

const addFlags: FlagSpec[] = [
  { name: "from", description: "Start time, HH:MM", takesValue: true },
  { name: "to", description: "Stop time, HH:MM", takesValue: true },
  { name: "date", description: "Date, YYYY-MM-DD (default: today)", takesValue: true },
];

function parseHHMM(value: string): { h: number; m: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h > 23 || m > 59) return null;
  return { h, m };
}

const addUsage = 'usage: log add --from HH:MM --to HH:MM [--date YYYY-MM-DD] [#id] [<n|a|last>] ["note"]';

function doAdd(args: string[], ctx: CommandContext) {
  const parsed = parseArgs(args);
  const fromFlag = flag(parsed, "from");
  const toFlag = flag(parsed, "to");
  if (typeof fromFlag !== "string" || typeof toFlag !== "string") {
    ctx.print(addUsage, "error");
    return;
  }
  const from = parseHHMM(fromFlag);
  const to = parseHHMM(toFlag);
  if (!from || !to) {
    ctx.print(addUsage, "error");
    return;
  }

  const dateFlag = flag(parsed, "date");
  const dateStr = typeof dateFlag === "string" ? dateFlag : todayKeyNow();
  const base = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(base.getTime())) {
    ctx.print(`invalid date: ${dateStr}`, "error");
    return;
  }

  const startedAt = new Date(base);
  startedAt.setHours(from.h, from.m, 0, 0);
  const stoppedAt = new Date(base);
  stoppedAt.setHours(to.h, to.m, 0, 0);
  if (stoppedAt.getTime() <= startedAt.getTime()) {
    ctx.print("--to must be after --from", "error");
    return;
  }

  const target = parseLogTarget(parsed.positional, ctx);
  if (!target) return;

  const entry = worklog.add({
    ...target,
    startedAt: startedAt.toISOString(),
    stoppedAt: stoppedAt.toISOString(),
  });

  const refSpans = entryRefSpans(entry);
  const spans: Span[] = [{ text: "added " }, ...refSpans];
  if (entry.note) spans.push({ text: `${refSpans.length > 0 ? "  " : ""}${entry.note}` });
  spans.push({ text: `  ${formatDuration(entryMinutes(entry))}`, tone: "muted" });
  ctx.print(spans, "output");
}

// ---------------------------------------------------------------------------
// rm / open / reset
// ---------------------------------------------------------------------------

function doRemove(args: string[], ctx: CommandContext) {
  const token = args[0];
  const n = token ? parseInt(token, 10) : NaN;
  if (!token || Number.isNaN(n) || n < 1 || n > lastPrinted.length) {
    ctx.print("usage: log rm <n>  (n = index in the last printed list)", "error");
    return;
  }
  const id = lastPrinted[n - 1];
  const ok = worklog.remove(id);
  ctx.print(ok ? `removed ${n}` : `no entry ${n}`, ok ? "output" : "error");
}

function doOpen(ctx: CommandContext) {
  const container = workspace.open("worklog", WORKLOG_CONTENT_ID);
  ctx.print(`opened @${container.id}`, "output");
}

function doReset(ctx: CommandContext) {
  worklog.reset();
  ctx.print("worklog reset", "output");
}

// ---------------------------------------------------------------------------
// Completion
// ---------------------------------------------------------------------------

/** `#fa` for every document plus `#pr` for every project — `log start`/`log add`'s optional target. */
function targetSuggestions(): Suggestion[] {
  const documents: Suggestion[] = data.documents.map((d) => ({
    value: sid(d.id),
    label: d.title || d.number || "untitled",
    kind: "value",
  }));
  const projects: Suggestion[] =
    kinds
      .get("project")
      ?.ids?.()
      ?.map((id) => ({ value: sid(id), label: kinds.labelOf("project", id), kind: "value" as const })) ?? [];
  return [...documents, ...projects];
}

function itemSuggestionsFor(documentId: string): Suggestion[] {
  const doc = data.getDocument(documentId);
  if (!doc) return [];
  const labels = itemLabels(doc.items);
  return doc.items.map((item, i) => ({ value: labels[i], label: item.title, kind: "value" }));
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export const logCommand: Command = {
  name: "log",
  aliases: ["l"],
  description: "Track, list, and edit work log entries",
  usage:
    'log [ls|list [-w|-d|-a]] | log start [#id] [<n|a|last>] ["note"] | log stop | log status | ' +
    'log add --from --to [--date] [#id] [<n|a|last>] ["note"] | log rm <n> | log open | log reset',
  flags: listFlags,
  subcommands: [
    { name: "list", aliases: ["ls"], description: "Print the timeline", flags: listFlags },
    { name: "start", description: "Start tracking (stops any running entry first)" },
    { name: "stop", description: "Stop the running entry" },
    { name: "status", description: "Show the running entry, if any" },
    { name: "add", description: "Add a completed entry", flags: addFlags },
    { name: "rm", description: "Remove an entry from the last printed list" },
    { name: "open", description: "Open the work log tile" },
    { name: "reset", description: "Reset seeded work log entries" },
  ],
  complete: (args) => {
    const [head, ...rest] = args;
    if (head === "start" || head === "add") {
      if (rest.length === 1) return targetSuggestions();
      if (rest.length === 2 && rest[0].startsWith("#")) {
        const resolved = kinds.resolve(rest[0]);
        if (resolved && !("ambiguous" in resolved) && resolved.kind === "document") {
          return itemSuggestionsFor(resolved.id);
        }
      }
    }
    return [];
  },
  run: (args, ctx) => {
    const [head, ...rest] = args;

    if (!head || head === "list" || head === "ls" || head.startsWith("-")) {
      printTimeline(head?.startsWith("-") ? args : rest, ctx);
      return;
    }
    if (head === "start") {
      doStart(rest, ctx);
      return;
    }
    if (head === "stop") {
      doStop(ctx);
      return;
    }
    if (head === "status") {
      doStatus(ctx);
      return;
    }
    if (head === "add") {
      doAdd(rest, ctx);
      return;
    }
    if (head === "rm") {
      doRemove(rest, ctx);
      return;
    }
    if (head === "open") {
      doOpen(ctx);
      return;
    }
    if (head === "reset") {
      doReset(ctx);
      return;
    }

    ctx.print("usage: log [ls|start|stop|status|add|rm|open|reset]", "error");
  },
  preview: (args): Intent | null => {
    const [head] = args;

    if (head === "start") {
      const existing = workspace.findByContent(WORKLOG_CONTENT_ID);
      if (existing) return { target: `@${existing.id}`, hint: "start" };
      const rect = workspace.peekSpawnFor("worklog");
      return { ghost: rect, hint: "start" };
    }

    if (head === "stop") {
      const running = worklog.running;
      if (!running) return { hint: "stop" };
      return { hint: `stop ${formatDuration(entryMinutes(running, clock.now))}` };
    }

    return null;
  },
};

export const worklogCommands: Command[] = [logCommand];
