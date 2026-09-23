/**
 * Keyboard conventions shared by the Terminal and the tiling workspace.
 *
 * "ctrl" (⌃) is the modifier: ⌥ is unusable on Swiss/German layouts where
 * ⌥3 is `#`. Every handled shortcut calls preventDefault, which also
 * overrides the readline-style editing keys macOS gives text fields.
 */
export declare const MODIFIER: "alt" | "ctrl";
export declare const MOD: string;
/** True when exactly the shell modifier is held (⌘ never counts). */
export declare function hasModifier(event: KeyboardEvent): boolean;
