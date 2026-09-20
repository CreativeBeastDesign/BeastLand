/**
 * Workspace store
 *
 * The tiling grid: a fixed-column, unbounded-row layout of `Container`s.
 * Implements the `WorkspaceStore` contract in `$lib/tiling/types.ts`.
 */

import { kinds } from "./kinds.svelte.js";
import { storage } from "$lib/shell/storage.js";
import {
  DEFAULT_SIZE,
  GRID_COLUMNS,
  MIN_SIZE,
  type Container,
  type ContainerId,
  type ContentKind,
  type Direction,
  type MoveIntent,
  type MoveResult,
  type Rect,
  type ResizeIntent,
  type WorkspaceStore,
} from "./types.js";

const STORAGE_KEY = "beastland:workspace";

/** Do two grid rectangles overlap? */
export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

type Persisted = { containers: Container[]; selectedId: ContainerId | null; nextId: number };

function readPersisted(): Persisted | null {
  try {
    const raw = storage.get(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    if (!Array.isArray(parsed.containers)) return null;
    return {
      containers: parsed.containers,
      selectedId: parsed.selectedId ?? null,
      nextId: parsed.nextId ?? 1,
    };
  } catch {
    return null;
  }
}

function initialState(): Persisted {
  const persisted = readPersisted();
  if (!persisted) return { containers: [], selectedId: null, nextId: 1 };

  // Kinds register after this module loads, so stale containers are removed
  // later by `prune()` (the route calls it once its kinds are registered;
  // `hydrate` calls it itself when kinds already are).
  const containers = persisted.containers;
  const maxId = containers.reduce((max, c) => Math.max(max, c.id), 0);
  const selectedId = containers.some((c) => c.id === persisted.selectedId) ? persisted.selectedId : null;
  return { containers, selectedId, nextId: Math.max(persisted.nextId, maxId + 1) };
}

function createWorkspace() {
  let containers = $state<Container[]>([]);
  let selectedId = $state<ContainerId | null>(null);
  let nextId = 1;

  /** (Re)read the layout; runs at import and whenever the storage adapter changes. */
  function hydrate() {
    const initial = initialState();
    containers = initial.containers;
    selectedId = initial.selectedId;
    nextId = initial.nextId;
    // A late hydrate (async `storage.load`) lands after the route registered
    // its kinds, so the stale-container pass the route did is repeated here.
    if (kinds.all.length > 0) prune();
  }

  function persist() {
    try {
      storage.setJson(STORAGE_KEY, { containers, selectedId, nextId });
    } catch {
      /* storage may be unavailable; the in-memory state still works */
    }
  }

  function get(id: ContainerId): Container | undefined {
    return containers.find((c) => c.id === id);
  }

  function findByContent(contentId: string): Container | undefined {
    return containers.find((c) => c.contentId === contentId);
  }

  function rows(): number {
    return containers.reduce((max, c) => Math.max(max, c.y + c.h), 0);
  }

  /** First-fit row-major scan for a free `w`×`h` rectangle. */
  function findFreeRect(w: number, h: number): { x: number; y: number } {
    const maxY = rows() + h;
    for (let y = 0; y <= maxY; y++) {
      for (let x = 0; x <= GRID_COLUMNS - w; x++) {
        const candidate = { x, y, w, h };
        if (!containers.some((c) => overlaps(candidate, c))) return { x, y };
      }
    }
    // Unreachable in practice: the row past every existing container is
    // always free, and the loop above always reaches it.
    return { x: 0, y: maxY };
  }

  function select(id: ContainerId | null): boolean {
    if (id === null) {
      selectedId = null;
      persist();
      return true;
    }
    if (!get(id)) return false;
    selectedId = id;
    persist();
    return true;
  }

  /** Where a new container of this size would be placed, without creating it. */
  function peekSpawn(size?: { w?: number; h?: number }): Rect {
    const w = Math.min(Math.max(size?.w ?? DEFAULT_SIZE.w, MIN_SIZE.w), GRID_COLUMNS);
    const h = Math.max(size?.h ?? DEFAULT_SIZE.h, MIN_SIZE.h);
    const { x, y } = findFreeRect(w, h);
    return { x, y, w, h };
  }

  function peekSpawnFor(kind: ContentKind): Rect {
    return peekSpawn(kinds.sizeOf(kind));
  }

  function spawn(
    kind: ContentKind,
    contentId: string,
    opts?: { title?: string; w?: number; h?: number },
  ): Container {
    // Kind-specific size unless the caller asks for something explicit.
    const { x, y, w, h } = peekSpawn({ ...kinds.sizeOf(kind), ...opts });
    const container: Container = {
      id: nextId++,
      kind,
      contentId,
      title: opts?.title,
      x,
      y,
      w,
      h,
    };
    containers = [...containers, container];
    selectedId = container.id;
    persist();
    return container;
  }

  function open(kind: ContentKind, contentId: string): Container {
    const existing = findByContent(contentId);
    if (existing) {
      selectedId = existing.id;
      persist();
      return existing;
    }
    return spawn(kind, contentId);
  }

  function close(id: ContainerId): boolean {
    const before = containers.length;
    containers = containers.filter((c) => c.id !== id);
    if (containers.length === before) return false;

    if (selectedId === id) {
      selectedId =
        containers.length === 0
          ? null
          : containers.reduce((nearest, c) =>
              Math.abs(c.id - id) < Math.abs(nearest.id - id) ? c : nearest,
            ).id;
    }
    persist();
    return true;
  }

  function prune(): number {
    const before = containers.length;
    containers = containers.filter((c) => kinds.exists(c.kind, c.contentId));
    if (containers.length === before) return 0;
    if (selectedId !== null && !containers.some((c) => c.id === selectedId)) selectedId = null;
    persist();
    return before - containers.length;
  }

  hydrate();
  storage.register(STORAGE_KEY, hydrate);

  function closeAll(): void {
    containers = [];
    selectedId = null;
    nextId = 1; // an empty workspace starts counting from @1 again
    persist();
  }

  function byIdOrder(): Container[] {
    return [...containers].sort((a, b) => a.id - b.id);
  }

  function selectNext(): void {
    const ordered = byIdOrder();
    if (ordered.length === 0) return;
    const i = ordered.findIndex((c) => c.id === selectedId);
    const next = i === -1 ? ordered[0] : ordered[(i + 1) % ordered.length];
    selectedId = next.id;
    persist();
  }

  function selectPrev(): void {
    const ordered = byIdOrder();
    if (ordered.length === 0) return;
    const i = ordered.findIndex((c) => c.id === selectedId);
    const prev = i === -1 ? ordered[ordered.length - 1] : ordered[(i - 1 + ordered.length) % ordered.length];
    selectedId = prev.id;
    persist();
  }

  function selectDirection(dir: Direction): boolean {
    const current = selectedId !== null ? get(selectedId) : undefined;
    if (!current) {
      const ordered = byIdOrder();
      if (ordered.length === 0) return false;
      selectedId = ordered[0].id;
      persist();
      return true;
    }

    const cx = current.x + current.w / 2;
    const cy = current.y + current.h / 2;
    let best: Container | null = null;
    let bestDist = Infinity;
    let bestBand = false;

    for (const c of containers) {
      if (c.id === current.id) continue;
      const ox = c.x + c.w / 2;
      const oy = c.y + c.h / 2;
      const dx = ox - cx;
      const dy = oy - cy;

      const inDirection =
        dir === "up" ? dy < 0 : dir === "down" ? dy > 0 : dir === "left" ? dx < 0 : dx > 0;
      if (!inDirection) continue;

      const rowBand = current.y < c.y + c.h && c.y < current.y + current.h;
      const colBand = current.x < c.x + c.w && c.x < current.x + current.w;
      const band = dir === "left" || dir === "right" ? rowBand : colBand;
      const dist = Math.hypot(dx, dy);

      if (band && !bestBand) {
        best = c;
        bestDist = dist;
        bestBand = true;
      } else if (band === bestBand && dist < bestDist) {
        best = c;
        bestDist = dist;
      }
    }

    if (!best) return false;
    selectedId = best.id;
    persist();
    return true;
  }

  /** Rect a move would produce, without applying it. */
  function peekMove(id: ContainerId, dir: Direction): MoveIntent {
    const container = get(id);
    if (!container) {
      return { rect: { x: 0, y: 0, w: 0, h: 0 }, ok: false, reason: `no container @${id}` };
    }

    const dx = dir === "left" ? -1 : dir === "right" ? 1 : 0;
    const dy = dir === "up" ? -1 : dir === "down" ? 1 : 0;
    const target: Rect = { x: container.x + dx, y: container.y + dy, w: container.w, h: container.h };

    if (target.x < 0 || target.y < 0 || target.x + target.w > GRID_COLUMNS) {
      return { rect: target, ok: false, reason: "at edge" };
    }

    const occupants = containers.filter((c) => c.id !== id && overlaps(target, c));

    if (occupants.length === 0) {
      return { rect: target, ok: true };
    }

    if (occupants.length === 1 && occupants[0].w === container.w && occupants[0].h === container.h) {
      // Same-size neighbour: exchange slots outright (the shifted-by-one target
      // would still overlap the neighbour's remaining cells).
      const other = occupants[0];
      return { rect: { x: other.x, y: other.y, w: container.w, h: container.h }, ok: true, swapWith: other.id };
    }

    return { rect: target, ok: false, reason: `would overlap @${occupants[0].id}` };
  }

  function move(id: ContainerId, dir: Direction): MoveResult {
    const peek = peekMove(id, dir);
    if (!peek.ok) return { ok: false, reason: peek.reason ?? "cannot move" };

    if (peek.swapWith !== undefined) {
      const container = get(id)!;
      const other = get(peek.swapWith)!;
      containers = containers.map((c) => {
        if (c.id === id) return { ...c, x: other.x, y: other.y };
        if (c.id === other.id) return { ...c, x: container.x, y: container.y };
        return c;
      });
      persist();
      return { ok: true };
    }

    containers = containers.map((c) => (c.id === id ? { ...c, x: peek.rect.x, y: peek.rect.y } : c));
    persist();
    return { ok: true };
  }

  /** Rect a resize would produce (after clamping), without applying it. */
  function peekResize(id: ContainerId, size: { w?: number; h?: number }): ResizeIntent {
    const container = get(id);
    if (!container) {
      return { rect: { x: 0, y: 0, w: 0, h: 0 }, ok: false, reason: `no container @${id}` };
    }

    const maxW = GRID_COLUMNS - container.x;
    const w = size.w === undefined ? container.w : Math.min(Math.max(size.w, MIN_SIZE.w), maxW);
    const h = size.h === undefined ? container.h : Math.max(size.h, MIN_SIZE.h);
    const target: Rect = { x: container.x, y: container.y, w, h };

    const occupant = containers.find((c) => c.id !== id && overlaps(target, c));
    if (occupant) {
      return { rect: target, ok: false, reason: `would overlap @${occupant.id}` };
    }

    return { rect: target, ok: true };
  }

  function resize(id: ContainerId, size: { w?: number; h?: number }): MoveResult {
    const peek = peekResize(id, size);
    if (!peek.ok) return { ok: false, reason: peek.reason ?? "cannot resize" };

    containers = containers.map((c) => (c.id === id ? { ...c, w: peek.rect.w, h: peek.rect.h } : c));
    persist();
    return { ok: true };
  }

  function setTitle(id: ContainerId, title: string | undefined): void {
    containers = containers.map((c) => (c.id === id ? { ...c, title } : c));
    persist();
  }

  return {
    get containers(): readonly Container[] {
      return containers;
    },
    get selectedId(): ContainerId | null {
      return selectedId;
    },
    get selected(): Container | null {
      return selectedId !== null ? get(selectedId) ?? null : null;
    },
    get columns(): number {
      return GRID_COLUMNS;
    },
    get rows(): number {
      return rows();
    },

    get,
    findByContent,
    spawn,
    open,
    close,
    closeAll,
    prune,
    select,
    selectDirection,
    selectNext,
    selectPrev,
    move,
    resize,
    setTitle,

    peekMove,
    peekResize,
    peekSpawn,
    peekSpawnFor,
  };
}

export const workspace: WorkspaceStore = createWorkspace();
