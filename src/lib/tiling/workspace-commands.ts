/**
 * Workspace commands
 *
 * The record-agnostic half of the tiling terminal: `@n …` and `#id …` prefix
 * commands (select / open / move / resize / close / retitle / `set`), `ls`,
 * `close`, `reset --layout`, plus the print helpers other command groups
 * reuse. Nothing here knows a customer from a document — everything
 * kind-specific comes from the kind registry (`KindSpec.label/ids/view/
 * set/actions`). Register with `registry.register(workspaceCommands)` and
 * your own kinds; `$lib/tiling/commands.ts` is the demo CRM on top of it.
 *
 * `@2 …` and `#xp …` are prefix commands (see `Command.match`): once the
 * target container is resolved, any trailing args are handed to the same
 * `applyContainerArgs` dispatcher, so `#xp set --city Bern` and `@2 set
 * --city Bern` behave identically.
 */

import { workspace } from "./workspace.svelte.js";
import { shortId } from "./ids.js";
import type { Container, Direction } from "./types.js";
import { kinds } from "./kinds.svelte.js";
import { fieldsAt, type FieldDef, type Level, type ViewRow } from "./views.js";
import {
  flag,
  parseArgs,
  type Command,
  type CommandContext,
  type FlagSpec,
  type Intent,
  type ParsedArgs,
  type Span,
  type SubcommandSpec,
  type Suggestion,
} from "$lib/shell/protocol.js";

// ---------------------------------------------------------------------------
// Ids and styled output
// ---------------------------------------------------------------------------

/** `#` + the shortest unique prefix of a full record id (plain text, for messages). */
export function sid(id: string): string {
  return `#${shortId(id, kinds.allIds).short}`;
}

/** `#xp` bold + dimmed `oakahe` tail, as spans for styled output. Clicking runs `#xp`. */
export function idSpans(id: string): Span[] {
  const parts = shortId(id, kinds.allIds);
  return [
    { text: `#${parts.short}`, tone: "id", command: `#${parts.short}` },
    { text: parts.rest, tone: "id-rest" },
  ];
}

/** Plain text of a span list (for width calculations). */
export function spanText(spans: Span[]): string {
  return spans.map((s) => s.text).join("");
}

/** Pad a span list with spaces up to `width` characters. */
export function padSpans(spans: Span[], width: number): Span[] {
  const pad = width - spanText(spans).length;
  return pad > 0 ? [...spans, { text: " ".repeat(pad) }] : spans;
}

/** `created #xp @3` and friends: a message with a styled id in it. */
export function say(ctx: CommandContext, before: string, id: string, after = "") {
  ctx.print([{ text: before }, ...idSpans(id), { text: after }], "output");
}

export function printAmbiguous(ids: string[], ctx: CommandContext) {
  const labels = ids.map((id) => `#${shortId(id, kinds.allIds).short}…`);
  ctx.print(`ambiguous: ${labels.join(" ")}`, "error");
}

/** `--details/-d` or `--full/-f` → level; nothing → null. */
export function levelFromArgs(parsed: ParsedArgs): Level | null {
  if (flag(parsed, "full", "f") !== undefined) return "full";
  if (flag(parsed, "details", "d") !== undefined) return "details";
  return null;
}

/**
 * Print one record as `Label  value` lines. The `list` level collapses to a
 * single line (id + first row).
 */
export function printRows(ctx: CommandContext, id: string, rows: ViewRow[], level: Level) {
  if (level === "list") {
    ctx.print([...idSpans(id), { text: "  " }, { text: rows[0]?.value ?? "" }], "output");
    return;
  }
  const width = Math.max(0, ...rows.map((r) => r.label.length));
  ctx.print(idSpans(id), "output");
  for (const r of rows) {
    ctx.print([{ text: `  ${r.label.padEnd(width)}  `, tone: "key" }, { text: r.value }], "output");
  }
}

/** `printRows` from field definitions. */
export function printRecord<T>(ctx: CommandContext, id: string, record: T, defs: FieldDef<T>[], level: Level) {
  printRows(
    ctx,
    id,
    fieldsAt(defs, level).map((f) => ({ label: f.label, value: f.get(record) })),
    level,
  );
}

/**
 * Print a list of records: one line each. `list` level shows the name/title
 * only; `details` adds the details-level fields as columns.
 */
