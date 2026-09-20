/**
 * The `project` tile kind. Registered by the tiling route while it is
 * mounted, like `customerKind`/`documentKind` in `$lib/data/kinds.ts`.
 */

import type { KindSpec } from "$lib/tiling/kinds.svelte.js";
import { projects } from "./store.svelte.js";
import ProjectTile from "$lib/components/tiles/ProjectTile.svelte";
import { customerIdFromFlags, projectFieldFlags, projectFieldsFromFlags } from "./fields.js";
import { projectFields } from "./views.js";
import { viewFrom } from "$lib/tiling/views.js";

export const projectKind: KindSpec = {
  kind: "project",
  size: { w: 3, h: 3 },
  label: (id) => {
    const p = projects.get(id);
    return p ? p.name : "?";
  },
  exists: (id) => !!projects.get(id),
  component: ProjectTile,
  ids: () => projects.projects.map((p) => p.id),
  view: viewFrom(projectFields, (id) => projects.get(id)),
  setFlags: projectFieldFlags,
  set: (id, parsed) => {
    const customer = customerIdFromFlags(parsed);
    if ("error" in customer) return { ok: false, error: customer.error };
    const patch = projectFieldsFromFlags(parsed);
    if (customer.id !== null) patch.customerId = customer.id;
    if (Object.keys(patch).length === 0) {
      return { ok: false, error: "usage: set --name/-n|--customer|--status|--start|--end|--budget|--description <value>" };
    }
    if (!projects.update(id, patch)) return { ok: false, error: "no such project" };
    return { ok: true, patch };
  },
};
