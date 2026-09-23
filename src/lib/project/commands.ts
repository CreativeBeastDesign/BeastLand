/**
 * Project commands
 *
 * A single terminal command, `project` (alias `p`), covering the whole
 * slice: list/create/edit/remove projects, open/print one, list its linked
 * documents, link/unlink a document, and print an hours summary. Registered
 * into the shell via `registry.register(projectCommands)` from the tiling
 * route.
 *
 * Grammar mirrors `customer`/`docs` in `$lib/tiling/commands.ts`: the first
 * positional token is either a verb (`list`, `new`, `set`, `rm`) or a `#id`,
 * in which case a second positional token (`docs`, `link`, `unlink`, `log`)
 * may follow. Bare `#pr` (no `project` prefix) still opens/selects the
 * project via the generic `#<id>` command in `$lib/tiling/commands.ts` — it
 * works for free once a kind is registered with `ids`.
 */

import { data } from "$lib/data/store.svelte.js";
import { kinds } from "$lib/tiling/kinds.svelte.js";
import { workspace } from "$lib/tiling/workspace.svelte.js";
import type { Container } from "$lib/tiling/types.js";
import { customerName, formatMoney } from "$lib/data/format.js";
import { docTypeLabels } from "$lib/data/types.js";
import { fieldsAt, type FieldDef, type Level } from "$lib/data/views.js";
import { notify } from "$lib/shell/toasts.svelte.js";
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
import { projects } from "./store.svelte.js";
import { customerIdFromFlags, projectFieldFlags, projectFieldsFromFlags, projectStatusValues } from "./fields.js";
import { runSet } from "$lib/tiling/workspace-commands.js";
import { projectFields } from "./views.js";
import type { Project, ProjectFields, ProjectStatus } from "./types.js";
import { formatDuration } from "$lib/worklog/types.js";

// ---------------------------------------------------------------------------
// Shared helpers (mirror the style of `$lib/tiling/commands.ts` / `$lib/worklog/commands.ts`)
// ---------------------------------------------------------------------------

/** `#` + the shortest unique prefix of a full record id (plain text, for messages). */
function sid(id: string): string {
  return `#${kinds.shortIdOf(id).short}`;
}

/** `#pr` bold + dimmed tail, as spans for styled output. Clicking runs `#pr`. */
function idSpans(id: string): Span[] {
  const parts = kinds.shortIdOf(id);
  return [
    { text: `#${parts.short}`, tone: "id", command: `#${parts.short}` },
    { text: parts.rest, tone: "id-rest" },
  ];
}

/** `created #pr @3` and friends: a message with a styled id in it. */
function say(ctx: CommandContext, before: string, id: string, after = "") {
  ctx.print([{ text: before }, ...idSpans(id), { text: after }], "output");
}

function printAmbiguous(ids: string[], ctx: CommandContext) {
  const labels = ids.map((id) => `#${kinds.shortIdOf(id).short}…`);
  ctx.print(`ambiguous: ${labels.join(" ")}`, "error");
}

/** `--details/-d` or `--full/-f` → level; nothing → null. */
function levelFromArgs(parsed: ParsedArgs): Level | null {
  if (flag(parsed, "full", "f") !== undefined) return "full";
  if (flag(parsed, "details", "d") !== undefined) return "details";
  return null;
}

/** Plain text of a span list (for width calculations). */
function spanText(spans: Span[]): string {
  return spans.map((s) => s.text).join("");
}

/** Pad a span list with spaces up to `width` characters. */
function padSpans(spans: Span[], width: number): Span[] {
  const pad = width - spanText(spans).length;
  return pad > 0 ? [...spans, { text: " ".repeat(pad) }] : spans;
}

/** Render `key=value` pairs for a "field(s) changed" confirmation line. */
function describePatch(patch: Record<string, unknown>): string {
  return Object.entries(patch)
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");
}

