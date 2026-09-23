/**
 * Storage adapters
 *
 * Every store persists through this one seam instead of touching
 * `localStorage`. Two shapes:
 *
 * - `StorageAdapter` (sync): `storage.use(adapter)` — memory, localStorage,
 *   anything that answers immediately.
 * - `AsyncStorageAdapter`: `await storage.load(adapter)` — a backend. Every
 *   registered key is read once, kept in a write-through cache, and the
 *   stores re-hydrate from it. Reads happen at load; later writes go to the
 *   cache synchronously and to the adapter in the background.
 *
 * Stores call `storage.register(key, hydrate)` next to their initial read, so
 * `use()`/`load()` can be called at any time — before or after the stores
 * were imported — and the stores follow.
 *
 *   import { storage, memoryStorage } from "beastland";
 *   storage.use(memoryStorage());                    // tests, SSR, previews
 *   await storage.load(myBackendAdapter);            // real app (see README)
 *
 * The default picks `localStorage` when a window exists and an in-memory
 * map otherwise, so stores are SSR-safe without checks of their own.
 * Values are strings; stores JSON-encode. Write failures are best-effort
 * (reported via `onError`); the in-memory state is always the source of truth.
 * Read failures during `load()` reject the returned promise so an error
 * boundary can show them.
 */
export function memoryStorage(seed = {}) {
    const map = new Map(Object.entries(seed));
    return {
        get: (key) => map.get(key) ?? null,
        set: (key, value) => void map.set(key, value),
        remove: (key) => void map.delete(key),
    };
}
export function webStorage(area) {
    return {
        get: (key) => {
            try {
                return area.getItem(key);
            }
            catch {
                return null;
            }
        },
        set: (key, value) => {
            try {
                area.setItem(key, value);
            }
            catch {
                /* quota / private mode: best effort */
            }
        },
        remove: (key) => {
            try {
                area.removeItem(key);
            }
            catch {
                /* ignore */
            }
        },
    };
}
/** Wrap a sync adapter as an async one (tests, demos, or a sync backend behind the async seam). */
export function toAsync(adapter) {
    return {
        load: async (key) => adapter.get(key),
        save: async (key, value) => adapter.set(key, value),
        remove: async (key) => adapter.remove(key),
    };
}
function defaultAdapter() {
    if (typeof window !== "undefined" && "localStorage" in window)
        return webStorage(window.localStorage);
    return memoryStorage();
}
function warn(error, op, key) {
    console.warn(`[beastland] storage ${op} failed for ${key}`, error);
}
/** Sync cache in front of an async adapter: reads hit the cache, writes go to both. */
function writeThrough(cache, backend, onError) {
    return {
        get: (key) => cache.get(key),
        set: (key, value) => {
            cache.set(key, value);
            backend.save(key, value).catch((error) => onError(error, "save", key));
        },
        remove: (key) => {
            cache.remove(key);
            backend.remove(key).catch((error) => onError(error, "remove", key));
        },
    };
}
let current = defaultAdapter();
/** key → the stores that re-read it when the adapter changes. */
const hydrators = new Map();
function rehydrate(keys) {
    for (const key of keys)
        for (const fn of hydrators.get(key) ?? [])
            fn();
}
let ready = Promise.resolve();
let generation = 0;
/**
 * Writes made while a `load()` is in flight. They are newer than the
 * snapshot being fetched, so they are replayed onto the new cache (and the
 * backend) instead of being clobbered by it.
 */
let inFlightWrites = null;
/** The adapter all stores use. `use()`/`load()` replace it and re-hydrate the registered stores. */
export const storage = {
    /** Switch to a sync adapter and re-hydrate every registered store from it. */
    use(adapter) {
        generation++;
        current = adapter;
        ready = Promise.resolve();
        rehydrate(hydrators.keys());
    },
    /**
     * Read every registered key (or `options.keys`) from an async adapter,
     * switch to a write-through cache in front of it, and re-hydrate the
     * stores. Await it (or `storage.ready`) before rendering what depends on
     * the stores; a rejected read rejects the promise. A newer `use()`/`load()`
     * supersedes an in-flight one: the stale result is dropped.
     */
    load(adapter, options = {}) {
        const gen = ++generation;
        const keys = options.keys ?? [...hydrators.keys()];
        inFlightWrites = new Map();
        const writes = inFlightWrites;
        const run = async () => {
            const entries = await Promise.all(keys.map(async (key) => [key, await adapter.load(key)]));
            if (gen !== generation)
                return;
            const cache = memoryStorage();
            for (const [key, value] of entries)
                if (value !== null)
                    cache.set(key, value);
            const onError = options.onError ?? warn;
            const backend = writeThrough(cache, adapter, onError);
            // Anything written during the load happened *after* this snapshot was
            // requested, so it wins — and reaches the backend, which never saw it.
            for (const [key, value] of writes) {
                if (value === null)
                    backend.remove(key);
                else
                    backend.set(key, value);
            }
            current = backend;
            rehydrate(keys);
        };
        ready = run().finally(() => {
            if (inFlightWrites === writes)
                inFlightWrites = null;
        });
        return ready;
    },
    /** Resolves once the most recent `load()` has hydrated (immediately when none is pending). */
    get ready() {
        return ready;
    },
    /**
     * Register a store's re-read for `key`. Call it right after the initial
     * read; `hydrate` runs again whenever the adapter changes. Returns the
     * unregister function.
     */
    register(key, hydrate) {
        let set = hydrators.get(key);
        if (!set) {
            set = new Set();
            hydrators.set(key, set);
        }
        set.add(hydrate);
        return () => {
            set.delete(hydrate);
            if (set.size === 0)
                hydrators.delete(key);
        };
    },
    /** Keys stores have registered — what `load()` reads by default. */
    get keys() {
        return [...hydrators.keys()];
    },
    get(key) {
        return current.get(key);
    },
    set(key, value) {
        current.set(key, value);
        inFlightWrites?.set(key, value);
    },
    remove(key) {
        current.remove(key);
        inFlightWrites?.set(key, null);
    },
    /** Parse a JSON value, or null when missing/invalid. */
    getJson(key) {
        const raw = current.get(key);
        if (raw === null)
            return null;
        try {
            return JSON.parse(raw);
        }
        catch {
            return null;
        }
    },
    setJson(key, value) {
        current.set(key, JSON.stringify(value));
    },
};
