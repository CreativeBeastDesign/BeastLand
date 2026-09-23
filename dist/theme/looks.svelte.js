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
function createLookRegistry() {
    let specs = $state({});
    return {
        get all() {
            return Object.values(specs);
        },
        get(id) {
            return specs[id];
        },
        /** Register a look; call the returned function to remove it again. */
        register(look) {
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
export function registerLook(look) {
    return looks.register(look);
}
