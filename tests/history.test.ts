/**
 * Terminal input history through the storage seam: the cap, malformed data,
 * and `clearHistory` (what `ws rm` calls for a retired workspace id).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { memoryStorage, storage } from "$lib/shell/storage.js";
import { clearHistory, historyStorageKey, HISTORY_CAP, loadHistory, persistHistory } from "$lib/shell/history.js";

beforeEach(() => storage.use(memoryStorage()));

describe("history", () => {
  it("round-trips per key and caps at the newest entries", () => {
    persistHistory("ws1", ["a", "b"]);
    persistHistory("ws2", ["x"]);
    expect(loadHistory("ws1")).toEqual(["a", "b"]);
    expect(loadHistory("ws2")).toEqual(["x"]);

    const many = Array.from({ length: HISTORY_CAP + 50 }, (_, i) => `cmd ${i}`);
    persistHistory("ws1", many);
    const back = loadHistory("ws1");
    expect(back).toHaveLength(HISTORY_CAP);
    expect(back[back.length - 1]).toBe(`cmd ${HISTORY_CAP + 49}`);
  });

  it("no key means memory-only, and malformed data reads as empty", () => {
    persistHistory(undefined, ["a"]);
    expect(storage.keys.filter((k) => k.startsWith("beastland:history"))).toEqual([]);
    expect(loadHistory(undefined)).toEqual([]);
    storage.set(historyStorageKey("bad"), "{not json");
    expect(loadHistory("bad")).toEqual([]);
  });

  it("clearHistory drops one key and tolerates unknown ones", () => {
    persistHistory("ws1", ["a"]);
    clearHistory("ws1");
    expect(loadHistory("ws1")).toEqual([]);
    expect(() => clearHistory("never-existed")).not.toThrow();
  });
});
