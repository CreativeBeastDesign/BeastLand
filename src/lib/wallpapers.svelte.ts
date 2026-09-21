/**
 * Wallpaper registry
 *
 * The library ships no wallpapers — this file starts empty. An app
 * registers its own, typically at module load, before the shell renders
 * (see `src/routes/wallpapers.ts` + `+layout.svelte`'s `<script module>` for
 * this repo's five demo wallpapers):
 *
 *   import { registerWallpaper } from "beastland";
 *   registerWallpaper({ id: "sunset", label: "Sunset", src: "/wallpapers/sunset.jpg" });
 *
 * Rune-backed like `theme/themes.svelte.ts` and `tiling/kinds.svelte.ts`, so
 * pickers built on `wallpapers.all` update the moment one registers or
 * unregisters. With nothing registered, `defaultWallpaper` is `null` and the
 * `Wallpaper` atom (which already copes with `src` being undefined) renders
 * no image — the background falls back to `--color-bg`.
 */

import { untrack } from "svelte";

/** Any string — an app names its own wallpapers. */
export type WallpaperId = string;

export type Wallpaper = {
  id: WallpaperId;
  label: string;
  src: string;
  /** Short description used by the showcase and the terminal `wallpaper` command. */
  description?: string;
};

function createWallpaperRegistry() {
  let specs = $state<Record<string, Wallpaper>>({});

  const api = {
    get all(): Wallpaper[] {
      return Object.values(specs);
    },

    get(id: WallpaperId | string): Wallpaper | undefined {
      return specs[id];
    },

    /** Register a wallpaper; call the returned function to remove it again. */
    register(wallpaper: Wallpaper): () => void {
      untrack(() => {
        specs = { ...specs, [wallpaper.id]: wallpaper };
      });
      return () => {
        untrack(() => {
          if (specs[wallpaper.id] === wallpaper) {
            const next = { ...specs };
            delete next[wallpaper.id];
            specs = next;
          }
        });
      };
    },
  };

  return api;
}

export const wallpapers = createWallpaperRegistry();

/** Sugar for `wallpapers.register`. */
export function registerWallpaper(wallpaper: Wallpaper): () => void {
  return wallpapers.register(wallpaper);
}

/**
 * Every registered wallpaper id, in registration order.
 *
 * A getter function rather than a plain array: Svelte doesn't allow
 * exporting derived state directly from a module, so this recomputes from
 * the registry on every call — cheap, and always current.
 */
export function wallpaperIds(): WallpaperId[] {
  return wallpapers.all.map((w) => w.id);
}

/** The first registered wallpaper, or `null` when none are. */
export function defaultWallpaper(): Wallpaper | null {
  return wallpapers.all[0] ?? null;
}

/** Runtime check: is `value` a currently registered wallpaper id? */
export function isWallpaperId(value: string): value is WallpaperId {
  return wallpapers.get(value) !== undefined;
}

/** Resolve an id to a `Wallpaper`, or `undefined` when it isn't registered. */
export function getWallpaper(id: WallpaperId | string): Wallpaper | undefined {
  return wallpapers.get(id);
}