export function printList<T extends { id: string }>(
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

/** Print a record at `level` through its kind's `view` hook (label only without one). */
export function showRecord(ctx: CommandContext, kind: string, id: string, level: Level) {
  const spec = kinds.get(kind);
  const rows = spec?.view?.(id, level);
  if (rows) {
    printRows(ctx, id, rows, level);
    return;
  }
  if (spec?.exists(id) ?? false) {
    printRows(ctx, id, [{ label: kind, value: spec?.label(id) ?? "" }], "list");
    return;
  }
  ctx.print(`no such ${kind} ${sid(id)}`, "error");
}

/** Render `key=value` pairs for a "field(s) changed" confirmation line. */
export function describePatch(patch: Record<string, unknown>): string {
  return Object.entries(patch)
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");
}

/** Print rows as a left-aligned table, columns sized to their widest cell. */
export function printTable(ctx: CommandContext, rows: string[][]) {
  if (rows.length === 0) return;
  const widths: number[] = [];
  for (const row of rows) {
    row.forEach((cell, i) => {
      widths[i] = Math.max(widths[i] ?? 0, cell.length);
    });
  }
  for (const row of rows) {
    const line = row.map((cell, i) => (i === row.length - 1 ? cell : cell.padEnd(widths[i] + 2))).join("");
    ctx.print(line.trimEnd() || line, "output");
  }
}

// ---------------------------------------------------------------------------
// Shared flag groups and completion sources
// ---------------------------------------------------------------------------

export const detailFlags: FlagSpec[] = [
  { name: "details", short: "d", description: "Show details-level fields" },
  { name: "full", short: "f", description: "Show every field" },
];

export const directionFlags: FlagSpec[] = [
  { name: "up", short: "u", description: "Move/select up" },
  { name: "down", short: "d", description: "Move/select down" },
  { name: "left", short: "l", description: "Move/select left" },
  { name: "right", short: "r", description: "Move/select right" },
];

export const sizeFlags: FlagSpec[] = [
  { name: "width", short: "w", description: "Column width", takesValue: true },
  { name: "height", short: "h", description: "Row height", takesValue: true },
];

/** Display label for a container, via its kind. */
export function containerLabel(c: Container): string {
  return kinds.labelOf(c.kind, c.contentId);
}

/** `@2` candidates for every open container, e.g. for `@<partial>` or `close <partial>`. */
export function containerSuggestions(): Suggestion[] {
  return workspace.containers.map((c) => ({
    value: `@${c.id}`,
    label: containerLabel(c),
    description: c.kind,
    kind: "value",
  }));
}

/** `#xp` candidates for every record of every registered kind (or of one kind). */
export function recordSuggestions(kind?: string): Suggestion[] {
  const specs = kind ? [kinds.get(kind)].filter((s) => s !== undefined) : kinds.all;
  return specs.flatMap((spec) =>
    (spec.ids?.() ?? []).map((id) => ({
      value: `#${shortId(id, kinds.allIds).short}`,
      label: spec.label(id) || "(unnamed)",
      description: spec.kind,
      kind: "value" as const,
    })),
  );
}

// ---------------------------------------------------------------------------
// Generic `set`
// ---------------------------------------------------------------------------

/**
 * Every kind that declares a `set` hook can be edited from `@n set …`,
 * `#id set …`, or its own `<kind> set …` command. The hook returns the
 * patch; printing and error handling live here, once.
 */
export function runSet(container: Container, args: string[], ctx: CommandContext) {
  const spec = kinds.get(container.kind);
  if (!spec?.set) {
    ctx.print(`@${container.id} (${container.kind}) has nothing to set`, "error");
    return;
  }
  const result = spec.set(container.contentId, parseArgs(args));
  if (!result.ok) {
    ctx.print(result.error, "error");
    return;
  }
  say(ctx, "updated ", container.contentId, `: ${describePatch(result.patch)}`);
}

// ---------------------------------------------------------------------------
// Shared container-arg dispatcher, used by `@n` and `#id`.
// ---------------------------------------------------------------------------

export function directionFromArgs(parsed: ParsedArgs): Direction | undefined {
  if (flag(parsed, "up", "u") !== undefined) return "up";
  if (flag(parsed, "down", "d") !== undefined) return "down";
  if (flag(parsed, "left", "l") !== undefined) return "left";
  if (flag(parsed, "right", "r") !== undefined) return "right";
  return undefined;
}

function doMove(container: Container, args: string[], ctx: CommandContext) {
  const dir = directionFromArgs(parseArgs(args));
  if (!dir) {
    ctx.print("usage: move --up/-u|--down/-d|--left/-l|--right/-r", "error");
    return;
  }
  const result = workspace.move(container.id, dir);
  ctx.print(result.ok ? `moved @${container.id} ${dir}` : result.reason, result.ok ? "output" : "error");
}

/** Dispatch trailing args of `@n …` / `#id …` onto the resolved container. */
export function applyContainerArgs(container: Container, args: string[], ctx: CommandContext) {
  if (args.length === 0) return;
  const [head, ...rest] = args;

  if (head === "close") {
    const ok = workspace.close(container.id);
    ctx.print(ok ? `closed @${container.id}` : `no container @${container.id}`, ok ? "output" : "error");
    return;
  }

  if (head === "title") {
    workspace.setTitle(container.id, rest.join(" ") || undefined);
    ctx.print(`@${container.id} title set`, "output");
    return;
  }

  if (head === "move") {
    doMove(container, rest, ctx);
    return;
  }

  if (head === "set") {
    runSet(container, rest, ctx);
    return;
  }

  // Kind-specific verbs (`@n item new …`) come from the registry.
  const action = kinds.get(container.kind)?.actions?.find((a) => a.name === head);
  if (action) {
    action.run(container.contentId, rest, ctx);
    return;
  }
  if (kinds.all.some((k) => k.actions?.some((a) => a.name === head))) {
    ctx.print(`@${container.id} (${container.kind}) has no "${head}"`, "error");
    return;
  }

  // No keyword: bare flags — a directional shorthand (`-u`) or a resize
  // (`--width/-w`, `--height/-h`).
  const parsed = parseArgs(args);
  const dir = directionFromArgs(parsed);
  if (dir) {
    const result = workspace.move(container.id, dir);
    ctx.print(result.ok ? `moved @${container.id} ${dir}` : result.reason, result.ok ? "output" : "error");
    return;
  }

  const width = flag(parsed, "width", "w");
  const height = flag(parsed, "height", "h");
  if (width !== undefined || height !== undefined) {
    const size: { w?: number; h?: number } = {};
    if (typeof width === "string") size.w = parseInt(width, 10);
    if (typeof height === "string") size.h = parseInt(height, 10);
    const result = workspace.resize(container.id, size);
    if (result.ok) {
      const updated = workspace.get(container.id);
      ctx.print(`resized @${container.id} to ${updated?.w}×${updated?.h}`, "output");
    } else {
      ctx.print(result.reason, "error");
    }
    return;
  }

  ctx.print(`unrecognized: ${args.join(" ")}`, "error");
}

// ---------------------------------------------------------------------------
// Previews — mirror applyContainerArgs' dispatch, but pure: compute the
// intent (target/hint/ghost/invalid) instead of doing anything.
// ---------------------------------------------------------------------------

const directionArrow: Record<Direction, string> = {
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
};

/** Preview of `move --up/-u|...`, given an already-resolved direction. */
function moveIntent(container: Container, dir: Direction, target: string): Intent {
  const peek = workspace.peekMove(container.id, dir);
  let hint = `move ${directionArrow[dir]}`;
  if (!peek.ok) hint += ` · ${peek.reason}`;
  if (peek.swapWith !== undefined) hint += ` · swap @${peek.swapWith}`;
  return { target, hint, ghost: peek.rect, invalid: !peek.ok };
}

/**
 * `-w 4 -h 3` as a spawn size (for `#id -w 4` on a record that has no
 * container yet). Returns the size and the args with those flags removed.
 */
export function spawnSizeFromArgs(args: string[]): { size: { w?: number; h?: number }; rest: string[] } {
  const parsed = parseArgs(args);
  const size: { w?: number; h?: number } = {};
  const w = flag(parsed, "width", "w");
  const h = flag(parsed, "height", "h");
  if (typeof w === "string" && !Number.isNaN(parseInt(w, 10))) size.w = parseInt(w, 10);
  if (typeof h === "string" && !Number.isNaN(parseInt(h, 10))) size.h = parseInt(h, 10);
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const t = args[i];
    if (/^(--width|-w|--height|-h)$/.test(t)) {
      if (args[i + 1] !== undefined && !args[i + 1].startsWith("-")) i++;
      continue;
    }
    rest.push(t);
  }
  return { size, rest };
}

