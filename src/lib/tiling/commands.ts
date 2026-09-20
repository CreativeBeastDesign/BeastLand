/**
 * Tiling commands — the demo CRM
 *
 * `customer`, `docs`, `item` and `reset --data` on top of the record-agnostic
 * workspace commands in `./workspace-commands.ts` (`@n`, `#id`, `ls`,
 * `close`). `tilingCommands` bundles both for the `/tiling` route; an app
 * with its own data registers `workspaceCommands` plus its own groups.
 *
 * `@n item …` / `@n customer set …` reach this file through the document /
 * customer kinds' `actions` (see `$lib/data/kinds.ts`), not through the
 * generic dispatcher.
 */

import { data } from "$lib/data/store.svelte.js";
import { workspace } from "./workspace.svelte.js";
import { shortId } from "./ids.js";
import type { Container } from "./types.js";
import {
  flag,
  parseArgs,
  type Command,
  type CommandContext,
  type FlagSpec,
  type Intent,
  type ParsedArgs,
  type Suggestion,
} from "$lib/shell/commands.js";
import {
  containerCommands,
  describePatch,
  detailFlags,
  levelFromArgs,
  printAmbiguous,
  printList,
  printTable,
  runSet,
  say,
  showRecord,
  sid,
  spawnSizeFromArgs,
} from "./workspace-commands.js";
export { runSet } from "./workspace-commands.js";
import {
  customerName,
  formatMoney,
  itemLabels,
  itemTotal,
  resolveItemRef,
  splitName,
} from "$lib/data/format.js";
import { docTypeLabels } from "$lib/data/types.js";
import type { CustomerFields, DocumentFields, DocumentItem, DocumentItemFields, DocType } from "$lib/data/types.js";
import { customerFields, documentFields, type Level } from "$lib/data/views.js";
import type { ContentKind } from "./types.js";
import { kinds } from "./kinds.svelte.js";
import { customerFieldFlags, customerFieldsFromFlags, documentFieldFlags } from "$lib/data/fields.js";
import { notify } from "$lib/shell/toasts.svelte.js";
// Cross-slice hook (documented exception to "project depends on tiling/data,
// never the reverse"): `docs new --project <#id>` needs project names for
// tab completion. Resolving the flag itself goes through `kinds.resolve`
// and needs no import at all.
import { projects } from "$lib/project/store.svelte.js";

/** Resolve `#xp`-style input to a record of the expected kind, printing errors. */
function resolveKind(token: string, kind: ContentKind, ctx: CommandContext): string | null {
  const resolved = kinds.resolve(token);
  if (!resolved) {
    ctx.print(`unknown id: ${token}`, "error");
    return null;
  }
  if ("ambiguous" in resolved) {
    printAmbiguous(resolved.ambiguous, ctx);
    return null;
  }
  if (resolved.kind !== kind) {
    ctx.print(`${token} is not a ${kind}`, "error");
    return null;
  }
  return resolved.id;
}

// ---------------------------------------------------------------------------
// Shared flag groups, and dynamic-completion helpers.
// ---------------------------------------------------------------------------

const itemFieldFlags: FlagSpec[] = [
  { name: "title", short: "t", description: "Item title", takesValue: true },
  { name: "price", short: "p", description: "Unit price", takesValue: true },
  { name: "qty", short: "n", description: "Quantity", takesValue: true },
  { name: "description", description: "Item description", takesValue: true },
  { name: "optional", short: "o", description: "Mark the item optional" },
  { name: "required", description: "Mark the item required" },
];

/** `#xp` candidates for every known customer, e.g. for `customer <partial>`. */
function customerSuggestions(): Suggestion[] {
  return data.customers.map((c) => ({
    value: `#${shortId(c.id, kinds.allIds).short}`,
    label: customerName(c) || "(no name)",
    description: c.company,
    kind: "value",
  }));
}

/** `#fa` candidates for every known document, e.g. for `docs <partial>`. */
function documentSuggestions(): Suggestion[] {
  return data.documents.map((d) => ({
    value: `#${shortId(d.id, kinds.allIds).short}`,
    label: d.title || d.number || docTypeLabels[d.docType],
    description: docTypeLabels[d.docType],
    kind: "value",
  }));
}

/** `#pr` candidates for every known project, for `docs new --project <partial>`. */
function projectSuggestions(): Suggestion[] {
  return projects.projects.map((p) => ({
    value: `#${shortId(p.id, kinds.allIds).short}`,
    label: p.name || "(unnamed)",
    kind: "value",
  }));
}

// ---------------------------------------------------------------------------
// customer
// ---------------------------------------------------------------------------


function printCustomerList(ctx: CommandContext, level: Level) {
  printList(ctx, data.customers, customerFields, level, "(no customers)");
}

