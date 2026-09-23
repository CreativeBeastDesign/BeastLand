/**
 * `use:portal` — moves the node to `document.body` (or a given target).
 *
 * Needed for overlays: glass surfaces use `backdrop-filter`, which turns them
 * into a containing block for `position: fixed` descendants. Portalling the
 * overlay out keeps it viewport-relative regardless of where it is rendered.
 */
export declare function portal(node: HTMLElement, target?: HTMLElement | string): {
    destroy(): void;
};
