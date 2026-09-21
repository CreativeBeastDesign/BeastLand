/**
 * Shell state
 *
 * A single rune-backed store shared between the shell chrome (terminal, top bar,
 * showcase) so that any surface can change the active theme or wallpaper.
 * Import it as `import { shell } from "$lib/shell/state.svelte";`.
 */

import { applyTheme } from "$lib/theme/index.js";
import { defaultTheme, themeIds, themes } from "$lib/theme/themes.svelte.js";
import { looks } from "$lib/theme/looks.svelte.js";
import { storage } from "./storage.js";
import type { Intent } from "./commands.js";
import { defaultWallpaper, wallpaperIds, wallpapers } from "$lib/wallpapers.svelte.js";

const STORAGE_KEY = "beastland:shell";

type Persisted = { theme?: string; wallpaper?: string };

function readPersisted(): Persisted {
  try {
    const raw = storage.get(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Persisted) : {};
  } catch {
    return {};
  }
}

/** What `wallpaperMeta` returns when the current id isn't (or isn't yet) registered. */
type WallpaperMeta = { id: string; label: string; src?: string; description?: string };

function createShell() {
  let theme = $state<string>(defaultTheme().id);
  let wallpaper = $state<string>(defaultWallpaper()?.id ?? "");

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
    if (typeof document !== "undefined") applyTheme(theme);
  }
  hydrateFromStorage();
  storage.register(STORAGE_KEY, hydrateFromStorage);

  // The Terminal registers its focus function so other surfaces (keyboard
  // shortcuts, buttons) can hand focus back to it without a DOM query.
  let terminalFocus: (() => void) | null = null;
  let terminalRun: ((line: string) => void) | null = null;
  let terminalInsert: ((text: string, trailingSpace?: boolean) => void) | null = null;

  // What the line being typed is about to do (see `Intent`), for surfaces to
  // preview: target glow, hints, ghost rectangles.
  let preview = $state<Intent | null>(null);


  function persist() {
    try {
      storage.setJson(STORAGE_KEY, { theme, wallpaper });
    } catch {
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
    get wallpaperMeta(): WallpaperMeta {
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
    setTheme(id: string, opts?: { withWallpaper?: boolean }): boolean {
      const t = themes.get(id);
      if (!t) return false;
      theme = id;
      if (typeof document !== "undefined") applyTheme(id);
      if (opts?.withWallpaper && t.wallpaper && wallpapers.get(t.wallpaper)) {
        wallpaper = t.wallpaper;
      }
      persist();
      return true;
    },

    /** Set the wallpaper by id. Returns false when it isn't registered. */
    setWallpaper(id: string): boolean {
      if (!wallpapers.get(id)) return false;
      wallpaper = id;
      persist();
      return true;
    },

    /** Cycle to the next theme in registry order. */
    nextTheme() {
      const ids = themeIds();
      if (ids.length === 0) return;
      const i = ids.indexOf(theme);
      this.setTheme(ids[(i + 1) % ids.length]);
    },

    /** Cycle to the next wallpaper in registry order. */
    nextWallpaper() {
      const ids = wallpaperIds();
      if (ids.length === 0) return;
      const i = ids.indexOf(wallpaper);
      this.setWallpaper(ids[(i + 1) % ids.length]);
    },

    /**
     * The id of the registered look whose (theme, wallpaper) equals the
     * current pair, or null when nothing matches — derived, nothing new is
     * persisted for it.
     */
    get look(): string | null {
      const match = looks.all.find((l) => l.theme === theme && l.wallpaper === wallpaper);
      return match ? match.id : null;
    },

    /** Apply a registered look's theme + wallpaper. Returns false when unknown. */
    applyLook(id: string): boolean {
      const l = looks.get(id);
      if (!l) return false;
      const themeOk = this.setTheme(l.theme);
      const wallpaperOk = this.setWallpaper(l.wallpaper);
      return themeOk && wallpaperOk;
    },

    get preview() {
      return preview;
    },
    /** Publish (or clear with null) the intent of the line being typed. */
    setPreview(intent: Intent | null) {
      preview = intent;
    },

    /** Called by the Terminal on mount; returns the unregister function. */
    registerTerminal(focus: () => void): () => void {
      terminalFocus = focus;
      return () => {
        if (terminalFocus === focus) terminalFocus = null;
      };
    },

    /** Called by the Terminal on mount so surfaces can drive its prompt. */
    registerRunner(
      run: (line: string) => void,
      insert: (text: string, trailingSpace?: boolean) => void,
    ): () => void {
      terminalRun = run;
      terminalInsert = insert;
      return () => {
        if (terminalRun === run) terminalRun = null;
        if (terminalInsert === insert) terminalInsert = null;
      };
    },

    /** Run a line through the mounted Terminal (lands in its history/blocks). */
    run(line: string): boolean {
      if (!terminalRun) return false;
      terminalRun(line);
      return true;
    },

    /** Put text into the prompt (with a trailing space by default) and focus it. */
    insert(text: string, trailingSpace = true): boolean {
      if (!terminalInsert) return false;
      terminalInsert(text, trailingSpace);
      return true;
    },

    /** Focus the terminal input, if a Terminal is mounted. */
    focusTerminal(): boolean {
      if (!terminalFocus) return false;
      terminalFocus();
      return true;
    },

    /** Apply the current theme to the document. Call once on mount. */
    hydrate() {
      if (typeof document !== "undefined") applyTheme(theme);
    },
  };
}

export const shell = createShell();
