import { afterEach, describe, expect, it, vi } from "vitest";
import { memoryStorage, storage, toAsync, type AsyncStorageAdapter } from "$lib/shell/storage.js";

afterEach(() => {
  storage.use(memoryStorage());
});

describe("storage adapter", () => {
  it("routes through the injected adapter", () => {
    const mem = memoryStorage({ "k:seed": '{"a":1}' });
    storage.use(mem);
    expect(storage.getJson<{ a: number }>("k:seed")).toEqual({ a: 1 });
    storage.setJson("k:x", [1, 2]);
    expect(mem.get("k:x")).toBe("[1,2]");
    storage.remove("k:x");
    expect(storage.get("k:x")).toBeNull();
    expect(storage.getJson("k:missing")).toBeNull();
  });

  it("tolerates corrupt JSON", () => {
    storage.use(memoryStorage({ bad: "{not json" }));
    expect(storage.getJson("bad")).toBeNull();
  });
});

describe("register + use", () => {
  it("re-hydrates registered stores when the adapter is swapped", () => {
    let value: string | null = "initial";
    const off = storage.register("k:a", () => {
      value = storage.get("k:a");
    });
    storage.use(memoryStorage({ "k:a": "one" }));
    expect(value).toBe("one");
    storage.use(memoryStorage());
    expect(value).toBeNull();
    off();
    storage.use(memoryStorage({ "k:a": "two" }));
    expect(value).toBeNull(); // unregistered: no longer follows
    expect(storage.keys).not.toContain("k:a");
  });
});

describe("load (async adapter)", () => {
  it("reads every registered key once, hydrates, then writes through", async () => {
    const backend = memoryStorage({ "k:a": "A", "k:b": "B" });
    const async = toAsync(backend);
    const load = vi.spyOn(async, "load");
    const save = vi.spyOn(async, "save");

    const seen: Record<string, string | null> = {};
    const offA = storage.register("k:a", () => (seen.a = storage.get("k:a")));
    const offB = storage.register("k:b", () => (seen.b = storage.get("k:b")));

    const p = storage.load(async);
    expect(storage.ready).toBe(p);
    await p;
    expect(seen).toEqual({ a: "A", b: "B" });
    expect(load).toHaveBeenCalledTimes(2);

    // Writes: cache answers synchronously, the backend is updated in the background.
    storage.set("k:a", "A2");
    expect(storage.get("k:a")).toBe("A2");
    expect(load).toHaveBeenCalledTimes(2); // no re-read
    await storage.ready;
    await Promise.resolve();
    expect(save).toHaveBeenCalledWith("k:a", "A2");
    expect(backend.get("k:a")).toBe("A2");

    storage.remove("k:b");
    expect(storage.get("k:b")).toBeNull();
    await Promise.resolve();
    expect(backend.get("k:b")).toBeNull();

    offA();
    offB();
  });

  it("honours an explicit key list", async () => {
    const backend = toAsync(memoryStorage({ "k:x": "X", "k:y": "Y" }));
    const load = vi.spyOn(backend, "load");
    await storage.load(backend, { keys: ["k:x"] });
    expect(load).toHaveBeenCalledTimes(1);
    expect(storage.get("k:x")).toBe("X");
    expect(storage.get("k:y")).toBeNull(); // never read → not in the cache
  });

  it("rejects when a read fails and leaves the current adapter in place", async () => {
    storage.use(memoryStorage({ "k:a": "sync" }));
    const off = storage.register("k:a", () => {});
    const broken: AsyncStorageAdapter = {
      load: async () => {
        throw new Error("backend down");
      },
      save: async () => {},
      remove: async () => {},
    };
    await expect(storage.load(broken)).rejects.toThrow("backend down");
    expect(storage.get("k:a")).toBe("sync");
    off();
  });

  it("reports background write failures via onError", async () => {
    const errors: string[] = [];
    const flaky: AsyncStorageAdapter = {
      load: async () => null,
      save: async () => {
        throw new Error("quota");
      },
      remove: async () => {},
    };
    await storage.load(flaky, { keys: ["k:a"], onError: (e, op, key) => errors.push(`${op} ${key}: ${(e as Error).message}`) });
    storage.set("k:a", "v");
    expect(storage.get("k:a")).toBe("v"); // cache is unaffected
    await Promise.resolve();
    expect(errors).toEqual(["save k:a: quota"]);
  });

  it("drops a stale load when a newer use()/load() supersedes it", async () => {
    let resolveSlow!: (v: string | null) => void;
    const slow: AsyncStorageAdapter = {
      load: () => new Promise((r) => (resolveSlow = r)),
      save: async () => {},
      remove: async () => {},
    };
    const values: (string | null)[] = [];
    const off = storage.register("k:a", () => values.push(storage.get("k:a")));

    const stale = storage.load(slow);
    storage.use(memoryStorage({ "k:a": "fresh" }));
    resolveSlow("stale");
    await stale;
    expect(storage.get("k:a")).toBe("fresh");
    expect(values).toEqual(["fresh"]);
    off();
  });
});
