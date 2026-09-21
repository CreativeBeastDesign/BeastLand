/**
 * Types for the theme system.
 */

/** Any string — an app registers its own themes alongside the shipped ones. */
export type ThemeId = string;

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
  /**
   * This theme's default wallpaper id. Just a string — resolved lazily
   * against the wallpaper registry (see `shell.setTheme`), so naming a
   * wallpaper the app never registers is harmless, it simply never resolves.
   */
  wallpaper?: string;
};

/** Shape of the runtime theme registry (`themes` in `themes.svelte.ts`). */
export type ThemeRegistry = {
  readonly all: Theme[];
  get(id: ThemeId | string): Theme | undefined;
  /** Register a theme; call the returned function to remove it again. */
  register(theme: Theme): () => void;
};
