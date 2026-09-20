/**
 * Shell state
 *
 * A single rune-backed store shared between the shell chrome (terminal, top bar,
 * showcase) so that any surface can change the active theme or wallpaper.
 * Import it as `import { shell } from "$lib/shell/state.svelte";`.
 */

import { applyTheme, defaultTheme, getTheme, isThemeId, themeIds } from "$lib/theme/index.js";
import { storage } from "./storage.js";
import type { ThemeId } from "$lib/theme/types.js";
import type { Intent } from "./commands.js";
import {
  defaultWallpaper,
  getWallpaper,
  isWallpaperId,
  wallpaperIds,
  type WallpaperId,
} from "$lib/wallpapers.js";

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

function createShell() {
  let theme = $state<ThemeId>(defaultTheme.id);
  let wallpaper = $state<WallpaperId>(defaultWallpaper.id);

  /** (Re)read theme + wallpaper; runs at import and whenever the storage adapter changes. */
  function hydrateFromStorage() {
    const persisted = readPersisted();
    theme = persisted.theme && isThemeId(persisted.theme) ? persisted.theme : defaultTheme.id;
    wallpaper =
      persisted.wallpaper && isWallpaperId(persisted.wallpaper) ? persisted.wallpaper : defaultWallpaper.id;
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
      return getTheme(theme);
    },
    get wallpaper() {
      return wallpaper;
    },
    get wallpaperMeta() {
      return getWallpaper(wallpaper);
    },
    themeIds,
    wallpaperIds,

    /** Set the theme by id. Returns false when the id is unknown. */
    setTheme(id: string): boolean {
      if (!isThemeId(id)) return false;
      theme = id;
      if (typeof document !== "undefined") applyTheme(id);
      persist();
      return true;
    },

    /** Set the wallpaper by id. Returns false when the id is unknown. */
    setWallpaper(id: string): boolean {
      if (!isWallpaperId(id)) return false;
      wallpaper = id;
      persist();
      return true;
    },

    /** Cycle to the next theme in registry order. */
    nextTheme() {
      const i = themeIds.indexOf(theme);
      this.setTheme(themeIds[(i + 1) % themeIds.length]);
    },

    /** Cycle to the next wallpaper in manifest order. */
    nextWallpaper() {
      const i = wallpaperIds.indexOf(wallpaper);
      this.setWallpaper(wallpaperIds[(i + 1) % wallpaperIds.length]);
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
