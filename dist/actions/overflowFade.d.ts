/**
 * `use:overflowFade` — marks a scroll container with `data-overflow` /
 * `data-overflow-x` reflecting which edges currently clip content, so
 * `glass.css` can mask a soft fade only where there's actually something
 * hidden (a container with nothing clipped gets no attribute and no mask —
 * the last visible line is never faded).
 *
 * Values: `"top" | "bottom" | "both"` (vertical) and `"left" | "right" |
 * "both"` (horizontal), removed entirely when that axis has no overflow.
 * Recomputed on scroll and on resize (ResizeObserver), cleaned up on
 * destroy.
 */
export declare function overflowFade(node: HTMLElement): {
    destroy(): void;
};
