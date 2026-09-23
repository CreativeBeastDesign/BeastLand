/**
 * Shell state
 *
 * A single rune-backed store shared between the shell chrome (terminal, top bar,
 * showcase) so that any surface can change the active theme or wallpaper.
 * Import it as `import { shell } from "./state.svelte";`.
 */
import { applyTheme } from "../theme/index.js";
import { defaultTheme, themeIds, themes } from "../theme/themes.svelte.js";
import { looks } from "../theme/looks.svelte.js";
import { storage } from "./storage.js";
import { defaultWallpaper, wallpaperIds, wallpapers } from "../wallpapers.svelte.js";
const STORAGE_KEY = "beastland:shell";
function readPersisted() {
    try {
        const raw = storage.get(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    }
    catch {
        return {};
    }
}
function createShell() {
    let theme = $state(defaultTheme().id);
    let wallpaper = $state(defaultWallpaper()?.id ?? "");
    /**
     * (Re)read theme + wallpaper; runs at import and whenever the storage
     * adapter changes.
     *
     * Deliberately does NOT validate the persisted ids against the theme/
     * wallpaper registries: this module hydrates at *import* time, which can
     * run before the app's layout module has registered its wallpapers/looks
     * (imports are hoisted, so this file's own top-level `hydrateFromStorage()`
     * call below may execute before another module's `registerWallpaper`
     * calls do). The persisted id is stored as-is; `themeMeta`/`wallpaperMeta`
     * resolve it lazily on every read and fall back to the default when it
     * turns out to be unknown. Validation belongs to `setTheme`/`setWallpaper`
     * (called by commands/pickers, well after the app has registered).
     */
    function hydrateFromStorage() {
        const persisted = readPersisted();
        theme = persisted.theme ?? defaultTheme().id;
        wallpaper = persisted.wallpaper ?? (defaultWallpaper()?.id ?? "");
        if (typeof document !== "undefined")
            applyTheme(theme);
    }
    hydrateFromStorage();
    storage.register(STORAGE_KEY, hydrateFromStorage);
    // The Terminal registers its focus function so other surfaces (keyboard
    // shortcuts, buttons) can hand focus back to it without a DOM query.
    let terminalFocus = null;
    let terminalRun = null;
    let terminalInsert = null;
    let terminalBlocks = null;
    // What the line being typed is about to do (see `Intent`), for surfaces to
    // preview: target glow, hints, ghost rectangles.
    let preview = $state(null);
    function persist() {
        try {
            storage.setJson(STORAGE_KEY, { theme, wallpaper });
        }
        catch {
            /* storage may be unavailable; the in-memory state still works */
        }
    }
    return {
        get theme() {
            return theme;
        },
        get themeMeta() {
            return themes.get(theme) ?? defaultTheme();
        },
        get wallpaper() {
            return wallpaper;
        },
        get wallpaperMeta() {
            return wallpapers.get(wallpaper) ?? defaultWallpaper() ?? { id: wallpaper, label: wallpaper };
        },
        get themeIds() {
            return themeIds();
        },
        get wallpaperIds() {
            return wallpaperIds();
        },
        /**
         * Set the theme by id. Returns false when it isn't registered. Changes
         * the theme only; with `withWallpaper` it also switches to the theme's
         * default `wallpaper` when that one is registered (what `applyLook` and
         * `theme --with-wallpaper` do).
         */
        setTheme(id, opts) {
            const t = themes.get(id);
            if (!t)
                return false;
            theme = id;
            if (typeof document !== "undefined")
                applyTheme(id);
            if (opts?.withWallpaper && t.wallpaper && wallpapers.get(t.wallpaper)) {
                wallpaper = t.wallpaper;
            }
            persist();
            return true;
        },
        /** Set the wallpaper by id. Returns false when it isn't registered. */
        setWallpaper(id) {
            if (!wallpapers.get(id))
                return false;
            wallpaper = id;
            persist();
            return true;
        },
        /** Cycle to the next theme in registry order. */
        nextTheme() {
            const ids = themeIds();
            if (ids.length === 0)
                return;
            const i = ids.indexOf(theme);
            this.setTheme(ids[(i + 1) % ids.length]);
        },
        /** Cycle to the next wallpaper in registry order. */
        nextWallpaper() {
            const ids = wallpaperIds();
            if (ids.length === 0)
                return;
            const i = ids.indexOf(wallpaper);
            this.setWallpaper(ids[(i + 1) % ids.length]);
        },
        /**
         * The id of the registered look whose (theme, wallpaper) equals the
         * current pair, or null when nothing matches — derived, nothing new is
         * persisted for it.
         */
        get look() {
            const match = looks.all.find((l) => l.theme === theme && l.wallpaper === wallpaper);
            return match ? match.id : null;
        },
        /** Apply a registered look's theme + wallpaper. Returns false when unknown. */
        applyLook(id) {
            const l = looks.get(id);
            if (!l)
                return false;
            const themeOk = this.setTheme(l.theme);
            const wallpaperOk = this.setWallpaper(l.wallpaper);
            return themeOk && wallpaperOk;
        },
        get preview() {
            return preview;
        },
        /** Publish (or clear with null) the intent of the line being typed. */
        setPreview(intent) {
            preview = intent;
        },
        /** Called by the Terminal on mount; returns the unregister function. */
        registerTerminal(focus) {
            terminalFocus = focus;
            return () => {
                if (terminalFocus === focus)
                    terminalFocus = null;
            };
        },
        /** Called by the Terminal on mount so surfaces can drive its prompt. */
        registerRunner(run, insert) {
            terminalRun = run;
            terminalInsert = insert;
            return () => {
                if (terminalRun === run)
                    terminalRun = null;
                if (terminalInsert === insert)
                    terminalInsert = null;
            };
        },
        /** Called by the Terminal on mount so `shell.blocks` can read the transcript. */
        registerBlocks(read) {
            terminalBlocks = read;
            return () => {
                if (terminalBlocks === read)
                    terminalBlocks = null;
            };
        },
        /** The mounted Terminal's blocks (oldest first), or `[]` without one. Reactive: reads the Terminal's state. */
        get blocks() {
            return terminalBlocks?.() ?? [];
        },
        /** Run a line through the mounted Terminal (lands in its history/blocks). */
        run(line) {
            if (!terminalRun)
                return false;
            terminalRun(line);
            return true;
        },
        /** Put text into the prompt (with a trailing space by default) and focus it. */
        insert(text, trailingSpace = true) {
            if (!terminalInsert)
                return false;
            terminalInsert(text, trailingSpace);
            return true;
        },
        /** Focus the terminal input, if a Terminal is mounted. */
        focusTerminal() {
            if (!terminalFocus)
                return false;
            terminalFocus();
            return true;
        },
        /** Apply the current theme to the document. Call once on mount. */
        hydrate() {
            if (typeof document !== "undefined")
                applyTheme(theme);
        },
    };
}
export const shell = createShell();
