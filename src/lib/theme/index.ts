export { themes, themeIds, defaultTheme, getTheme, isThemeId, registerTheme } from "./themes.svelte.js";
export { looks, registerLook, type Look } from "./looks.svelte.js";
export type { Theme, ThemeId, ThemeMode, ThemeRegistry } from "./types.js";

import { defaultTheme, themes } from "./themes.svelte.js";
import type { Theme, ThemeId } from "./types.js";

/**
 * Apply a theme to a DOM element by setting its `data-theme` attribute and the
 * matching `color-scheme`. Falls back to the default theme for unknown ids.
 *
 * @param target Optional element; defaults to `document.documentElement`.
 * @param themeId The theme id to apply. When omitted, the default theme is used.
 * @returns The resolved {@link Theme} that was applied.
 */
export function applyTheme(
  themeId?: ThemeId | string,
  target: HTMLElement = document.documentElement,
): Theme {
  const resolved = themeId !== undefined ? (themes.get(themeId) ?? defaultTheme()) : defaultTheme();
  target.setAttribute("data-theme", resolved.id);
  target.style.colorScheme = resolved.mode;
  return resolved;
}
