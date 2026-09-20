/**
 * Keyboard conventions shared by the Terminal and the tiling workspace.
 *
 * "ctrl" (⌃) is the modifier: ⌥ is unusable on Swiss/German layouts where
 * ⌥3 is `#`. Every handled shortcut calls preventDefault, which also
 * overrides the readline-style editing keys macOS gives text fields.
 */

export const MODIFIER = "ctrl" as "alt" | "ctrl";
export const MOD = MODIFIER === "alt" ? "⌥" : "⌃";

/** True when exactly the shell modifier is held (⌘ never counts). */
export function hasModifier(event: KeyboardEvent): boolean {
  if (event.metaKey) return false;
  return MODIFIER === "alt" ? event.altKey && !event.ctrlKey : event.ctrlKey && !event.altKey;
}
