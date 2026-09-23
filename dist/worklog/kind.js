/**
 * The `worklog` tile kind.
 *
 * Unlike `customer`/`document` (one record per container, addressable as
 * `#xp`), the work log is a single tile: one virtual content id,
 * `"worklog:timeline"`. It always exists — there's nothing to prune.
 */
import WorklogTile from "../components/tiles/WorklogTile.svelte";
export const WORKLOG_CONTENT_ID = "worklog:timeline";
export const worklogKind = {
    kind: "worklog",
    size: { w: 3, h: 3 },
    label: () => "Work log",
    exists: () => true,
    component: WorklogTile,
};