/** Resolve `#pr`-style input to a project id, printing errors. */
function resolveProject(token: string, ctx: CommandContext): string | null {
  const resolved = kinds.resolve(token);
  if (!resolved) {
    ctx.print(`unknown id: ${token}`, "error");
    return null;
  }
  if ("ambiguous" in resolved) {
    printAmbiguous(resolved.ambiguous, ctx);
    return null;
  }
  if (resolved.kind !== "project") {
    ctx.print(`${token} is not a project`, "error");
    return null;
  }
  return resolved.id;
}

/** Resolve `#fa`-style input to a document id, printing errors. */
function resolveDocument(token: string, ctx: CommandContext): string | null {
  const resolved = kinds.resolve(token);
  if (!resolved) {
    ctx.print(`unknown id: ${token}`, "error");
    return null;
  }
  if ("ambiguous" in resolved) {
    printAmbiguous(resolved.ambiguous, ctx);
    return null;
  }
  if (resolved.kind !== "document") {
    ctx.print(`${token} is not a document`, "error");
    return null;
  }
  return resolved.id;
}

/** Look a project up by id, printing `no such project` when it has vanished. */
function requireProject(id: string, ctx: CommandContext): Project | null {
  const p = projects.get(id);
  if (!p) {
    ctx.print(`no such project ${sid(id)}`, "error");
    return null;
  }
  return p;
}

/**
 * Print one record as `Label  value` lines at the given level. The `list`
 * level collapses to a single line.
 */
function printRecord<T>(ctx: CommandContext, id: string, record: T, defs: FieldDef<T>[], level: Level) {
  const fields = fieldsAt(defs, level);
  if (level === "list") {
    ctx.print([...idSpans(id), { text: "  " }, { text: fields[0]?.get(record) ?? "" }], "output");
    return;
  }
  const width = Math.max(...fields.map((f) => f.label.length));
  ctx.print(idSpans(id), "output");
  for (const f of fields) {
    ctx.print([{ text: `  ${f.label.padEnd(width)}  `, tone: "key" }, { text: f.get(record) }], "output");
  }
}

/**
 * Print a list of records: one line each. `list` level shows the name only;
 * `details` adds the details-level fields as columns.
 */
function printList<T extends { id: string }>(
  ctx: CommandContext,
  records: readonly T[],
  defs: FieldDef<T>[],
  level: Level,
  empty: string,
) {
  if (records.length === 0) {
    ctx.print(empty, "output");
    return;
  }
  const fields = fieldsAt(defs, level === "full" ? "details" : level);
  const idWidth = Math.max(...records.map((r) => spanText(idSpans(r.id)).length));
  const cells = records.map((r) => fields.map((f) => f.get(r)));
  const widths = fields.map((_, i) => Math.max(...cells.map((row) => row[i].length)));

  records.forEach((r, ri) => {
    const spans: Span[] = [...padSpans(idSpans(r.id), idWidth), { text: "  " }];
    cells[ri].forEach((value, ci) => {
      const last = ci === cells[ri].length - 1;
      spans.push({ text: last ? value : value.padEnd(widths[ci] + 2) });
    });
    ctx.print(spans, "output");
  });
}

// ---------------------------------------------------------------------------
// Flags
// ---------------------------------------------------------------------------

const detailFlags: FlagSpec[] = [
  { name: "details", short: "d", description: "Show details-level fields" },
  { name: "full", short: "f", description: "Show every field" },
];

// ---------------------------------------------------------------------------
// Suggestions
// ---------------------------------------------------------------------------

function projectSuggestions(): Suggestion[] {
  return projects.projects.map((p) => ({
    value: `#${kinds.shortIdOf(p.id).short}`,
    label: p.name || "(unnamed)",
    kind: "value",
  }));
}

function customerSuggestions(): Suggestion[] {
  return data.customers.map((c) => ({
    value: `#${kinds.shortIdOf(c.id).short}`,
    label: customerName(c) || "(no name)",
    description: c.company,
    kind: "value",
  }));
}

