/**
 * Tiling workspace types — the contract between the workspace store, the
 * terminal commands and the UI.
 *
 * Layout model: a fixed-column grid (`GRID_COLUMNS`) with unbounded rows.
 * Every container owns an explicit rectangle `{ x, y, w, h }` in grid units
 * (0-based x/y, 1-based w/h). Containers never overlap: spawning uses
 * first-fit placement, moving into an occupied cell swaps with the occupant,
 * and a resize that would overlap is rejected.
 *
 * Multiple workspaces (Hyprland-style): the store holds a list of named
 * `WorkspaceLayout`s and one `activeId`. Every existing container operation
 * (`spawn`, `move`, `select`…) is a facade over the *active* layout, so a
 * consumer that only ever knew one workspace keeps working unchanged.
 * Container ids (`@n`) are per layout; a new container takes the lowest
 * free id, so ids are reused after a close (`nextId` is kept for persisted
 * layouts but no longer decides the next id).
 */
export const GRID_COLUMNS = 6;
export const DEFAULT_SIZE = { w: 2, h: 2 };
export const MIN_SIZE = { w: 1, h: 1 };
