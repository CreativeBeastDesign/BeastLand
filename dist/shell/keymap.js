/**
 * Keymap
 *
 * Shortcuts are data: a list of bindings from a key chord to a named
 * action. The workspace resolves an event to an action through `resolveKey`
 * and switches on the action, so an app can rebind anything by passing its
 * own table (`<TilingWorkspace keymap={myKeymap} />`) — and the on-screen
 * legends are generated from the same table (`describeKeymap`).
 *
 * `code` is a KeyboardEvent.code (layout-independent: `KeyH` is the same
 * physical key on QWERTZ). `mod` means the shell modifier (see keys.ts);
 * bindings without `mod` fire only outside text inputs.
 */
import { hasModifier, MOD } from "./keys.js";
export const defaultKeymap = [
    { action: "select-left", code: "KeyH", mod: true, group: "select", description: "select left / down / up / right" },
    { action: "select-down", code: "KeyJ", mod: true, group: "select", description: "select left / down / up / right" },
    { action: "select-up", code: "KeyK", mod: true, group: "select", description: "select left / down / up / right" },
    { action: "select-right", code: "KeyL", mod: true, group: "select", description: "select left / down / up / right" },
    { action: "select-n", code: "Digit", mod: true, group: "select-n", description: "select container @n" },
    { action: "select-next", code: "KeyN", mod: true, group: "cycle", description: "select next / previous" },
    { action: "select-prev", code: "KeyP", mod: true, group: "cycle", description: "select next / previous" },
    { action: "move-left", code: "KeyH", mod: true, shift: true, group: "move", description: "move selected" },
    { action: "move-down", code: "KeyJ", mod: true, shift: true, group: "move", description: "move selected" },
    { action: "move-up", code: "KeyK", mod: true, shift: true, group: "move", description: "move selected" },
    { action: "move-right", code: "KeyL", mod: true, shift: true, group: "move", description: "move selected" },
    { action: "scroll-tile-down", code: "KeyU", mod: true, group: "scroll", description: "scroll selected down / up (half a page)" },
    { action: "scroll-tile-up", code: "KeyI", mod: true, group: "scroll", description: "scroll selected down / up (half a page)" },
    { action: "scroll-tile-left", code: "KeyZ", mod: true, group: "scroll-x", description: "scroll selected left / right" },
    { action: "scroll-tile-right", code: "KeyO", mod: true, group: "scroll-x", description: "scroll selected left / right" },
    { action: "scroll-canvas-down", code: "KeyU", mod: true, shift: true, group: "canvas", description: "scroll the canvas down / up" },
    { action: "scroll-canvas-up", code: "KeyI", mod: true, shift: true, group: "canvas", description: "scroll the canvas down / up" },
    { action: "scroll-canvas-left", code: "KeyZ", mod: true, shift: true, group: "canvas-x", description: "scroll the canvas left / right" },
    { action: "scroll-canvas-right", code: "KeyO", mod: true, shift: true, group: "canvas-x", description: "scroll the canvas left / right" },
    { action: "scroll-tile-lines-down", code: "ArrowDown", mod: true, group: "lines", description: "scroll selected a few lines" },
    { action: "scroll-tile-lines-up", code: "ArrowUp", mod: true, group: "lines", description: "scroll selected a few lines" },
    { action: "close", code: "KeyQ", mod: true, group: "close", description: "close selected" },
    { action: "focus-terminal", code: "Enter", key: "Enter", group: "terminal", description: "back to the terminal (Esc in the terminal leaves it)" },
    { action: "focus-terminal", code: "Escape", key: "Escape", group: "terminal", description: "back to the terminal (Esc in the terminal leaves it)" },
    { action: "insert-ref", code: "", key: "@", group: "ref", description: "start a container / record reference in the terminal" },
    { action: "insert-ref", code: "", key: "#", group: "ref", description: "start a container / record reference in the terminal" },
    { action: "workspace-n", code: "Digit", mod: true, shift: true, group: "workspace-n", description: "switch to workspace n" },
    { action: "workspace-next", code: "KeyN", mod: true, shift: true, group: "workspace-cycle", description: "next / previous workspace" },
    { action: "workspace-prev", code: "KeyP", mod: true, shift: true, group: "workspace-cycle", description: "next / previous workspace" },
];
/**
 * Map an event to an action, or null. `inText` tells whether the event
 * comes from a text input: modifier-less bindings are ignored there.
 */
export function resolveKey(event, keymap, inText) {
    if (event.metaKey)
        return null;
    const mod = hasModifier(event);
    for (const b of keymap) {
        if (!!b.mod !== mod)
            continue;
        if (!b.mod && inText)
            continue;
        if (!!b.shift !== event.shiftKey)
            continue;
        if (b.key !== undefined) {
            if (event.key === b.key)
                return { action: b.action, key: event.key };
            continue;
        }
        if (b.code === "Digit") {
            // `code` is layout-independent (⌃⇧1 is `!` or `+` in `key`); some
            // synthetic/virtual keyboards leave it empty, so fall back to `key`.
            const n = /^Digit([1-9])$/.exec(event.code)?.[1] ?? (event.code === "" ? /^[1-9]$/.exec(event.key)?.[0] : undefined);
            if (n)
                return { action: b.action, n: Number(n) };
            continue;
        }
        // Letters match on `key`, not `code`: `code` is the physical US position,
        // so on QWERTZ layouts the key labelled Z reports `KeyY`. Digits and
        // named keys keep using `code` (⌃⇧1 is `!`/`+` in `key`).
        const letter = /^Key([A-Z])$/.exec(b.code)?.[1];
        if (letter !== undefined) {
            if (event.key.length === 1 && event.key.toUpperCase() === letter)
                return { action: b.action };
            if (event.key.length !== 1 && event.code === b.code)
                return { action: b.action };
            continue;
        }
        if (event.code === b.code)
            return { action: b.action };
    }
    return null;
}
function keyLabel(b) {
    if (b.key !== undefined)
        return b.key === "Enter" ? "Enter" : b.key === "Escape" ? "Esc" : b.key;
    if (b.code === "Digit")
        return "1-9";
    const named = { ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→" };
    return named[b.code] ?? b.code.replace(/^Key/, "").toLowerCase();
}
/** Legend lines, one per `group`, e.g. `⌃ h j k l  select left / down / up / right`. */
export function describeKeymap(keymap) {
    const groups = new Map();
    for (const b of keymap)
        groups.set(b.group, [...(groups.get(b.group) ?? []), b]);
    return [...groups.values()].map((bs) => {
        const first = bs[0];
        const prefix = first.mod ? `${MOD}${first.shift ? "⇧" : ""} ` : "";
        const labels = bs.map(keyLabel);
        // Four-key clusters (hjkl) read as one chord; pairs read as alternatives.
        const joiner = bs.length === 4 ? " " : " / ";
        return { keys: prefix + labels.join(joiner), description: first.description };
    });
}
