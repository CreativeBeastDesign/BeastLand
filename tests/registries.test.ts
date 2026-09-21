/**
 * Theme / wallpaper / look registries: register/unregister, runtime id
 * checks, `shell.look` derivation, `setTheme`'s default-wallpaper follow
 * (and `keepWallpaper`), and the hydration-order guarantee `shell` makes —
 * a persisted id survives even when the registry that resolves it only
 * fills in *after* the store has already hydrated from storage.
 *
 * Every test that mutates the shared `shell`/registry singletons restores
 * them in a `finally`, so one failing assertion can't leak state (an extra
 * theme, a wallpaper stuck as `defaultWallpaper()`) into a later test.
 */
import { afterEach, describe, expect, it } from "vitest";
import { memoryStorage, storage } from "$lib/shell/storage.js";
import { isThemeId, registerTheme, themes } from "$lib/theme/themes.svelte.js";
import { isWallpaperId, registerWallpaper, wallpapers } from "$lib/wallpapers.svelte.js";
import { looks, registerLook } from "$lib/theme/looks.svelte.js";
import { shell } from "$lib/shell/state.svelte.js";
import { shellCommands } from "$lib/shell/commands.js";
import { runCommand, type CommandContext, type Span } from "$lib/shell/protocol.js";

afterEach(() => storage.use(memoryStorage()));

describe("theme registry", () => {
  it("ships the five default themes", () => {
    expect(themes.all.map((t) => t.id).sort()).toEqual(
      ["beast-dark", "garden-light", "hypr-dark", "hypr-light", "tokyo-glass"].sort(),
    );
  });

  it("registers and unregisters", () => {
    expect(themes.get("acme")).toBeUndefined();
    const off = registerTheme({ id: "acme", label: "Acme", mode: "dark", glass: false });
    try {
      expect(themes.get("acme")?.label).toBe("Acme");
      expect(themes.all.some((t) => t.id === "acme")).toBe(true);
    } finally {
      off();
    }
    expect(themes.get("acme")).toBeUndefined();
  });

  it("isThemeId is a runtime check against the live registry, not a static union", () => {
    expect(isThemeId("beast-dark")).toBe(true);
    expect(isThemeId("acme")).toBe(false);
    const off = registerTheme({ id: "acme", label: "Acme", mode: "dark", glass: false });
    try {
      expect(isThemeId("acme")).toBe(true);
    } finally {
      off();
    }
    expect(isThemeId("acme")).toBe(false);
  });
});

describe("wallpaper registry", () => {
  it("ships nothing by default", () => {
    // Other tests in this file register/unregister their own wallpapers and
    // always clean up, so nothing of theirs should be left lying around.
    expect(wallpapers.all.find((w) => w.id.startsWith("registries-test:"))).toBeUndefined();
  });

  it("registers and unregisters", () => {
    const off = registerWallpaper({ id: "registries-test:wp", label: "Acme", src: "/acme.jpg" });
    try {
      expect(wallpapers.get("registries-test:wp")?.src).toBe("/acme.jpg");
      expect(isWallpaperId("registries-test:wp")).toBe(true);
    } finally {
      off();
    }
    expect(wallpapers.get("registries-test:wp")).toBeUndefined();
    expect(isWallpaperId("registries-test:wp")).toBe(false);
  });
});

