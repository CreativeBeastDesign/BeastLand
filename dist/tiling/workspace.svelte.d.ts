/**
 * Workspace store
 *
 * The tiling grid: a fixed-column, unbounded-row layout of `Container`s.
 * Implements the `WorkspaceStore` contract in `$lib/tiling/types.ts`.
 *
 * Multiple workspaces (Hyprland-style): the store holds `layouts` (a list of
 * named `WorkspaceLayout`s, each with its own containers/selection/`@n`
 * counter) and one `activeId`. Every original container operation — spawn,
 * move, resize, close, select*, setTitle, peek* — is a thin facade over the
 * *active* layout, read through `activeLayout()` and written through
 * `updateActive()`. `prune()` is the one exception: it walks every layout,
 * because a stale record is stale everywhere, not just in the workspace
 * you're looking at.
 */
import { type Rect, type WorkspaceStore } from "./types.js";
/** Do two grid rectangles overlap? */
export declare function overlaps(a: Rect, b: Rect): boolean;
export declare const workspace: WorkspaceStore;
