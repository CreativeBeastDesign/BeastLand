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
  it("matches letters by `key`, so QWERTZ layouts work (Z reports code KeyY)", () => {
    // Swiss/German keyboard: the key labelled Z sits where US has Y.
    expect(resolveKey(ev({ ctrlKey: true, code: "KeyY", key: "z" }), defaultKeymap, true)?.action).toBe("scroll-tile-left");
    expect(resolveKey(ev({ ctrlKey: true, shiftKey: true, code: "KeyY", key: "Z" }), defaultKeymap, true)?.action).toBe("scroll-canvas-left");
    // US keyboard, same chord.
    expect(resolveKey(ev({ ctrlKey: true, code: "KeyZ", key: "z" }), defaultKeymap, true)?.action).toBe("scroll-tile-left");
    // A letter binding never fires for a different letter that merely shares the physical position.
    expect(resolveKey(ev({ ctrlKey: true, code: "KeyZ", key: "y" }), defaultKeymap, true)).toBeNull();
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

  it("resolves the workspace chords, distinct from the shiftless select/cycle chords", () => {
    expect(resolveKey(ev({ ctrlKey: true, shiftKey: true, code: "Digit1" }), defaultKeymap, true)).toEqual({
      action: "workspace-n",
      n: 1,
    });
    expect(resolveKey(ev({ ctrlKey: true, code: "Digit1" }), defaultKeymap, true)).toEqual({ action: "select-n", n: 1 });
    expect(resolveKey(ev({ ctrlKey: true, shiftKey: true, code: "KeyN" }), defaultKeymap, true)?.action).toBe("workspace-next");
    expect(resolveKey(ev({ ctrlKey: true, shiftKey: true, code: "KeyP" }), defaultKeymap, true)?.action).toBe("workspace-prev");
    expect(resolveKey(ev({ ctrlKey: true, code: "KeyN" }), defaultKeymap, true)?.action).toBe("select-next");
    expect(resolveKey(ev({ ctrlKey: true, code: "KeyP" }), defaultKeymap, true)?.action).toBe("select-prev");
  });

  it("describes the workspace chords on their own legend lines", () => {
    const legend = describeKeymap(defaultKeymap);
    expect(legend.find((l) => l.description === "switch to workspace n")?.keys).toBe("⌃⇧ 1-9");
    expect(legend.find((l) => l.description === "next / previous workspace")?.keys).toBe("⌃⇧ n / p");
  });
});
