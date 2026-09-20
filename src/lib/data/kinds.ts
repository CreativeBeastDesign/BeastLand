/**
 * Tile kinds provided by the data slice: customers and documents.
 * Registered by the tiling route while it is mounted.
 */

import type { KindSpec } from "$lib/tiling/kinds.svelte.js";
import { runSet } from "$lib/tiling/workspace-commands.js";
import { handleItem, itemFieldFlags } from "$lib/tiling/commands.js";
import { workspace } from "$lib/tiling/workspace.svelte.js";
import { data } from "./store.svelte.js";
import { customerName } from "./format.js";
import { customerFields, documentFields, viewFrom } from "./views.js";
import CustomerTile from "$lib/components/tiles/CustomerTile.svelte";
import DocumentTile from "$lib/components/tiles/DocumentTile.svelte";
import {
  customerFieldFlags,
  customerFieldsFromFlags,
  documentFieldFlags,
  documentFieldsFromFlags,
} from "./fields.js";

export const customerKind: KindSpec = {
  kind: "customer",
  size: { w: 2, h: 2 },
  label: (id) => {
    const c = data.getCustomer(id);
    return c ? customerName(c) : "?";
  },
  exists: (id) => !!data.getCustomer(id),
  component: CustomerTile,
  ids: () => data.customers.map((c) => c.id),
  view: viewFrom(customerFields, (id) => data.getCustomer(id)),
  setFlags: customerFieldFlags,
  set: (id, parsed) => {
    const patch = customerFieldsFromFlags(parsed);
    if (Object.keys(patch).length === 0) {
      return { ok: false, error: "usage: set --name|--firstname/-f|--lastname/-l|--company|--email|--street|--zip|--city|--country|--salutation <value>" };
    }
    if (!data.updateCustomer(id, patch)) return { ok: false, error: "no such customer" };
    return { ok: true, patch };
  },
  actions: [
    {
      // `@n customer set …` — an alias of `@n set …` kept for the docs' grammar.
      name: "customer",
      description: "Edit the container's customer",
      flags: customerFieldFlags,
      run: (id, args, ctx) => {
        if (args[0] !== "set") {
          ctx.print("usage: customer set --flags", "error");
          return;
        }
        const container = workspace.findByContent(id);
        if (container) runSet(container, args.slice(1), ctx);
      },
    },
  ],
};

export const documentKind: KindSpec = {
  kind: "document",
  size: { w: 3, h: 3 },
  label: (id) => {
    const d = data.getDocument(id);
    return d ? d.number ?? d.title ?? "untitled" : "?";
  },
  exists: (id) => !!data.getDocument(id),
  component: DocumentTile,
  ids: () => data.documents.map((d) => d.id),
  view: viewFrom(documentFields, (id) => data.getDocument(id)),
  setFlags: documentFieldFlags,
  set: (id, parsed) => {
    const patch = documentFieldsFromFlags(parsed);
    if (Object.keys(patch).length === 0) {
      return { ok: false, error: "usage: set --title|--status|--date|--valid-until|--discount <value>" };
    }
    if (!data.updateDocument(id, patch)) return { ok: false, error: "no such document" };
    return { ok: true, patch };
  },
  actions: [
    {
      name: "item",
      description: "Manage items on the container's document",
      flags: itemFieldFlags,
      run: (id, args, ctx) => handleItem(id, args, ctx),
    },
  ],
};

export const dataKinds: KindSpec[] = [customerKind, documentKind];
