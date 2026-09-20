/**
 * Types for the theme system.
 */

export type ThemeId =
  | "beast-dark"
  | "garden-light"
  | "hypr-dark"
  | "hypr-light"
  | "tokyo-glass";

export type ThemeMode = "dark" | "light";

export type Theme = {
  /** The unique id, also used as the value of `data-theme`. */
  id: ThemeId;
  /** Human friendly display name. */
  label: string;
  /** Approximate luminance mode, useful for meta-color-scheme. */
  mode: ThemeMode;
  /** Whether this theme opts into an extra glassy treatment. */
  glass: boolean;
};

export type ThemeRegistry = Record<ThemeId, Theme>;
