/**
 * `use:portal` — moves the node to `document.body` (or a given target).
 *
 * Needed for overlays: glass surfaces use `backdrop-filter`, which turns them
 * into a containing block for `position: fixed` descendants. Portalling the
 * overlay out keeps it viewport-relative regardless of where it is rendered.
 */
export function portal(node: HTMLElement, target: HTMLElement | string = "body") {
  const el = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
  el?.appendChild(node);

  return {
    destroy() {
      node.remove();
    },
  };
}