/** Preview of a `-w`/`-h` (or `--width`/`--height`) resize, values possibly still missing. */
function resizeIntent(
  container: Container,
  widthFlag: string | true | undefined,
  heightFlag: string | true | undefined,
  target: string,
): Intent {
  const hasW = widthFlag !== undefined;
  const hasH = heightFlag !== undefined;
  const newW = typeof widthFlag === "string" ? parseInt(widthFlag, 10) : undefined;
  const newH = typeof heightFlag === "string" ? parseInt(heightFlag, 10) : undefined;
  const wKnown = hasW && newW !== undefined && !Number.isNaN(newW);
  const hKnown = hasH && newH !== undefined && !Number.isNaN(newH);

  // The value hasn't been typed yet (or isn't numeric yet): show the current
  // size, with no ghost — there's nothing concrete to preview.
  if (hasW && hasH && !(wKnown && hKnown)) {
    return { target, hint: `${container.w}×${container.h}` };
  }
  if (hasW && !hasH && !wKnown) {
    return { target, hint: `w ${container.w}` };
  }
  if (hasH && !hasW && !hKnown) {
    return { target, hint: `h ${container.h}` };
  }

  const size: { w?: number; h?: number } = {};
  if (wKnown) size.w = newW;
  if (hKnown) size.h = newH;
  const peek = workspace.peekResize(container.id, size);

  let hint: string;
  if (hasW && hasH) {
    hint = `${container.w}×${container.h} → ${peek.rect.w}×${peek.rect.h}`;
  } else if (hasW) {
    hint = `w ${container.w} → ${peek.rect.w}`;
  } else {
    hint = `h ${container.h} → ${peek.rect.h}`;
  }
  if (!peek.ok) hint += ` · ${peek.reason}`;

  return { target, hint, ghost: peek.rect, invalid: !peek.ok };
}

