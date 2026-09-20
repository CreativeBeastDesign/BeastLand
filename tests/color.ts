/**
 * Minimal CSS colour evaluator for the theme contract test.
 *
 * Supports exactly what the theme files use: `#hex`, `oklch(L C H [/ A])`,
 * `var(--x)`, and relative `oklch(from <color> <l> <c> <h> [/ A])` where each
 * channel is `l`/`c`/`h`, a number, or `calc(l ± n)` / `calc(c * n)`.
 * Anything else (gradients, shadows, color-mix) evaluates to null.
 */

export type Oklch = { l: number; c: number; h: number; a: number };
export type Rgb = { r: number; g: number; b: number; a: number };

// ---- oklch <-> sRGB (CSS Color 4 reference math) ----------------------------

function oklabToLinearSrgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function linearSrgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

const gamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const degamma = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function oklchToRgb({ l, c, h, a }: Oklch): Rgb {
  const rad = (h * Math.PI) / 180;
  const [r, g, b] = oklabToLinearSrgb(l, c * Math.cos(rad), c * Math.sin(rad));
  return { r: clamp01(gamma(r)) * 255, g: clamp01(gamma(g)) * 255, b: clamp01(gamma(b)) * 255, a };
}

export function rgbToOklch({ r, g, b, a }: Rgb): Oklch {
  const [L, A, B] = linearSrgbToOklab(degamma(r / 255), degamma(g / 255), degamma(b / 255));
  const c = Math.hypot(A, B);
  let h = (Math.atan2(B, A) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: L, c, h: c < 1e-6 ? 0 : h, a };
}

// ---- parsing ----------------------------------------------------------------

function hexToRgb(hex: string): Rgb {
  const h = hex.slice(1);
  const n = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
  return { r: parseInt(n.slice(0, 2), 16), g: parseInt(n.slice(2, 4), 16), b: parseInt(n.slice(4, 6), 16), a: 1 };
}

/** Split `a b c / d` on top-level whitespace, ignoring spaces inside parentheses. */
function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (/\s/.test(ch) && depth === 0) {
      if (cur) out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

function evalChannel(expr: string, base: Oklch): number {
  if (expr === "l") return base.l;
  if (expr === "c") return base.c;
  if (expr === "h") return base.h;
  const calc = expr.match(/^calc\((.+)\)$/);
  if (calc) {
    const m = calc[1].match(/^\s*([lch])\s*([+\-*/])\s*([\d.]+)\s*$/);
    if (!m) throw new Error(`unsupported calc: ${expr}`);
    const v = base[m[1] as "l" | "c" | "h"];
    const n = parseFloat(m[3]);
    return m[2] === "+" ? v + n : m[2] === "-" ? v - n : m[2] === "*" ? v * n : v / n;
  }
  if (expr.endsWith("%")) return parseFloat(expr) / 100;
  return parseFloat(expr);
}

/** Evaluate a colour expression against a variable resolver; null when unsupported. */
export function evalColor(expr: string, resolve: (name: string) => string | undefined): Oklch | null {
  const e = expr.trim();
  const v = e.match(/^var\((--[\w-]+)\)$/);
  if (v) {
    const value = resolve(v[1]);
    return value === undefined ? null : evalColor(value, resolve);
  }
  if (/^#[0-9a-f]{3,6}$/i.test(e)) return rgbToOklch(hexToRgb(e));
  const ok = e.match(/^oklch\((.+)\)$/s);
  if (!ok) return null;
  const inner = ok[1].trim();
  const [body, alphaPart] = (() => {
    // split on top-level " / "
    let depth = 0;
    for (let i = 0; i < inner.length; i++) {
      if (inner[i] === "(") depth++;
      if (inner[i] === ")") depth--;
      if (inner[i] === "/" && depth === 0) return [inner.slice(0, i), inner.slice(i + 1)];
    }
    return [inner, undefined];
  })();
  const alpha = alphaPart === undefined ? 1 : alphaPart.trim().endsWith("%") ? parseFloat(alphaPart) / 100 : parseFloat(alphaPart);
  const parts = splitTop(body);
  if (parts[0] === "from") {
    const base = evalColor(parts[1], resolve);
    if (!base) return null;
    const [l, c, h] = parts.slice(2, 5).map((p) => evalChannel(p, base));
    return { l, c, h, a: Number.isNaN(alpha) ? base.a : alpha };
  }
  const [l, c, h] = parts.map((p) => evalChannel(p, { l: 0, c: 0, h: 0, a: 1 }));
  return { l, c, h, a: Number.isNaN(alpha) ? 1 : alpha };
}

// ---- contrast ---------------------------------------------------------------

export function composite(fg: Rgb, bg: Rgb): Rgb {
  return { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 };
}

function luminance({ r, g, b }: Rgb): number {
  const f = (v: number) => degamma(v / 255);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** WCAG 2.1 contrast ratio between two opaque colours. */
export function contrast(a: Rgb, b: Rgb): number {
  const l1 = luminance(a), l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** Read `--name: value;` declarations of the first `<selector> { … }` block. */
export function parseBlock(css: string, selector: RegExp): Record<string, string> {
  const block = css.match(new RegExp(selector.source + String.raw`\s*\{([\s\S]*?)\n\}`));
  if (!block) throw new Error(`no block matching ${selector}`);
  const vars: Record<string, string> = {};
  // strip comments, then split declarations on `;` at depth 0
  const body = block[1].replace(/\/\*[\s\S]*?\*\//g, "");
  let depth = 0, cur = "";
  const decls: string[] = [];
  for (const ch of body) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === ";" && depth === 0) {
      decls.push(cur);
      cur = "";
    } else cur += ch;
  }
  for (const d of decls) {
    const m = d.match(/^\s*(--[\w-]+)\s*:\s*([\s\S]+?)\s*$/);
    if (m) vars[m[1]] = m[2].replace(/\s+/g, " ");
  }
  return vars;
}

/** Read a `[data-theme="…"]` block. */
export function parseThemeBlock(css: string): Record<string, string> {
  return parseBlock(css, /\[data-theme="[^"]+"\]/);
}

/** Read a `:root` block (tokens/base.css, tokens/semantic.css). */
export function parseRootBlock(css: string): Record<string, string> {
  return parseBlock(css, /:root/);
}
