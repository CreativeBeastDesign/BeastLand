/**
 * Reduced-motion helpers for JS-driven scrolling.
 *
 * `scrollIntoView`/`scrollBy` calls with `behavior: "smooth"` are NOT
 * covered by the CSS `scroll-behavior: auto !important` guard in
 * `motion.css` — an explicit JS option always wins over the CSS property.
 * Anywhere a component triggers a smooth scroll from script, gate the
 * behavior through `scrollBehavior()` instead of hardcoding `"smooth"`.
 */
export declare function prefersReducedMotion(): boolean;
export declare function scrollBehavior(): ScrollBehavior;