/**
 * Preview of `applyContainerArgs` for an already-resolved container: what
 * closing, retitling, moving, or resizing it would show. Pure — mirrors the
 * dispatch order of `applyContainerArgs` but never prints or mutates.
 */
export function previewContainerArgs(container: Container, args: string[]): Intent {
  const target = `@${container.id}`;
  if (args.length === 0) return { target };

  const [head, ...tail] = args;

  if (head === "close") return { target, hint: "close" };
  if (head === "title") return { target, hint: "title" };

  if (head === "move") {
    const dir = directionFromArgs(parseArgs(tail));
    return dir ? moveIntent(container, dir, target) : { target };
  }

  // No keyword: bare flags — a directional shorthand (`-u`) or a resize
  // (`--width/-w`, `--height/-h`). Anything else (set/actions/unknown)
  // falls through to the target-only default below.
  const parsed = parseArgs(args);
  const dir = directionFromArgs(parsed);
  if (dir) return moveIntent(container, dir, target);

  const width = flag(parsed, "width", "w");
  const height = flag(parsed, "height", "h");
  if (width !== undefined || height !== undefined) {
    return resizeIntent(container, width, height, target);
  }

  return { target };
}

// ---------------------------------------------------------------------------
// @n / #id prefix commands, ls, close, reset --layout
// ---------------------------------------------------------------------------

/**
 * Flags for `@n …` / `#id …` given the target: `set` narrows to the target
 * kind's `setFlags`, an action to its own flags; everything else falls back
 * to the static declaration.
 */
function containerFlagsFor(kindOf: (token: string) => string | undefined): (args: string[]) => FlagSpec[] | null {
  return (args) => {
    const verb = args[1];
    if (!verb) return null;
    const kind = kindOf(args[0] ?? "");
    if (!kind) return null;
    const spec = kinds.get(kind);
    if (verb === "set") return spec?.setFlags ?? [];
    const action = spec?.actions?.find((a) => a.name === verb);
    return action ? (action.flags ?? []) : null;
  };
}

function kindOfAt(token: string): string | undefined {
  const id = parseInt(token.slice(1), 10);
  return Number.isNaN(id) ? undefined : workspace.get(id)?.kind;
}

