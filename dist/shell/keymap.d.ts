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
export type Action = "select-left" | "select-down" | "select-up" | "select-right" | "select-n" | "select-next" | "select-prev" | "move-left" | "move-down" | "move-up" | "move-right" | "scroll-tile-down" | "scroll-tile-up" | "scroll-tile-left" | "scroll-tile-right" | "scroll-tile-lines-down" | "scroll-tile-lines-up" | "scroll-canvas-down" | "scroll-canvas-up" | "scroll-canvas-left" | "scroll-canvas-right" | "close" | "focus-terminal" | "insert-ref" | "workspace-n" | "workspace-next" | "workspace-prev";
export type KeyBinding = {
    action: Action;
    /** KeyboardEvent.code, or `"Digit"` to match any of Digit1–Digit9 (select-n). */
    code: string;
    mod?: boolean;
    shift?: boolean;
    /** For bindings without `mod`: match `event.key` instead of `code` (e.g. "@"). */
    key?: string;
    /** Legend text; bindings sharing a `group` are shown on one line. */
    group: string;
    description: string;
};
export declare const defaultKeymap: KeyBinding[];
export type ResolvedKey = {
    action: Action;
    n?: number;
    key?: string;
};
/**
 * Map an event to an action, or null. `inText` tells whether the event
 * comes from a text input: modifier-less bindings are ignored there.
 */
export declare function resolveKey(event: KeyboardEvent, keymap: KeyBinding[], inText: boolean): ResolvedKey | null;
export type KeymapEntry = {
    keys: string;
    description: string;
};
/** Legend lines, one per `group`, e.g. `⌃ h j k l  select left / down / up / right`. */
export declare function describeKeymap(keymap: KeyBinding[]): KeymapEntry[];
