/**
 * The `worklog` tile kind.
 *
 * Unlike `customer`/`document` (one record per container, addressable as
 * `#xp`), the work log is a single tile: one virtual content id,
 * `"worklog:timeline"`. It always exists — there's nothing to prune.
 */

import type { KindSpec } from "$lib/tiling/kinds.svelte.js";
import WorklogTile from "$lib/components/tiles/WorklogTile.svelte";

export const WORKLOG_CONTENT_ID = "worklog:timeline";

export const worklogKind: KindSpec = {
  kind: "worklog",
  size: { w: 3, h: 3 },
  label: () => "Work log",
  exists: () => true,
  component: WorklogTile,
};
