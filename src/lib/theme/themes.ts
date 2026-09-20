import type { Theme, ThemeId, ThemeRegistry } from "./types.js";

/**
 * The known theme definitions.
 *
 * The id doubles as the `data-theme` attribute value expected by the theme
 * stylesheets under `$lib/styles/themes/`.
 */
export const themes: ThemeRegistry = {
  "beast-dark": {
    id: "beast-dark",
    label: "Beast Dark",
    mode: "dark",
    glass: true,
  },
  "garden-light": {
    id: "garden-light",
    label: "Garden Light",
    mode: "light",
    glass: true,
  },
  "hypr-dark": {
    id: "hypr-dark",
    label: "Hypr Dark",
    mode: "dark",
    glass: false,
  },
  "hypr-light": {
    id: "hypr-light",
    label: "Hypr Light",
    mode: "light",
    glass: false,
  },
  "tokyo-glass": {
    id: "tokyo-glass",
    label: "Tokyo Glass",
    mode: "dark",
    glass: true,
  },
};

export const themeIds = Object.keys(themes) as ThemeId[];

export const defaultTheme: Theme = themes["beast-dark"];

export function getTheme(id: ThemeId | string): Theme {
  return themes[id as ThemeId] ?? defaultTheme;
}

export function isThemeId(value: string): value is ThemeId {
  return value in themes;
}
