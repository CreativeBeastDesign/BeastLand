/**
 * Tiling workspace types — the contract between the workspace store, the
 * terminal commands and the UI.
 *
 * Layout model: a fixed-column grid (`GRID_COLUMNS`) with unbounded rows.
 * Every container owns an explicit rectangle `{ x, y, w, h }` in grid units
 * (0-based x/y, 1-based w/h). Containers never overlap: spawning uses
 * first-fit placement, moving into an occupied cell swaps with the occupant,
 * and a resize that would overlap is rejected.
 */

import type { Customer, Document } from "$lib/data/types.js";

export const GRID_COLUMNS = 6;
export const DEFAULT_SIZE = { w: 2, h: 2 } as const;
export const MIN_SIZE = { w: 1, h: 1 } as const;

/**
 * A registered content kind (see `kinds.svelte.ts`). Open-ended on purpose:
 * slices add kinds (customer, document, worklog, …) at runtime.
 */
export type ContentKind = string;

export type ContainerId = number;

export type Container = {
  /** Sequential per session; typed as `@2`. */
  id: ContainerId;
  kind: ContentKind;
  /** Full record id, e.g. `customer:xpoakahew4rsp2stfg0y`. */
  contentId: string;
  /** Optional user-set title shown in the frame. */
  title?: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type Direction = "up" | "down" | "left" | "right";

export type MoveResult = { ok: true } | { ok: false; reason: string };

/** A rectangle in grid units, as owned by a `Container` or previewed by a `peek*` query. */
export type Rect = { x: number; y: number; w: number; h: number };

/** What `move(id, dir)` would produce, without applying it. */
export type MoveIntent = { rect: Rect; ok: boolean; reason?: string; swapWith?: ContainerId };

/** What `resize(id, size)` would produce (after clamping), without applying it. */
export type ResizeIntent = { rect: Rect; ok: boolean; reason?: string };

/** Public surface of `$lib/tiling/workspace.svelte.ts`. */
export type WorkspaceStore = {
  readonly containers: readonly Container[];
  readonly selectedId: ContainerId | null;
  readonly selected: Container | null;
  readonly columns: number;
  /** Number of rows currently in use (max y + h). */
  readonly rows: number;

  get(id: ContainerId): Container | undefined;
  /** Find the container showing a record, if any. */
  findByContent(contentId: string): Container | undefined;

  /** Spawn a container for a record (first-fit placement) and select it. */
  spawn(kind: ContentKind, contentId: string, opts?: { title?: string; w?: number; h?: number }): Container;
  /** Spawn, or select the existing container for that record. */
  open(kind: ContentKind, contentId: string): Container;
  close(id: ContainerId): boolean;
  closeAll(): void;
  /** Drop containers whose record no longer exists (per the kind registry). */
  prune(): number;

  select(id: ContainerId | null): boolean;
  /** Select the nearest container in a direction from the current selection. */
  selectDirection(dir: Direction): boolean;
  selectNext(): void;
  selectPrev(): void;

  /** Move by one cell; swaps with an occupant, clamps at the left/top edge. */
  move(id: ContainerId, dir: Direction): MoveResult;
  /** Resize; rejected when it would overlap another container. */
  resize(id: ContainerId, size: { w?: number; h?: number }): MoveResult;
  setTitle(id: ContainerId, title: string | undefined): void;

  /** Rect a move would produce, without applying it. */
  peekMove(id: ContainerId, dir: Direction): MoveIntent;
  /** Rect a resize would produce (after clamping), without applying it. */
  peekResize(id: ContainerId, size: { w?: number; h?: number }): ResizeIntent;
  /** Where a new container of this size would be placed. */
  peekSpawn(size?: { w?: number; h?: number }): Rect;
  /** Where a container of `kind` would be spawned, at that kind's size. */
  peekSpawnFor(kind: ContentKind): Rect;
};

/** Public surface of `$lib/data/store.svelte.ts`. */
export type DataStore = {
  readonly customers: readonly Customer[];
  readonly documents: readonly Document[];
  /** Every known record id (customers + documents), for short-id computation. */
  readonly allIds: string[];

  getCustomer(id: string): Customer | undefined;
  getDocument(id: string): Document | undefined;
  /** Resolve `#xp`-style input to a record; see `$lib/tiling/ids.ts`. */
  resolve(input: string): { kind: ContentKind; id: string } | { ambiguous: string[] } | null;

  createCustomer(fields?: Partial<import("$lib/data/types.js").CustomerFields>): Customer;
  updateCustomer(id: string, patch: Partial<import("$lib/data/types.js").CustomerFields>): Customer | undefined;
  deleteCustomer(id: string): boolean;

  createDocument(
    docType: import("$lib/data/types.js").DocType,
    opts?: { customerId?: string; title?: string; projectId?: string | null },
  ): Document;
  updateDocument(id: string, patch: Partial<import("$lib/data/types.js").DocumentFields>): Document | undefined;
  deleteDocument(id: string): boolean;

  addItem(docId: string, fields?: Partial<import("$lib/data/types.js").DocumentItemFields>): import("$lib/data/types.js").DocumentItem | undefined;
  /** `index` is 1-based, as typed in the terminal (`item 3 set …`); `"last"` is accepted. */
  updateItem(docId: string, index: number | "last", patch: Partial<import("$lib/data/types.js").DocumentItemFields>): import("$lib/data/types.js").DocumentItem | undefined;
  removeItem(docId: string, index: number | "last"): boolean;

  /** Drop everything and reload the seed. */
  reset(): void;
};
