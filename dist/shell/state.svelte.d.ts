/**
 * Shell state
 *
 * A single rune-backed store shared between the shell chrome (terminal, top bar,
 * showcase) so that any surface can change the active theme or wallpaper.
 * Import it as `import { shell } from "./state.svelte";`.
 */
import type { Intent, TerminalBlock } from "./commands.js";
/** What `wallpaperMeta` returns when the current id isn't (or isn't yet) registered. */
type WallpaperMeta = {
    id: string;
    label: string;
    src?: string;
    description?: string;
};
export declare const shell: {
    readonly theme: string;
    readonly themeMeta: import("../theme/index.js").Theme;
    readonly wallpaper: string;
    readonly wallpaperMeta: WallpaperMeta;
    readonly themeIds: string[];
    readonly wallpaperIds: string[];
    /**
     * Set the theme by id. Returns false when it isn't registered. Changes
     * the theme only; with `withWallpaper` it also switches to the theme's
     * default `wallpaper` when that one is registered (what `applyLook` and
     * `theme --with-wallpaper` do).
     */
    setTheme(id: string, opts?: {
        withWallpaper?: boolean;
    }): boolean;
    /** Set the wallpaper by id. Returns false when it isn't registered. */
    setWallpaper(id: string): boolean;
    /** Cycle to the next theme in registry order. */
    nextTheme(): void;
    /** Cycle to the next wallpaper in registry order. */
    nextWallpaper(): void;
    /**
     * The id of the registered look whose (theme, wallpaper) equals the
     * current pair, or null when nothing matches — derived, nothing new is
     * persisted for it.
     */
    readonly look: string | null;
    /** Apply a registered look's theme + wallpaper. Returns false when unknown. */
    applyLook(id: string): boolean;
    readonly preview: Intent | null;
    /** Publish (or clear with null) the intent of the line being typed. */
    setPreview(intent: Intent | null): void;
    /** Called by the Terminal on mount; returns the unregister function. */
    registerTerminal(focus: () => void): () => void;
    /** Called by the Terminal on mount so surfaces can drive its prompt. */
    registerRunner(run: (line: string) => void, insert: (text: string, trailingSpace?: boolean) => void): () => void;
    /** Called by the Terminal on mount so `shell.blocks` can read the transcript. */
    registerBlocks(read: () => readonly TerminalBlock[]): () => void;
    /** The mounted Terminal's blocks (oldest first), or `[]` without one. Reactive: reads the Terminal's state. */
    readonly blocks: readonly TerminalBlock[];
    /** Run a line through the mounted Terminal (lands in its history/blocks). */
    run(line: string): boolean;
    /** Put text into the prompt (with a trailing space by default) and focus it. */
    insert(text: string, trailingSpace?: boolean): boolean;
    /** Focus the terminal input, if a Terminal is mounted. */
    focusTerminal(): boolean;
    /** Apply the current theme to the document. Call once on mount. */
    hydrate(): void;
};
export {};