describe("shell.look", () => {
  it("derives the id of the look matching the current (theme, wallpaper) pair, else null", () => {
    const prevTheme = shell.theme;
    const prevWallpaper = shell.wallpaper;
    const offW = registerWallpaper({ id: "registries-test:look-wp", label: "Look WP", src: "/look.jpg" });
    const offL = registerLook({
      id: "registries-test:look",
      label: "Look Test",
      theme: "beast-dark",
      wallpaper: "registries-test:look-wp",
    });
    try {
      // A brand-new wallpaper id can't already be the current one.
      expect(shell.look).not.toBe("registries-test:look");
      expect(shell.setTheme("beast-dark", { keepWallpaper: true })).toBe(true);
      expect(shell.setWallpaper("registries-test:look-wp")).toBe(true);
      expect(shell.look).toBe("registries-test:look");
    } finally {
      offL();
      offW();
      shell.setTheme(prevTheme, { keepWallpaper: true });
      shell.setWallpaper(prevWallpaper);
    }
  });

  it("applyLook sets both theme and wallpaper, and fails for an unknown id", () => {
    const prevTheme = shell.theme;
    const prevWallpaper = shell.wallpaper;
    const offW = registerWallpaper({ id: "registries-test:apply-wp", label: "Apply WP", src: "/apply.jpg" });
    const offL = registerLook({
      id: "registries-test:apply-look",
      label: "Apply Look",
      theme: "garden-light",
      wallpaper: "registries-test:apply-wp",
    });
    try {
      expect(shell.applyLook("registries-test:apply-look")).toBe(true);
      expect(shell.theme).toBe("garden-light");
      expect(shell.wallpaper).toBe("registries-test:apply-wp");
      expect(shell.applyLook("no-such-look")).toBe(false);
    } finally {
      offL();
      offW();
      shell.setTheme(prevTheme, { keepWallpaper: true });
      shell.setWallpaper(prevWallpaper);
    }
  });
});

describe("shell.setTheme", () => {
  it("follows the theme's default wallpaper when it's registered", () => {
    const prevTheme = shell.theme;
    const prevWallpaper = shell.wallpaper;
    const offW = registerWallpaper({ id: "registries-test:follow-wp", label: "Follow", src: "/follow.jpg" });
    const offT = registerTheme({
      id: "registries-test:follow-theme",
      label: "Follow Theme",
      mode: "dark",
      glass: false,
      wallpaper: "registries-test:follow-wp",
    });
    try {
      expect(shell.setTheme("registries-test:follow-theme")).toBe(true);
      expect(shell.theme).toBe("registries-test:follow-theme");
      expect(shell.wallpaper).toBe("registries-test:follow-wp");
    } finally {
      offT();
      offW();
      shell.setTheme(prevTheme, { keepWallpaper: true });
      shell.setWallpaper(prevWallpaper);
    }
  });

  it("keepWallpaper leaves the current wallpaper alone", () => {
    const prevTheme = shell.theme;
    const prevWallpaper = shell.wallpaper;
    const offW = registerWallpaper({ id: "registries-test:keep-wp", label: "Keep", src: "/keep.jpg" });
    const offT = registerTheme({
      id: "registries-test:keep-theme",
      label: "Keep Theme",
      mode: "dark",
      glass: false,
      wallpaper: "registries-test:keep-wp",
    });
    try {
      const before = shell.wallpaper;
      expect(shell.setTheme("registries-test:keep-theme", { keepWallpaper: true })).toBe(true);
      expect(shell.wallpaper).toBe(before);
    } finally {
      offT();
      offW();
      shell.setTheme(prevTheme, { keepWallpaper: true });
      shell.setWallpaper(prevWallpaper);
    }
  });

  it("a theme naming a wallpaper the app never registered is harmless", () => {
    const prevTheme = shell.theme;
    const before = shell.wallpaper;
    const offT = registerTheme({
      id: "registries-test:dangling-theme",
      label: "Dangling",
      mode: "dark",
      glass: false,
      wallpaper: "registries-test:does-not-exist",
    });
    try {
      expect(shell.setTheme("registries-test:dangling-theme")).toBe(true);
      expect(shell.wallpaper).toBe(before); // nothing to switch to — no crash, no change
    } finally {
      offT();
      shell.setTheme(prevTheme, { keepWallpaper: true });
    }
  });

  it("returns false for an unregistered theme id and leaves the current theme alone", () => {
    const before = shell.theme;
    expect(shell.setTheme("registries-test:no-such-theme")).toBe(false);
    expect(shell.theme).toBe(before);
  });
});