function kindOfHash(token: string): string | undefined {
  const resolved = kinds.resolve(token);
  return resolved && !("ambiguous" in resolved) ? resolved.kind : undefined;
}

/**
 * Subcommands shared by `@n` and `#id`: the four generic verbs plus every
 * registered kind's `actions`. Computed on read so completion and `help`
 * follow whatever slices are mounted.
 */
function containerSubcommands(): SubcommandSpec[] {
  const base: SubcommandSpec[] = [
    { name: "move", description: "Move the container", flags: directionFlags },
    { name: "close", description: "Close the container" },
    { name: "title", description: "Rename the container" },
    {
      name: "set",
      description: "Edit the selected record",
      // Live union of every registered kind's `setFlags`.
      get flags() {
        return kinds.all.flatMap((k) => k.setFlags ?? []);
      },
    },
  ];
  const seen = new Set(base.map((s) => s.name));
  for (const spec of kinds.all) {
    for (const a of spec.actions ?? []) {
      if (seen.has(a.name)) continue;
      seen.add(a.name);
      base.push({ name: a.name, description: a.description, flags: a.flags });
    }
  }
  return base;
}

const atCommand: Command = {
  name: "@<n>",
  description: "Select / move / resize container @n",
  match: (token) => /^@\d*$/.test(token),
  completeFlags: containerFlagsFor(kindOfAt),
  flags: [...sizeFlags, ...directionFlags],
  get subcommands() {
    return containerSubcommands();
  },
  complete: (args) => (args.length === 1 ? containerSuggestions() : []),
  run: (args, ctx) => {
    const [token, ...rest] = args;
    const id = parseInt(token.slice(1), 10);
    if (Number.isNaN(id)) {
      ctx.print("usage: @<n> [move|close|title|set|-w|-h|-u|-d|-l|-r]", "error");
      return;
    }
    const container = workspace.get(id);
    if (!container) {
      ctx.print(`no container @${id}`, "error");
      return;
    }
    workspace.select(id);
    if (rest.length === 0) {
      ctx.print(`selected @${id}`, "output");
      return;
    }
    applyContainerArgs(container, rest, ctx);
  },
  preview: (args) => {
    const [token, ...rest] = args;
    const match = /^@(\d+)$/.exec(token);
    if (!match) return null;
    const id = parseInt(match[1], 10);
    const container = workspace.get(id);
    if (!container) return { target: `@${id}`, invalid: true, hint: `no container @${id}` };
    return previewContainerArgs(container, rest);
  },
};

const hashCommand: Command = {
  name: "#<id>",
  description: "Open / select a record by short id",
  match: (token) => /^#\S*$/.test(token),
  completeFlags: containerFlagsFor(kindOfHash),
  flags: [...sizeFlags, ...directionFlags, ...detailFlags],
  get subcommands() {
    return containerSubcommands();
  },
  complete: (args) => (args.length === 1 ? recordSuggestions() : []),
  run: (args, ctx) => {
    const [token, ...rest] = args;
    if (token === "#") {
      ctx.print("usage: #<id> [-d|-f|move|close|-w|-h|…]", "error");
      return;
    }
    const resolved = kinds.resolve(token);
    if (!resolved) {
      ctx.print(`unknown id: ${token}`, "error");
      return;
    }
    if ("ambiguous" in resolved) {
      printAmbiguous(resolved.ambiguous, ctx);
      return;
    }

    // `#xp --details` / `--full` print the record without opening a container.
    const level = levelFromArgs(parseArgs(rest));
    if (level) {
      showRecord(ctx, resolved.kind, resolved.id, level);
      return;
    }

    // `#dk -w 4`: spawn at that size directly (first-fit for the final
    // size) instead of spawning small and resizing into a neighbour.
    let container = workspace.findByContent(resolved.id);
    let trailing = rest;
    if (!container) {
      const { size, rest: withoutSize } = spawnSizeFromArgs(rest);
      container = workspace.spawn(resolved.kind, resolved.id, size);
      trailing = withoutSize;
    } else {
      workspace.select(container.id);
    }
    if (trailing.length === 0) {
      say(ctx, "selected ", resolved.id, ` @${container.id}`);
      return;
    }
    applyContainerArgs(container, trailing, ctx);
  },
  preview: (args) => {
    const [token, ...rest] = args;
    const resolved = kinds.resolve(token);
    if (!resolved) return null;
    if ("ambiguous" in resolved) {
      const labels = resolved.ambiguous.map((id) => sid(id));
      return { target: token, hint: `ambiguous: ${labels.join(" ")}`, invalid: true };
    }

    // `#xp -d` / `--full` print the record; `-d` is not "down" here.
    if (levelFromArgs(parseArgs(rest))) return { target: sid(resolved.id), hint: "print" };

    const container = workspace.findByContent(resolved.id);
    if (container) return previewContainerArgs(container, rest);

    // No container yet: this would spawn one — preview where it would land,
    // honouring `-w`/`-h` typed after the id.
    const { size } = spawnSizeFromArgs(rest);
    const base = kinds.sizeOf(resolved.kind);
    const rect = workspace.peekSpawn({ ...base, ...size });
    const hint = size.w !== undefined || size.h !== undefined ? `spawn ${rect.w}×${rect.h}` : "spawn";
    return { target: sid(resolved.id), ghost: rect, hint };
  },
};