function documentSuggestions(): Suggestion[] {
  return data.documents.map((d) => ({
    value: `#${kinds.shortIdOf(d.id).short}`,
    label: d.title || d.number || docTypeLabels[d.docType],
    description: docTypeLabels[d.docType],
    kind: "value",
  }));
}

// ---------------------------------------------------------------------------
// list / ls
// ---------------------------------------------------------------------------

function printProjectList(ctx: CommandContext, level: Level) {
  printList(ctx, projects.projects, projectFields, level, "(no projects)");
}

// ---------------------------------------------------------------------------
// new / set — field parsing
// ---------------------------------------------------------------------------

/** Resolve `--customer <#id>`, printing errors; `{ ok: true, id: null }` when the flag was omitted. */
function applyProjectSet(container: Container, args: string[], ctx: CommandContext) {
  if (container.kind !== "project") {
    ctx.print(`@${container.id} is not a project`, "error");
    return;
  }
  runSet(container, args, ctx);
}

// ---------------------------------------------------------------------------
// <#id> docs / link / unlink / log
// ---------------------------------------------------------------------------

function printProjectDocuments(id: string, ctx: CommandContext) {
  if (!requireProject(id, ctx)) return;
  const docs = projects.documentsOf(id);
  if (docs.length === 0) {
    ctx.print("(no documents)", "output");
    return;
  }
  for (const doc of docs) {
    const spans: Span[] = [
      ...idSpans(doc.id),
      { text: "  " },
      { text: (doc.number ?? "draft").padEnd(14) },
      { text: docTypeLabels[doc.docType].padEnd(20) },
      { text: doc.status.padEnd(10) },
      { text: doc.title || "untitled" },
    ];
    ctx.print(spans, "output");
  }
}

function doLink(projectId: string, args: string[], ctx: CommandContext) {
  if (!requireProject(projectId, ctx)) return;
  const token = args[0];
  if (!token) {
    ctx.print("usage: project <#id> link <#doc>", "error");
    return;
  }
  const docId = resolveDocument(token, ctx);
  if (!docId) return;
  data.updateDocument(docId, { projectId });
  ctx.print([{ text: "linked " }, ...idSpans(docId), { text: " to " }, ...idSpans(projectId)], "output");
}

function doUnlink(projectId: string, args: string[], ctx: CommandContext) {
  if (!requireProject(projectId, ctx)) return;
  const token = args[0];
  if (!token) {
    ctx.print("usage: project <#id> unlink <#doc>", "error");
    return;
  }
  const docId = resolveDocument(token, ctx);
  if (!docId) return;
  const doc = data.getDocument(docId);
  if (!doc || doc.projectId !== projectId) {
    ctx.print(`${sid(docId)} is not linked to ${sid(projectId)}`, "error");
    return;
  }
  data.updateDocument(docId, { projectId: null });
  ctx.print([{ text: "unlinked " }, ...idSpans(docId), { text: " from " }, ...idSpans(projectId)], "output");
}

