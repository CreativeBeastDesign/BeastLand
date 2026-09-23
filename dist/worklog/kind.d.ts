/**
 * The `worklog` tile kind.
 *
 * Unlike `customer`/`document` (one record per container, addressable as
 * `#xp`), the work log is a single tile: one virtual content id,
 * `"worklog:timeline"`. It always exists — there's nothing to prune.
 */
import type { KindSpec } from "../tiling/kinds.svelte.js";
export declare const WORKLOG_CONTENT_ID = "worklog:timeline";
export declare const worklogKind: KindSpec;
