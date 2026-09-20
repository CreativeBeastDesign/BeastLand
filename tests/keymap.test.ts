import { describe, expect, it } from "vitest";
import { defaultKeymap, describeKeymap, resolveKey, type KeyBinding } from "$lib/shell/keymap.js";

const ev = (init: Partial<KeyboardEvent> & { code?: string; key?: string }) =>
  ({ metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, code: "", key: "", ...init }) as KeyboardEvent;

describe("keymap", () => {
  it("resolves the shell modifier chords", () => {
    expect(resolveKey(ev({ ctrlKey: true, code: "KeyH" }), defaultKeymap, true)?.action).toBe("select-left");
    expect(resolveKey(ev({ ctrlKey: true, shiftKey: true, code: "KeyH" }), defaultKeymap, true)?.action).toBe("move-left");
    expect(resolveKey(ev({ ctrlKey: true, code: "Digit3" }), defaultKeymap, true)).toEqual({ action: "select-n", n: 3 });
    expect(resolveKey(ev({ ctrlKey: true, code: "Digit0" }), defaultKeymap, true)).toBeNull();
  });
  it("ignores ⌘ chords and modifier-less keys inside text inputs", () => {
    expect(resolveKey(ev({ metaKey: true, ctrlKey: true, code: "KeyH" }), defaultKeymap, false)).toBeNull();
    expect(resolveKey(ev({ key: "#" }), defaultKeymap, true)).toBeNull();
    expect(resolveKey(ev({ key: "#" }), defaultKeymap, false)).toEqual({ action: "insert-ref", key: "#" });
    expect(resolveKey(ev({ key: "Enter", code: "Enter" }), defaultKeymap, false)?.action).toBe("focus-terminal");
  });
  it("honours a custom table", () => {
    const custom: KeyBinding[] = [{ action: "close", code: "KeyX", mod: true, group: "close", description: "close" }];
    expect(resolveKey(ev({ ctrlKey: true, code: "KeyX" }), custom, true)?.action).toBe("close");
    expect(resolveKey(ev({ ctrlKey: true, code: "KeyQ" }), custom, true)).toBeNull();
  });
  it("describes groups on one legend line each", () => {
    const legend = describeKeymap(defaultKeymap);
    expect(legend.find((l) => l.description.startsWith("select left"))?.keys).toBe("⌃ h j k l");
    expect(legend.find((l) => l.description === "move selected")?.keys).toBe("⌃⇧ h j k l");
    expect(legend.find((l) => l.description.startsWith("scroll the canvas down"))?.keys).toBe("⌃⇧ u / i");
    expect(legend.find((l) => l.description.startsWith("start a container"))?.keys).toBe("@ / #");
  });
});