function printProjectLog(id: string, ctx: CommandContext) {
  if (!requireProject(id, ctx)) return;
  ctx.print(`logged    ${formatDuration(projects.minutesOf(id))}`, "output");
  ctx.print(`quoted    ${formatMoney(projects.quotedOf(id), "CHF")}`, "output");
  ctx.print(`invoiced  ${formatMoney(projects.invoicedOf(id), "CHF")}`, "output");
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

const idSubcommandSuggestions: Suggestion[] = [
  { value: "docs", kind: "subcommand", description: "List linked documents" },
  { value: "link", kind: "subcommand", description: "Link a document" },
  { value: "unlink", kind: "subcommand", description: "Unlink a document" },
  { value: "log", kind: "subcommand", description: "Hours summary" },
];

export const projectCommand: Command = {
  name: "project",
  aliases: ["p"],
  description: "List, create, edit, or open projects",
  usage:
    "project [list [-d|-f]] | project new --name/-n --customer --status --start --end --budget --description | " +
    "project set --flags | project rm <#id> | project <#id> [-d|-f] | project <#id> docs | " +
    "project <#id> link|unlink <#doc> | project <#id> log",
  flags: detailFlags,
  subcommands: [
    { name: "list", aliases: ["ls"], description: "List projects", flags: detailFlags },
    { name: "new", description: "Create a project", flags: projectFieldFlags },
    { name: "set", description: "Edit the selected project", flags: projectFieldFlags },
    { name: "rm", description: "Remove a project" },
    { name: "reset", description: "Restore the seed projects" },
  ],
  complete: (args) => {
    const prev = args[args.length - 2];
    if (prev === "--customer") return customerSuggestions();
    if (args.length === 1) return projectSuggestions();
    if (args.length === 2 && args[0] === "rm") return projectSuggestions();
    if (args.length === 2 && args[0].startsWith("#")) return idSubcommandSuggestions;
    if (args.length === 3 && args[0].startsWith("#") && (args[1] === "link" || args[1] === "unlink")) {
      return documentSuggestions();
    }
    return [];
  },
  run: (args, ctx) => {
    const [head, ...rest] = args;

    if (!head || head === "list" || head === "ls" || head.startsWith("-")) {
      printProjectList(ctx, levelFromArgs(parseArgs(head?.startsWith("-") ? args : rest)) ?? "list");
      return;
    }

    if (head === "new") {
      const parsed = parseArgs(rest);
      const customer = customerIdFromFlags(parsed);
      if ("error" in customer) {
        ctx.print(customer.error, "error");
        return;
      }
      const fields = projectFieldsFromFlags(parsed);
      if (customer.id !== null) fields.customerId = customer.id;
      const project = projects.create(fields);
      const container = workspace.spawn("project", project.id);
      say(ctx, "created ", project.id, ` @${container.id}`);
      return;
    }

    if (head === "set") {
      if (!workspace.selected) {
        ctx.print("no container selected", "error");
        return;
      }
      applyProjectSet(workspace.selected, rest, ctx);
      return;
    }

    if (head === "reset") {
      projects.reset();
      ctx.print("projects reset", "output");
      return;
    }

    if (head === "rm") {
      const token = rest[0];
      if (!token) {
        ctx.print("usage: project rm <#id>", "error");
        return;
      }
      const id = resolveProject(token, ctx);
      if (!id) return;
      const label = sid(id);
      const removedName = kinds.labelOf("project", id);
      const existing = workspace.findByContent(id);
      projects.remove(id);
      if (existing) workspace.close(existing.id);
      ctx.print(`removed ${label}`, "output");
      notify({ title: `Removed ${removedName}`, message: `${label} deleted`, tone: "warning" });
      return;
    }

    // `project <#id> …`
    const id = resolveProject(head, ctx);
    if (!id) return;

    const [sub, ...subRest] = rest;

    if (sub === "docs") {
      printProjectDocuments(id, ctx);
      return;
    }
    if (sub === "link") {
      doLink(id, subRest, ctx);
      return;
    }
    if (sub === "unlink") {
      doUnlink(id, subRest, ctx);
      return;
    }
    if (sub === "log") {
      printProjectLog(id, ctx);
      return;
    }

    // `project <#id> [-d|-f]` prints the record; no flags opens it.
    const level = levelFromArgs(parseArgs(rest));
    if (level) {
      const project = requireProject(id, ctx);
      if (!project) return;
      printRecord(ctx, id, project, projectFields, level);
      return;
    }

    const container = workspace.open("project", id);
    say(ctx, "selected ", id, ` @${container.id}`);
  },
  preview: (args): Intent | null => {
    const [head] = args;
    if (head === "new") {
      const rect = workspace.peekSpawnFor("project");
      return { ghost: rect, hint: "spawn" };
    }
    return null;
  },
};

export const projectCommands: Command[] = [projectCommand];
