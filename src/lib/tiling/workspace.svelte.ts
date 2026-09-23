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

import { kinds } from "./kinds.svelte.js";
import { storage } from "$lib/shell/storage.js";
import { undoStack } from "$lib/shell/undo.svelte.js";
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
  type WorkspaceLayout,
  type WorkspaceStore,
} from "./types.js";

const STORAGE_KEY = "beastland:workspaces";
/** Pre-workspaces single-layout key; migrated into layout "1" on first read. */
const OLD_STORAGE_KEY = "beastland:workspace";

/** Do two grid rectangles overlap? */
export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

type Persisted = { layouts: WorkspaceLayout[]; activeId: string };
type OldPersisted = { containers: Container[]; selectedId: ContainerId | null; nextId: number };

function emptyLayout(id: string, name: string): WorkspaceLayout {
  return { id, name, containers: [], selectedId: null, nextId: 1 };
}

/** Read the current-format key; null when absent or malformed. */
function readCurrent(): Persisted | null {
  try {
    const raw = storage.get(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    if (!Array.isArray(parsed.layouts) || parsed.layouts.length === 0) return null;
    return { layouts: parsed.layouts, activeId: parsed.activeId ?? parsed.layouts[0].id };
  } catch {
    return null;
  }
}

/** Read the pre-workspaces single-layout key and fold it into layout "1". */
function readOld(): Persisted | null {
  try {
    const raw = storage.get(OLD_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OldPersisted>;
    if (!Array.isArray(parsed.containers)) return null;
    const layout: WorkspaceLayout = {
      id: "1",
      name: "1",
      containers: parsed.containers,
      selectedId: parsed.selectedId ?? null,
      nextId: parsed.nextId ?? 1,
    };
    return { layouts: [layout], activeId: "1" };
  } catch {
    return null;
  }
}

function readPersisted(): { persisted: Persisted; migrated: boolean } {
  const current = readCurrent();
  if (current) return { persisted: current, migrated: false };

  const old = readOld();
  if (old) return { persisted: old, migrated: true };

  return { persisted: { layouts: [emptyLayout("1", "1")], activeId: "1" }, migrated: false };
}

function normalizeLayout(l: WorkspaceLayout): WorkspaceLayout {
  const containers = l.containers;
  const maxId = containers.reduce((max, c) => Math.max(max, c.id), 0);
  const selectedId = containers.some((c) => c.id === l.selectedId) ? l.selectedId : null;
  return { id: l.id, name: l.name, containers, selectedId, nextId: Math.max(l.nextId ?? 1, maxId + 1) };
}

function initialState(): { layouts: WorkspaceLayout[]; activeId: string; migrated: boolean } {
  const { persisted, migrated } = readPersisted();
  const layouts = persisted.layouts.map(normalizeLayout);
  const activeId = layouts.some((l) => l.id === persisted.activeId) ? persisted.activeId : layouts[0].id;
  return { layouts, activeId, migrated };
}

function createWorkspace() {
  let layouts = $state<WorkspaceLayout[]>([]);
  let activeId = $state<string>("");
  // Set for the duration of an undo inverse (or a fallback `spawn` it makes):
  // suppresses the very push*() calls below, so undoing never grows the
  // stack, and a redo-less inverse can call `spawn`/`close`/`setRect`
  // without it being mistaken for a fresh, user-initiated layout change.
  let applyingUndo = false;

  function activeLayout(): WorkspaceLayout {
    return layouts.find((l) => l.id === activeId) ?? layouts[0];
  }

  /** Replace the active layout's fields immutably (same pattern the old single-layout store used). */
  function updateActive(patch: Partial<Pick<WorkspaceLayout, "containers" | "selectedId" | "nextId">>) {
    layouts = layouts.map((l) => (l.id === activeId ? { ...l, ...patch } : l));
  }

  /** (Re)read the layout; runs at import and whenever the storage adapter changes. */
  function hydrate() {
    const initial = initialState();
    layouts = initial.layouts;
    activeId = initial.activeId;
    // A late hydrate (async `storage.load`) lands after the route registered
    // its kinds, so the stale-container pass the route did is repeated here.
    if (kinds.all.length > 0) prune();
    if (initial.migrated) {
      persist();
      storage.remove(OLD_STORAGE_KEY);
    }
  }

  function persist() {
    try {
      storage.setJson(STORAGE_KEY, { layouts, activeId });
    } catch {
      /* storage may be unavailable; the in-memory state still works */
    }
  }

  function get(id: ContainerId): Container | undefined {
    return activeLayout().containers.find((c) => c.id === id);
  }

  function findByContent(contentId: string): Container | undefined {
    return activeLayout().containers.find((c) => c.contentId === contentId);
  }

  function rows(): number {
    return activeLayout().containers.reduce((max, c) => Math.max(max, c.y + c.h), 0);
  }

  /** First-fit row-major scan for a free `w`×`h` rectangle (in the active layout). */
  function findFreeRect(w: number, h: number): { x: number; y: number } {
    const containers = activeLayout().containers;
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
      updateActive({ selectedId: null });
      persist();
      return true;
    }
    if (!get(id)) return false;
    updateActive({ selectedId: id });
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
    const layout = activeLayout();
    // Lowest free `@n` (like tmux/i3): closing @3 frees it for the next tile,
    // so ids stay near the open-tile count instead of growing forever.
    const used = new Set(layout.containers.map((c) => c.id));
    let id = 1;
    while (used.has(id)) id++;
    const container: Container = {
      id,
      kind,
      contentId,
      title: opts?.title,
      x,
      y,
      w,
      h,
    };
    updateActive({ containers: [...layout.containers, container], selectedId: container.id, nextId: Math.max(layout.nextId, id + 1) });
    persist();
    pushSpawnUndo(container);
    return container;
  }

  /** Undo entry for a user-initiated `spawn`: its inverse is closing it again. */
  function pushSpawnUndo(container: Container): void {
    if (applyingUndo) return;
    const id = container.id;
    undoStack.push({
      label: `open @${id} (${kinds.labelOf(container.kind, container.contentId)})`,
      group: "layout",
      undo: () => {
        applyingUndo = true;
        try {
          close(id);
        } finally {
          applyingUndo = false;
        }
      },
    });
  }

  /**
   * Re-create a closed container: same kind/contentId/title/rect and, if
   * nothing has taken it since, the same `@n` id (ids are lowest-free, so
   * this is often automatic). Falls back to ordinary `spawn` placement
   * (still lowest-free id) when the id or the rect is no longer free.
   */
  function restoreContainer(snapshot: Container): void {
    applyingUndo = true;
    try {
      const layout = activeLayout();
      const idFree = !layout.containers.some((c) => c.id === snapshot.id);
      const rectFree = !layout.containers.some((c) => overlaps(snapshot, c));
      if (idFree && rectFree) {
        const container: Container = { ...snapshot };
        updateActive({
          containers: [...layout.containers, container],
          selectedId: container.id,
          nextId: Math.max(layout.nextId, container.id + 1),
        });
        persist();
      } else {
        spawn(snapshot.kind, snapshot.contentId, { title: snapshot.title, w: snapshot.w, h: snapshot.h });
      }
    } finally {
      applyingUndo = false;
    }
  }

  /** Directly overwrite a container's rectangle (no overlap check) — used to restore a previous move/resize. */
  function setRect(id: ContainerId, rect: Rect): void {
    const containers = activeLayout().containers.map((c) => (c.id === id ? { ...c, ...rect } : c));
    updateActive({ containers });
    persist();
  }

  function open(kind: ContentKind, contentId: string): Container {
    const existing = findByContent(contentId);
    if (existing) {
      updateActive({ selectedId: existing.id });
      persist();
      return existing;
    }
    return spawn(kind, contentId);
  }

  function close(id: ContainerId): boolean {
    const layout = activeLayout();
    const closed = layout.containers.find((c) => c.id === id);
    const before = layout.containers.length;
    const containers = layout.containers.filter((c) => c.id !== id);
    if (containers.length === before) return false;

    let selectedId = layout.selectedId;
    if (selectedId === id) {
      selectedId =
        containers.length === 0
          ? null
          : containers.reduce((nearest, c) =>
              Math.abs(c.id - id) < Math.abs(nearest.id - id) ? c : nearest,
            ).id;
    }
    updateActive({ containers, selectedId });
    persist();

    if (closed && !applyingUndo) {
      const snapshot: Container = { ...closed };
      undoStack.push({
        label: `close @${id} (${kinds.labelOf(closed.kind, closed.contentId)})`,
        group: "layout",
        undo: () => restoreContainer(snapshot),
      });
    }
    return true;
  }

  /** Drop containers whose record no longer exists, across every layout. */
  function prune(): number {
    let total = 0;
    layouts = layouts.map((l) => {
      const before = l.containers.length;
      const containers = l.containers.filter((c) => kinds.exists(c.kind, c.contentId));
      if (containers.length === before) return l;
      total += before - containers.length;
      const selectedId = l.selectedId !== null && containers.some((c) => c.id === l.selectedId) ? l.selectedId : null;
      return { ...l, containers, selectedId };
    });
    if (total > 0) persist();
    return total;
  }

  hydrate();
  storage.register(STORAGE_KEY, hydrate);
  // Read (and migrate) the pre-workspaces key too, so an async `storage.load`
  // — which only fetches registered keys — still sees it.
  storage.register(OLD_STORAGE_KEY, hydrate);

  function closeAll(): void {
    updateActive({ containers: [], selectedId: null, nextId: 1 }); // an empty layout starts counting from @1 again
    persist();
  }

  function byIdOrder(): Container[] {
    return [...activeLayout().containers].sort((a, b) => a.id - b.id);
  }

  function selectNext(): void {
    const ordered = byIdOrder();
    if (ordered.length === 0) return;
    const selectedId = activeLayout().selectedId;
    const i = ordered.findIndex((c) => c.id === selectedId);
    const next = i === -1 ? ordered[0] : ordered[(i + 1) % ordered.length];
    updateActive({ selectedId: next.id });
    persist();
  }

  function selectPrev(): void {
    const ordered = byIdOrder();
    if (ordered.length === 0) return;
    const selectedId = activeLayout().selectedId;
    const i = ordered.findIndex((c) => c.id === selectedId);
    const prev = i === -1 ? ordered[ordered.length - 1] : ordered[(i - 1 + ordered.length) % ordered.length];
    updateActive({ selectedId: prev.id });
    persist();
  }

  function selectDirection(dir: Direction): boolean {
    const layout = activeLayout();
    const current = layout.selectedId !== null ? get(layout.selectedId) : undefined;
    if (!current) {
      const ordered = byIdOrder();
      if (ordered.length === 0) return false;
      updateActive({ selectedId: ordered[0].id });
      persist();
      return true;
    }

    const cx = current.x + current.w / 2;
    const cy = current.y + current.h / 2;
    let best: Container | null = null;
    let bestDist = Infinity;
    let bestBand = false;

    for (const c of layout.containers) {
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
    updateActive({ selectedId: best.id });
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

    const occupants = activeLayout().containers.filter((c) => c.id !== id && overlaps(target, c));

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

  /** Undo entry for a move/resize: its inverse restores the previous rect(s). */
  function pushRectUndo(label: string, restores: { id: ContainerId; rect: Rect }[]): void {
    if (applyingUndo) return;
    undoStack.push({
      label,
      group: "layout",
      guard: () => {
        for (const r of restores) {
          if (!get(r.id)) return `@${r.id} was closed`;
        }
        return null;
      },
      undo: () => {
        applyingUndo = true;
        try {
          for (const r of restores) setRect(r.id, r.rect);
        } finally {
          applyingUndo = false;
        }
      },
    });
  }

  function move(id: ContainerId, dir: Direction): MoveResult {
    const peek = peekMove(id, dir);
    if (!peek.ok) return { ok: false, reason: peek.reason ?? "cannot move" };

    const layout = activeLayout();
    const container = get(id)!;
    const label = `move @${id} (${kinds.labelOf(container.kind, container.contentId)})`;

    if (peek.swapWith !== undefined) {
      const other = get(peek.swapWith)!;
      const containers = layout.containers.map((c) => {
        if (c.id === id) return { ...c, x: other.x, y: other.y };
        if (c.id === other.id) return { ...c, x: container.x, y: container.y };
        return c;
      });
      updateActive({ containers });
      persist();
      pushRectUndo(label, [
        { id, rect: { x: container.x, y: container.y, w: container.w, h: container.h } },
        { id: other.id, rect: { x: other.x, y: other.y, w: other.w, h: other.h } },
      ]);
      return { ok: true };
    }

    const containers = layout.containers.map((c) => (c.id === id ? { ...c, x: peek.rect.x, y: peek.rect.y } : c));
    updateActive({ containers });
    persist();
    pushRectUndo(label, [{ id, rect: { x: container.x, y: container.y, w: container.w, h: container.h } }]);
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

    const occupant = activeLayout().containers.find((c) => c.id !== id && overlaps(target, c));
    if (occupant) {
      return { rect: target, ok: false, reason: `would overlap @${occupant.id}` };
    }

    return { rect: target, ok: true };
  }

  function resize(id: ContainerId, size: { w?: number; h?: number }): MoveResult {
    const peek = peekResize(id, size);
    if (!peek.ok) return { ok: false, reason: peek.reason ?? "cannot resize" };

    const container = get(id)!;
    const containers = activeLayout().containers.map((c) => (c.id === id ? { ...c, w: peek.rect.w, h: peek.rect.h } : c));
    updateActive({ containers });
    persist();
    pushRectUndo(`resize @${id} (${kinds.labelOf(container.kind, container.contentId)})`, [
      { id, rect: { x: container.x, y: container.y, w: container.w, h: container.h } },
    ]);
    return { ok: true };
  }

  function setTitle(id: ContainerId, title: string | undefined): void {
    const containers = activeLayout().containers.map((c) => (c.id === id ? { ...c, title } : c));
    updateActive({ containers });
    persist();
  }

  // -- Workspaces (multiple layouts) --

  /** Smallest positive integer not already used as a layout name. */
  function nextAutoName(): string {
    const used = new Set(layouts.map((l) => l.name));
    let n = 1;
    while (used.has(String(n))) n++;
    return String(n);
  }

  /** One past the highest numeric layout id in use (ids stay small and stable, jj-style). */
  function nextLayoutId(): string {
    const maxId = layouts.reduce((max, l) => {
      const n = Number(l.id);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);
    return String(maxId + 1);
  }

  function resolveLayout(idOrIndex: string | number): WorkspaceLayout | undefined {
    if (typeof idOrIndex === "number") {
      return Number.isInteger(idOrIndex) ? layouts[idOrIndex - 1] : undefined;
    }
    return layouts.find((l) => l.id === idOrIndex) ?? layouts.find((l) => l.name === idOrIndex);
  }

  function switchLayout(idOrIndex: string | number): boolean {
    const target = resolveLayout(idOrIndex);
    if (!target) return false;
    activeId = target.id;
    persist();
    return true;
  }

  function create(name?: string): WorkspaceLayout {
    const trimmed = name?.trim();
    const layout: WorkspaceLayout = emptyLayout(nextLayoutId(), trimmed || nextAutoName());
    layouts = [...layouts, layout];
    activeId = layout.id;
    persist();
    return layout;
  }

  function rename(id: string, name: string): boolean {
    const trimmed = name.trim();
    if (!trimmed) return false;
    if (!layouts.some((l) => l.id === id)) return false;
    layouts = layouts.map((l) => (l.id === id ? { ...l, name: trimmed } : l));
    persist();
    return true;
  }

  function remove(id: string): boolean {
    if (layouts.length <= 1) return false; // never remove the last workspace
    const index = layouts.findIndex((l) => l.id === id);
    if (index === -1) return false;

    const wasActive = activeId === id;
    layouts = layouts.filter((l) => l.id !== id);
    if (wasActive) {
      activeId = layouts[Math.min(index, layouts.length - 1)].id;
    }
    persist();
    return true;
  }

  function next(): void {
    if (layouts.length <= 1) return;
    const i = layouts.findIndex((l) => l.id === activeId);
    activeId = layouts[(i + 1) % layouts.length].id;
    persist();
  }

  function prev(): void {
    if (layouts.length <= 1) return;
    const i = layouts.findIndex((l) => l.id === activeId);
    activeId = layouts[(i - 1 + layouts.length) % layouts.length].id;
    persist();
  }

  return {
    get containers(): readonly Container[] {
      return activeLayout().containers;
    },
    get selectedId(): ContainerId | null {
      return activeLayout().selectedId;
    },
    get selected(): Container | null {
      const layout = activeLayout();
      return layout.selectedId !== null ? layout.containers.find((c) => c.id === layout.selectedId) ?? null : null;
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

    get layouts(): readonly WorkspaceLayout[] {
      return layouts;
    },
    get activeId(): string {
      return activeId;
    },
    get active(): WorkspaceLayout {
      return activeLayout();
    },
    switch: switchLayout,
    create,
    rename,
    remove,
    next,
    prev,
  };
}

export const workspace: WorkspaceStore = createWorkspace();
