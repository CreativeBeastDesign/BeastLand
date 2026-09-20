export { themes, themeIds, defaultTheme, getTheme, isThemeId } from "./themes.js";
export type { Theme, ThemeId, ThemeMode, ThemeRegistry } from "./types.js";

import { defaultTheme, getTheme, isThemeId } from "./themes.js";
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
  const resolved = themeId !== undefined && isThemeId(themeId) ? getTheme(themeId) : defaultTheme;
  target.setAttribute("data-theme", resolved.id);
  target.style.colorScheme = resolved.mode;
  return resolved;
}
