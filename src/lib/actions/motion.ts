/**
 * Reduced-motion helpers for JS-driven scrolling.
 *
 * `scrollIntoView`/`scrollBy` calls with `behavior: "smooth"` are NOT
 * covered by the CSS `scroll-behavior: auto !important` guard in
 * `motion.css` — an explicit JS option always wins over the CSS property.
 * Anywhere a component triggers a smooth scroll from script, gate the
 * behavior through `scrollBehavior()` instead of hardcoding `"smooth"`.
 */

export function prefersReducedMotion(): boolean {
  if (typeof matchMedia !== "function") return false;
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? "auto" : "smooth";
}
