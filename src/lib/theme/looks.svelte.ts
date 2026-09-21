/**
 * Look registry
 *
 * A *look* is a named (theme, wallpaper) pair — the unit the Appearance
 * settings section and the `look` terminal command operate on. Rune-backed
 * like `themes.svelte.ts`; ids are plain strings, an app registers its own
 * (the demo layout registers `beast` and `garden`, see `src/routes/
 * wallpapers.ts` / `+layout.svelte`). The library ships none.
 */

import { untrack } from "svelte";

export type Look = {
  /** Identifier, e.g. `"beast"`. */
  id: string;
  /** Human label shown in pickers and `look list`. */
  label: string;
  /** A registered theme id. Not validated against the theme registry here —
   *  `shell.applyLook` resolves it (and refuses an unknown theme). */
  theme: string;
  /** A registered wallpaper id, same caveat as `theme`. */
  wallpaper: string;
  description?: string;
};

function createLookRegistry() {
  let specs = $state<Record<string, Look>>({});

  return {
    get all(): Look[] {
      return Object.values(specs);
    },

    get(id: string): Look | undefined {
      return specs[id];
    },

    /** Register a look; call the returned function to remove it again. */
    register(look: Look): () => void {
      untrack(() => {
        specs = { ...specs, [look.id]: look };
      });
      return () => {
        untrack(() => {
          if (specs[look.id] === look) {
            const next = { ...specs };
            delete next[look.id];
            specs = next;
          }
        });
      };
    },
  };
}

export const looks = createLookRegistry();

/** Sugar for `looks.register`. */
export function registerLook(look: Look): () => void {
  return looks.register(look);
}