describe("hydration order", () => {
  it("keeps a persisted wallpaper id as-is when the registry hydrates before it fills in, and resolves it once it does", () => {
    const prevTheme = shell.theme;
    const prevWallpaper = shell.wallpaper;

    storage.use(
      memoryStorage({
        "beastland:shell": JSON.stringify({ theme: "beast-dark", wallpaper: "registries-test:late-wp" }),
      }),
    );
    try {
      // Hydrated before the wallpaper is registered: the raw id is kept…
      expect(shell.wallpaper).toBe("registries-test:late-wp");
      // …and the getter falls back rather than throwing or resolving to garbage.
      expect(shell.wallpaperMeta.src).toBeUndefined();

      const off = registerWallpaper({ id: "registries-test:late-wp", label: "Late", src: "/late.jpg" });
      try {
        // No re-hydration needed — the getter re-resolves the same stored id live.
        expect(shell.wallpaperMeta.src).toBe("/late.jpg");
      } finally {
        off();
      }
    } finally {
      storage.use(memoryStorage());
      shell.setTheme(prevTheme, { keepWallpaper: true });
      shell.setWallpaper(prevWallpaper);
    }
  });

  it("same guarantee for a persisted theme id", () => {
    const prevTheme = shell.theme;

    storage.use(
      memoryStorage({
        "beastland:shell": JSON.stringify({ theme: "registries-test:late-theme", wallpaper: "" }),
      }),
    );
    try {
      expect(shell.theme).toBe("registries-test:late-theme");
      expect(shell.themeMeta.id).toBe("beast-dark"); // unresolved: falls back to the default theme

      const off = registerTheme({
        id: "registries-test:late-theme",
        label: "Late Theme",
        mode: "dark",
        glass: false,
      });
      try {
        expect(shell.themeMeta.label).toBe("Late Theme");
      } finally {
        off();
      }
    } finally {
      storage.use(memoryStorage());
      shell.setTheme(prevTheme, { keepWallpaper: true });
    }
  });
});

describe("numbered selection (`wallpaper 2`, `theme 2`, `look 2`)", () => {
  async function run(line: string): Promise<string[]> {
    const lines: string[] = [];
    const ctx: CommandContext = {
      print: (text) => {
        lines.push(typeof text === "string" ? text : (text as Span[]).map((s) => s.text).join(""));
        return { set: () => {}, append: () => {} };
      },
      clear: () => {},
      commands: shellCommands,
      signal: new AbortController().signal,
    };
    await runCommand(line, shellCommands, ctx);
    return lines;
  }

  it("resolves a 1-based registration index and lists with numbers", async () => {
    const offs = [
      registerWallpaper({ id: "registries-test:a", label: "A", src: "/a.jpg" }),
      registerWallpaper({ id: "registries-test:b", label: "B", src: "/b.jpg" }),
      registerLook({ id: "registries-test:look", label: "Look", theme: "beast-dark", wallpaper: "registries-test:b" }),
    ];
    const before = { theme: shell.theme, wallpaper: shell.wallpaper };
    try {
      const n = wallpapers.all.length; // "registries-test:b" is the last registered
      expect((await run(`wallpaper ${n}`))[0]).toMatch(/^wallpaper set to B/);
      expect(shell.wallpaper).toBe("registries-test:b");
      expect((await run("wallpaper"))).toContainEqual(expect.stringMatching(new RegExp(`^  \\* +${n}  registries-test:b — B$`)));
      expect((await run("wallpaper 99"))[0]).toBe("unknown wallpaper: 99");
      expect((await run(`look ${looks.all.length}`))[0]).toMatch(/^look set to registries-test:look/);
      expect((await run("theme 1"))[0]).toBe(`theme set to ${themes.all[0].id}`);
    } finally {
      shell.setTheme(before.theme, { keepWallpaper: true });
      shell.setWallpaper(before.wallpaper);
      offs.forEach((off) => off());
    }
  });
});
