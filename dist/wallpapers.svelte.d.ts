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
/** Any string — an app names its own wallpapers. */
export type WallpaperId = string;
export type Wallpaper = {
    id: WallpaperId;
    label: string;
    src: string;
    /**
     * Small preview (~240px) for pickers. Without it they fall back to `src`,
     * which means a settings tile downloads every full-size wallpaper.
     */
    thumb?: string;
    /** Short description used by the showcase and the terminal `wallpaper` command. */
    description?: string;
};
export declare const wallpapers: {
    readonly all: Wallpaper[];
    get(id: WallpaperId | string): Wallpaper | undefined;
    /** Register a wallpaper; call the returned function to remove it again. */
    register(wallpaper: Wallpaper): () => void;
};
/** Sugar for `wallpapers.register`. */
export declare function registerWallpaper(wallpaper: Wallpaper): () => void;
/**
 * Every registered wallpaper id, in registration order.
 *
 * A getter function rather than a plain array: Svelte doesn't allow
 * exporting derived state directly from a module, so this recomputes from
 * the registry on every call — cheap, and always current.
 */
export declare function wallpaperIds(): WallpaperId[];
/** The first registered wallpaper, or `null` when none are. */
export declare function defaultWallpaper(): Wallpaper | null;
/** Runtime check: is `value` a currently registered wallpaper id? */
export declare function isWallpaperId(value: string): value is WallpaperId;
/** Resolve an id to a `Wallpaper`, or `undefined` when it isn't registered. */
export declare function getWallpaper(id: WallpaperId | string): Wallpaper | undefined;
