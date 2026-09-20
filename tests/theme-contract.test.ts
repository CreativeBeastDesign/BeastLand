/**
 * Theme contract: every theme must keep its text tokens readable on its own
 * surfaces AND on glass over plausible wallpapers. Numbers are WCAG 2.1
 * ratios of the composited colours (same maths the manual audits used).
 */

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import {
  composite,
  contrast,
  evalColor,
  oklchToRgb,
  parseRootBlock,
  parseThemeBlock,
  type Rgb,
} from "./color.js";

const stylesDir = new URL("../src/lib/styles/", import.meta.url);
const themesDir = new URL("themes/", stylesDir);
const themeFiles = readdirSync(themesDir).filter((f) => f.endsWith(".css"));

// Themes only override; unset tokens fall through to the token layers, in
// the same order the layout imports them.
const baseVars = {
  ...parseRootBlock(readFileSync(new URL("tokens/base.css", stylesDir), "utf8")),
  ...parseRootBlock(readFileSync(new URL("tokens/semantic.css", stylesDir), "utf8")),
};

/**
 * Wallpaper samples per mode. "typical" is what most of a wallpaper looks
 * like; "extreme" is the brightest/darkest patch glass can sit on, where
 * only large-text contrast is required.
 */
const WALL: Record<"dark" | "light", { typical: Record<string, Rgb>; extreme: Record<string, Rgb> }> = {
  dark: {
    typical: { "dark water": { r: 18, g: 34, b: 42, a: 1 } },
    extreme: { "horizon glow": { r: 120, g: 150, b: 160, a: 1 } },
  },
  light: {
    typical: { paper: { r: 236, g: 228, b: 218, a: 1 }, mint: { r: 167, g: 205, b: 188, a: 1 } },
    extreme: { "dark shrub": { r: 60, g: 80, b: 65, a: 1 } },
  },
};

// Minimum ratios per token on surfaces + typical wallpaper (strict) and on
// extreme patches (large-text floor; `text-low` is decorative there).
const STRICT: Record<string, number> = {
  "--color-text-high": 7,
  "--color-text-med": 4.5,
  "--color-text-low": 3,
  "--color-accent": 3,
  "--color-secondary": 3,
  "--color-danger": 3,
};
const RELAXED: Record<string, number> = {
  "--color-text-high": 4.5,
  "--color-text-med": 3,
};

// Themes declare their mode in `themes.ts`; mirror it here without importing
// Svelte-flavoured modules into a node test.
const MODE: Record<string, "dark" | "light"> = {
  "beast-dark": "dark",
  "garden-light": "light",
  "hypr-dark": "dark",
  "hypr-light": "light",
  "tokyo-glass": "dark",
};

for (const file of themeFiles) {
  const id = file.replace(/\.css$/, "");
  const vars = { ...baseVars, ...parseThemeBlock(readFileSync(new URL(file, themesDir), "utf8")) };
  const resolve = (name: string) => vars[name];
  const rgb = (name: string): Rgb | null => {
    const c = evalColor(`var(${name})`, resolve);
    return c ? oklchToRgb(c) : null;
  };

  describe(`theme ${id}`, () => {
    const mode = MODE[id];
    it("is registered in the mode table", () => {
      expect(mode, `add ${id} to MODE in the contract test`).toBeDefined();
    });

    const surface = rgb("--color-surface-0");
    const glass = rgb("--color-glass");
    it("declares evaluable surface-0 and glass", () => {
      expect(surface).not.toBeNull();
      expect(glass).not.toBeNull();
    });
    if (!surface || !glass || !mode) return;

    const strictBg: Record<string, Rgb> = { "surface-0": surface };
    for (const [name, wall] of Object.entries(WALL[mode].typical)) strictBg[`glass over ${name}`] = composite(glass, wall);
    const relaxedBg: Record<string, Rgb> = {};
    for (const [name, wall] of Object.entries(WALL[mode].extreme)) relaxedBg[`glass over ${name}`] = composite(glass, wall);

    const check = (token: string, min: number, bgName: string, bg: Rgb, fg: Rgb) =>
      it(`${token} ≥ ${min}:1 on ${bgName}`, () => {
        const ratio = contrast(composite(fg, bg), bg);
        expect(ratio, `${token} on ${bgName} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(min);
      });

    for (const [token, min] of Object.entries(STRICT)) {
      const fg = rgb(token);
      it(`${token} evaluates`, () => expect(fg, `${token} missing or unsupported syntax`).not.toBeNull());
      if (!fg) continue;
      for (const [bgName, bg] of Object.entries(strictBg)) check(token, min, bgName, bg, fg);
      const relaxed = RELAXED[token];
      if (relaxed) for (const [bgName, bg] of Object.entries(relaxedBg)) check(token, relaxed, bgName, bg, fg);
    }

    it("on-accent is readable on accent", () => {
      const on = rgb("--color-on-accent");
      const accent = rgb("--color-accent");
      expect(on).not.toBeNull();
      expect(accent).not.toBeNull();
      const ratio = contrast(on!, accent!);
      expect(ratio, `on-accent on accent is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    });
  });
}