/** `customer set …` on the selected container: only customers qualify. */
function applyCustomerSet(container: Container, args: string[], ctx: CommandContext) {
  if (container.kind !== "customer") {
    ctx.print(`@${container.id} is not a customer`, "error");
    return;
  }
  runSet(container, args, ctx);
}

const customerCommand: Command = {
  name: "customer",
  aliases: ["c"],
  description: "List, create, edit, or open customers",
  usage: "customer [list [-d]|new|<#id> [-d|-f]|rm <#id>] [set --flags]",
  // `--details/-d` and `--full/-f` are also accepted directly after an id
  // (`customer #xp -d`), so declare them at the command level too.
  flags: detailFlags,
  subcommands: [
    { name: "list", aliases: ["ls"], description: "List customers", flags: detailFlags },
    { name: "new", description: "Create a customer", flags: customerFieldFlags },
    { name: "set", description: "Edit the selected customer", flags: customerFieldFlags },
    { name: "rm", description: "Remove a customer" },
  ],
  complete: (args) => {
    if (args.length === 1) return customerSuggestions();
    if (args.length === 2 && args[0] === "rm") return customerSuggestions();
    return [];
  },
  run: (args, ctx) => {
    const [head, ...rest] = args;

    if (!head || head === "list" || head === "ls" || head.startsWith("-")) {
      printCustomerList(ctx, levelFromArgs(parseArgs(head?.startsWith("-") ? args : rest)) ?? "list");
      return;
    }

    if (head === "new") {
      const fields = customerFieldsFromFlags(parseArgs(rest));
      const customer = data.createCustomer(fields);
      const container = workspace.spawn("customer", customer.id);
      say(ctx, "created ", customer.id, ` @${container.id}`);
      return;
    }

    if (head === "set") {
      if (!workspace.selected) {
        ctx.print("no container selected", "error");
        return;
      }
      applyCustomerSet(workspace.selected, rest, ctx);
      return;
    }

    if (head === "rm") {
      const token = rest[0];
      if (!token) {
        ctx.print("usage: customer rm <#id>", "error");
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
      if (resolved.kind !== "customer") {
        ctx.print(`${token} is not a customer`, "error");
        return;
      }
      const label = sid(resolved.id);
      const removedName = kinds.labelOf("customer", resolved.id);
      const existing = workspace.findByContent(resolved.id);
      data.deleteCustomer(resolved.id);
      if (existing) workspace.close(existing.id);
      ctx.print(`removed ${label}`, "output");
      // Destructive: surface it outside the terminal too.
      notify({ title: `Removed ${removedName}`, message: `${label} deleted`, tone: "warning" });
      return;
    }

    // `customer <#id>` opens it; with `--details/-d` or `--full/-f` it prints instead.
    const id = resolveKind(head, "customer", ctx);
    if (!id) return;
    const level = levelFromArgs(parseArgs(rest));
    if (level) {
      showRecord(ctx, "customer", id, level);
      return;
    }
    const container = workspace.open("customer", id);
    say(ctx, "selected ", id, ` @${container.id}`);
  },
};

// ---------------------------------------------------------------------------
// docs
// ---------------------------------------------------------------------------

function printDocList(ctx: CommandContext, level: Level) {
  printList(ctx, data.documents, documentFields, level, "(no documents)");
}

function applyDocumentSet(container: Container, args: string[], ctx: CommandContext) {
  if (container.kind !== "document") {
    ctx.print(`@${container.id} is not a document`, "error");
    return;
  }
  runSet(container, args, ctx);
}

const docsCommand: Command = {
  name: "docs",
  aliases: ["doc", "d"],
  description: "List, create, or edit documents",
  usage: "docs [list [-d]|new -q|-i|-c|<#id> [-d|-f]] [set --flags]",
  flags: detailFlags,
  subcommands: [
    { name: "list", aliases: ["ls"], description: "List documents", flags: detailFlags },
    {
      name: "new",
      description: "Create a document",
      flags: [
        { name: "quotation", short: "q", description: "Create a quotation (default)" },
        { name: "invoice", short: "i", description: "Create an invoice" },
        { name: "confirmation", short: "c", description: "Create an order confirmation" },
        { name: "customer", description: "Customer to attach", takesValue: true },
        { name: "project", description: "Project to attach", takesValue: true },
        { name: "title", description: "Document title", takesValue: true },
      ],
    },
    { name: "set", description: "Edit the selected document", flags: documentFieldFlags },
  ],
  complete: (args) => {
    const prev = args[args.length - 2];
    if (prev === "--customer") return customerSuggestions();
    if (prev === "--project") return projectSuggestions();
    if (args.length === 1) return documentSuggestions();
    return [];
  },
  run: (args, ctx) => {
    const [head, ...rest] = args;

    if (!head || head === "list" || head === "ls" || head.startsWith("-")) {
      printDocList(ctx, levelFromArgs(parseArgs(head?.startsWith("-") ? args : rest)) ?? "list");
      return;
    }

    if (head === "new") {
      const parsed = parseArgs(rest);
      let docType: DocType = "offer";
      if (flag(parsed, "invoice", "i") !== undefined) docType = "invoice";
      else if (flag(parsed, "confirmation", "c") !== undefined) docType = "order_confirmation";

      let customerId: string | undefined;
      const customerFlag = flag(parsed, "customer");
      if (typeof customerFlag === "string") {
        const resolved = kinds.resolve(customerFlag);
        if (!resolved) {
          ctx.print(`unknown id: ${customerFlag}`, "error");
          return;
        }
        if ("ambiguous" in resolved) {
          printAmbiguous(resolved.ambiguous, ctx);
          return;
        }
        if (resolved.kind !== "customer") {
          ctx.print(`${customerFlag} is not a customer`, "error");
          return;
        }
        customerId = resolved.id;
      } else if (workspace.selected?.kind === "customer") {
        customerId = workspace.selected.contentId;
      }

      let projectId: string | undefined;
      const projectFlag = flag(parsed, "project");
      if (typeof projectFlag === "string") {
        const resolved = kinds.resolve(projectFlag);
        if (!resolved) {
          ctx.print(`unknown id: ${projectFlag}`, "error");
          return;
        }
        if ("ambiguous" in resolved) {
          printAmbiguous(resolved.ambiguous, ctx);
          return;
        }
        if (resolved.kind !== "project") {
          ctx.print(`${projectFlag} is not a project`, "error");
          return;
        }
        projectId = resolved.id;
      } else if (workspace.selected?.kind === "project") {
        projectId = workspace.selected.contentId;
      }

      const titleFlag = flag(parsed, "title");
      const doc = data.createDocument(docType, {
        customerId,
        projectId,
        title: typeof titleFlag === "string" ? titleFlag : undefined,
      });
      const container = workspace.spawn("document", doc.id);
      say(ctx, "created ", doc.id, ` @${container.id}`);
      return;
    }

    if (head === "set") {
      if (!workspace.selected) {
        ctx.print("no container selected", "error");
        return;
      }
      applyDocumentSet(workspace.selected, rest, ctx);
      return;
    }

    // `docs <#id>` opens it; with `--details/-d` or `--full/-f` it prints instead.
    const id = resolveKind(head, "document", ctx);
    if (!id) return;
    const level = levelFromArgs(parseArgs(rest));
    if (level) {
      showRecord(ctx, "document", id, level);
      return;
    }
    const container = workspace.open("document", id);
    say(ctx, "selected ", id, ` @${container.id}`);
  },
};

// ---------------------------------------------------------------------------
// item
// ---------------------------------------------------------------------------

function itemFieldsFromFlags(parsed: ParsedArgs): Partial<DocumentItemFields> {
  const fields: Partial<DocumentItemFields> = {};
  const title = flag(parsed, "title", "t");
  if (typeof title === "string") fields.title = title;
  const price = flag(parsed, "price", "p");
  if (typeof price === "string") fields.unitPriceMinor = Math.round(parseFloat(price) * 100);
  const qty = flag(parsed, "qty", "n");
  if (typeof qty === "string") fields.quantity = parseFloat(qty);
  const description = flag(parsed, "description");
  if (typeof description === "string") fields.description = description;
  if (flag(parsed, "optional", "o") !== undefined) fields.isOptional = true;
  if (flag(parsed, "required") !== undefined) fields.isOptional = false;
  return fields;
}

function printItems(items: DocumentItem[], ctx: CommandContext) {
  if (!items || items.length === 0) {
    ctx.print("(no items)", "output");
    return;
  }
  const labels = itemLabels(items);
  const rows = items.map((item, i) => {
    const qtyPrice = `${item.quantity} × ${formatMoney(item.unitPriceMinor)}`;
    return [labels[i].padStart(2), item.title, qtyPrice, formatMoney(itemTotal(item))];
  });
  printTable(ctx, rows);
}

/**
 * `item …` on a document: shared by the top-level `item` command and the
 * document kind's `item` action (`@n item …` / `#id item …`, see
 * `$lib/data/kinds.ts`).
 */
export function handleItem(documentId: string, args: string[], ctx: CommandContext) {
  const doc = data.getDocument(documentId);
  if (!doc) {
    ctx.print(`no such document ${sid(documentId)}`, "error");
    return;
  }

  const [head, ...rest] = args;

  if (!head || head === "list" || head === "ls") {
    printItems(doc.items, ctx);
    return;
  }

  if (head === "new") {
    const fields = itemFieldsFromFlags(parseArgs(rest));
    const item = data.addItem(doc.id, fields);
    if (item) {
      const fresh = data.getDocument(doc.id);
      const label = fresh ? itemLabels(fresh.items)[fresh.items.length - 1] : "?";
      ctx.print(`added item ${label}: ${item.title}`, "output");
    }
    return;
  }

  // `3` = third required item, `b` = second optional item, `last` = last of all.
  const index = resolveItemRef(doc.items, head);
  if (index === null) {
    ctx.print(`no item ${head}`, "error");
    return;
  }

  const [sub, ...subRest] = rest;

  if (sub === "rm") {
    const ok = data.removeItem(doc.id, index);
    ctx.print(ok ? `removed item ${head}` : `no item ${head}`, ok ? "output" : "error");
    return;
  }

  if (sub === "set") {
    const patch = itemFieldsFromFlags(parseArgs(subRest));
    if (Object.keys(patch).length === 0) {
      ctx.print(
        "usage: item <n|a|last> set --title/-t|--price/-p|--qty/-n|--optional|--required|--description <value>",
        "error",
      );
      return;
    }
    const updated = data.updateItem(doc.id, index, patch);
    if (!updated) {
      ctx.print(`no item ${head}`, "error");
      return;
    }
    ctx.print(`updated item ${head}: ${describePatch(patch)}`, "output");
    return;
  }

  ctx.print("usage: item [list|new] | item <n|a|last> set|rm", "error");
}

const itemCommand: Command = {
  name: "item",
  aliases: ["i"],
  description: "List, add, or edit items on the selected document",
  usage: "item [list|new --flags] | item <n|a|last> set --flags | item <n|a|last> rm",
  // `set`/`rm` sit in 3rd position (`item 3 set --price 10`), where
  // `knownFlags` only looks at `args[0]` — so their flags live here instead
  // of on a subcommand spec.
  flags: itemFieldFlags,
  subcommands: [
    { name: "list", aliases: ["ls"], description: "List items" },
    { name: "new", description: "Add an item", flags: itemFieldFlags },
  ],
  complete: (args) => {
    const container = workspace.selected;
    if (!container || container.kind !== "document") return [];
    const doc = data.getDocument(container.contentId);
    if (!doc) return [];

    // 2nd token: an item number (or `last`) to target.
    if (args.length === 1) {
      const labels = itemLabels(doc.items);
      const suggestions: Suggestion[] = doc.items.map((item, i) => ({
        value: labels[i],
        label: item.title,
        description: item.isOptional ? "optional" : undefined,
        kind: "value",
      }));
      if (doc.items.length > 0) {
        suggestions.push({ value: "last", label: doc.items[doc.items.length - 1].title, kind: "value" });
      }
      return suggestions;
    }

    // 3rd token, after a resolved item number/`last`: `set` or `rm`.
    if (args.length === 2) {
      const head = args[0];
      if (head !== "last" && !/^\d+$/.test(head)) return [];
      return [
        { value: "set", description: "Edit fields on this item", kind: "subcommand" },
        { value: "rm", description: "Remove this item", kind: "subcommand" },
      ];
    }

    return [];
  },
  run: (args, ctx) => {
    const container = workspace.selected;
    if (!container) {
      ctx.print("no container selected", "error");
      return;
    }
    if (container.kind !== "document") {
      ctx.print(`@${container.id} is not a document`, "error");
      return;
    }
    handleItem(container.contentId, args, ctx);
  },
};

const resetCommand: Command = {
  name: "reset",
  description: "Reset seed data or the workspace layout",
  usage: "reset --data | reset --layout",
  flags: [
    { name: "data", description: "Reset seed data" },
    { name: "layout", description: "Reset the workspace layout" },
  ],
  run: (args, ctx) => {
    const parsed = parseArgs(args);
    if (flag(parsed, "data") !== undefined) {
      data.reset();
      workspace.closeAll();
      ctx.print("data reset", "output");
      notify({ title: "Data reset", message: "Seed customers and documents restored.", tone: "warning" });
      return;
    }
    if (flag(parsed, "layout") !== undefined) {
      workspace.closeAll();
      ctx.print("layout reset", "output");
      return;
    }
    ctx.print("usage: reset --data | reset --layout", "error");
  },
};

/** Item flags, for the document kind's `item` action (`$lib/data/kinds.ts`). */
export { itemFieldFlags };

/** The demo bundle: CRM commands + the generic container commands + `reset --data|--layout`. */
export const tilingCommands: Command[] = [customerCommand, docsCommand, itemCommand, ...containerCommands, resetCommand];
