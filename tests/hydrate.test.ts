/**
 * Stores follow the storage adapter: `storage.use()` / `storage.load()` after
 * the stores were imported re-hydrates them (load-then-hydrate).
 */
import { afterEach, describe, expect, it } from "vitest";
import { memoryStorage, storage, toAsync } from "$lib/shell/storage.js";
import { data } from "$lib/data/store.svelte.js";
import { workspace } from "$lib/tiling/workspace.svelte.js";
import { kinds } from "$lib/tiling/kinds.svelte.js";
import { seedCustomers } from "$lib/data/seed.js";
// Imported for their registration side effect only.
import "$lib/shell/state.svelte.js";
import "$lib/worklog/store.svelte.js";
import "$lib/project/store.svelte.js";

afterEach(() => storage.use(memoryStorage()));

const customer = {
  ...seedCustomers[0],
  id: "customer:fromthebackend000000",
  firstName: "Backend",
  lastName: "Person",
};

describe("load-then-hydrate", () => {
  it("registers every persisted key", () => {
    expect(storage.keys).toEqual(
      expect.arrayContaining(["beastland:shell", "beastland:data", "beastland:workspace", "beastland:worklog", "beastland:projects"]),
    );
  });

  it("data store re-reads after an async load and falls back to seeds on use()", async () => {
    const backend = toAsync(
      memoryStorage({ "beastland:data": JSON.stringify({ customers: [customer], documents: [] }) }),
    );
    await storage.load(backend);
    expect(data.customers.map((c) => c.id)).toEqual([customer.id]);
    expect(data.documents).toHaveLength(0);

    storage.use(memoryStorage());
    expect(data.customers.map((c) => c.id)).toEqual(seedCustomers.map((c) => c.id));
  });

  it("workspace re-reads and prunes containers of unknown records when kinds are registered", async () => {
    const off = kinds.register({
      kind: "box",
      size: { w: 2, h: 2 },
      label: (id) => id,
      exists: (id) => id === "keep",
      component: (() => {}) as never,
    });
    const persisted = {
      containers: [
        { id: 1, kind: "box", contentId: "keep", x: 0, y: 0, w: 2, h: 2 },
        { id: 2, kind: "box", contentId: "gone", x: 2, y: 0, w: 2, h: 2 },
        { id: 3, kind: "ghost", contentId: "x", x: 4, y: 0, w: 2, h: 2 },
      ],
      selectedId: 2,
      nextId: 4,
    };
    await storage.load(toAsync(memoryStorage({ "beastland:workspace": JSON.stringify(persisted) })));
    // "gone" is pruned; the unregistered kind is kept (its slice may mount later).
    expect(workspace.containers.map((c) => c.id)).toEqual([1, 3]);
    expect(workspace.selectedId).toBeNull();
    // new tiles take the lowest free id (@2 was pruned), then continue past @3
    expect(workspace.spawn("box", "keep2").id).toBe(2);
    expect(workspace.spawn("box", "keep3").id).toBe(4);
    off();
  });
});
