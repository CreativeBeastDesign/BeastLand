/**
 * Theme registry
 *
 * A rune-backed registry (the same pattern as `tiling/kinds.svelte.ts`):
 * ids are plain strings, so an app can register its own theme alongside (or
 * instead of) the five shipped ones and pickers built on `themes.all`
 * update the moment it does.
 *
 * The id doubles as the `data-theme` attribute value the theme stylesheets
 * (`$lib/styles/themes/*.css`) key off — registering a `Theme` here does
 * not ship its CSS, that's a separate stylesheet import (see the README).
 * The five shipped themes are registered below by default; their CSS ships
 * with the package under `$lib/styles/themes/`.
 */

import { untrack } from "svelte";
import type { Theme, ThemeId, ThemeRegistry } from "./types.js";

const BUILTIN: Theme[] = [
  { id: "beast-dark", label: "Beast Dark", mode: "dark", glass: true, wallpaper: "monolith" },
  { id: "garden-light", label: "Garden Light", mode: "light", glass: true, wallpaper: "adler" },
  { id: "hypr-dark", label: "Hypr Dark", mode: "dark", glass: false },
  { id: "hypr-light", label: "Hypr Light", mode: "light", glass: false },
  { id: "tokyo-glass", label: "Tokyo Glass", mode: "dark", glass: true },
];

function createThemeRegistry(): ThemeRegistry {
  let specs = $state<Record<string, Theme>>(Object.fromEntries(BUILTIN.map((t) => [t.id, t])));

  const api: ThemeRegistry = {
    get all(): Theme[] {
      return Object.values(specs);
    },

    get(id: ThemeId | string): Theme | undefined {
      return specs[id];
    },

    /** Register a theme; call the returned function to remove it again. */
    register(theme: Theme): () => void {
      untrack(() => {
        specs = { ...specs, [theme.id]: theme };
      });
      return () => {
        untrack(() => {
          if (specs[theme.id] === theme) {
            const next = { ...specs };
            delete next[theme.id];
            specs = next;
          }
        });
      };
    },
  };

  return api;
}

export const themes = createThemeRegistry();

/** Sugar for `themes.register`. */
export function registerTheme(theme: Theme): () => void {
  return themes.register(theme);
}

/**
 * Every registered theme id, in registration order.
 *
 * A getter function rather than a plain array: Svelte doesn't allow
 * exporting derived state directly from a module (only a component may hold
 * a live `$derived` binding), so this recomputes from the registry on every
 * call — cheap, and always current.
 */
export function themeIds(): ThemeId[] {
  return themes.all.map((t) => t.id);
}

/** The first registered theme, or the shipped `beast-dark` if somehow none are. */
export function defaultTheme(): Theme {
  return themes.all[0] ?? BUILTIN[0];
}

/** Resolve an id to a `Theme`, falling back to `defaultTheme()`. */
export function getTheme(id: ThemeId | string): Theme {
  return themes.get(id) ?? defaultTheme();
}

/** Runtime check: is `value` a currently registered theme id? */
export function isThemeId(value: string): value is ThemeId {
  return themes.get(value) !== undefined;
}
