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
import type { Theme, ThemeId, ThemeRegistry } from "./types.js";
export declare const themes: ThemeRegistry;
/** Sugar for `themes.register`. */
export declare function registerTheme(theme: Theme): () => void;
/**
 * Every registered theme id, in registration order.
 *
 * A getter function rather than a plain array: Svelte doesn't allow
 * exporting derived state directly from a module (only a component may hold
 * a live `$derived` binding), so this recomputes from the registry on every
 * call — cheap, and always current.
 */
export declare function themeIds(): ThemeId[];
/** The first registered theme, or the shipped `beast-dark` if somehow none are. */
export declare function defaultTheme(): Theme;
/** Resolve an id to a `Theme`, falling back to `defaultTheme()`. */
export declare function getTheme(id: ThemeId | string): Theme;
/** Runtime check: is `value` a currently registered theme id? */
export declare function isThemeId(value: string): value is ThemeId;