const lsCommand: Command = {
  name: "ls",
  aliases: ["containers"],
  description: "List containers in the workspace",
  run: (_args, ctx) => {
    if (workspace.containers.length === 0) {
      ctx.print("(no containers)", "output");
      return;
    }
    const rows = workspace.containers
      .slice()
      .sort((a, b) => a.id - b.id)
      .map((c) => ({ c, label: containerLabel(c) }));
    const idWidth = Math.max(...rows.map(({ c }) => `@${c.id}`.length));
    const sidWidth = Math.max(...rows.map(({ c }) => spanText(idSpans(c.contentId)).length));
    const labelWidth = Math.max(...rows.map(({ label }) => label.length));
    for (const { c, label } of rows) {
      const star = c.id === workspace.selectedId ? "  *" : "";
      ctx.print(
        [
          { text: `@${c.id}`.padEnd(idWidth + 2), tone: "accent", command: `@${c.id}` },
          ...padSpans(idSpans(c.contentId), sidWidth + 2),
          { text: c.kind.padEnd(10), tone: "muted" },
          { text: label.padEnd(labelWidth + 2) },
          { text: `${c.w}×${c.h} @ (${c.x},${c.y})${star}`, tone: "muted" },
        ],
        "output",
      );
    }
  },
};

const closeCommand: Command = {
  name: "close",
  description: "Close a container",
  usage: "close [@n] | close --all",
  flags: [{ name: "all", description: "Close every container" }],
  complete: (args) => (args.length === 1 ? containerSuggestions() : []),
  run: (args, ctx) => {
    const parsed = parseArgs(args);
    if (flag(parsed, "all") !== undefined) {
      workspace.closeAll();
      ctx.print("closed all", "output");
      return;
    }

    const token = parsed.positional[0];
    let id: number | undefined;
    if (token) {
      const match = /^@?(\d+)$/.exec(token);
      if (!match) {
        ctx.print("usage: close [@n] | close --all", "error");
        return;
      }
      id = parseInt(match[1], 10);
    } else {
      id = workspace.selectedId ?? undefined;
    }

    if (id === undefined) {
      ctx.print("no container selected", "error");
      return;
    }
    const ok = workspace.close(id);
    ctx.print(ok ? `closed @${id}` : `no container @${id}`, ok ? "output" : "error");
  },
};

const layoutResetCommand: Command = {
  name: "reset",
  description: "Reset the workspace layout",
  usage: "reset --layout",
  flags: [{ name: "layout", description: "Reset the workspace layout" }],
  run: (args, ctx) => {
    if (flag(parseArgs(args), "layout") !== undefined) {
      workspace.closeAll();
      ctx.print("layout reset", "output");
      return;
    }
    ctx.print("usage: reset --layout", "error");
  },
};

/** The record-agnostic container commands: `@n`, `#id`, `ls`, `close`. */
export const containerCommands: Command[] = [atCommand, hashCommand, lsCommand, closeCommand];

/** `containerCommands` plus `reset --layout` — everything a workspace needs without any data slice. */
export const workspaceCommands: Command[] = [...containerCommands, layoutResetCommand];
