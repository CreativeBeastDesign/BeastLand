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

const TOLERANCE = 1;

function update(node: HTMLElement) {
  const { scrollTop, scrollHeight, clientHeight, scrollLeft, scrollWidth, clientWidth } = node;

  const canScrollY = scrollHeight - clientHeight > TOLERANCE;
  const clippedTop = canScrollY && scrollTop > TOLERANCE;
  const clippedBottom = canScrollY && scrollTop < scrollHeight - clientHeight - TOLERANCE;

  if (clippedTop && clippedBottom) node.dataset.overflow = "both";
  else if (clippedTop) node.dataset.overflow = "top";
  else if (clippedBottom) node.dataset.overflow = "bottom";
  else delete node.dataset.overflow;

  const canScrollX = scrollWidth - clientWidth > TOLERANCE;
  const clippedLeft = canScrollX && scrollLeft > TOLERANCE;
  const clippedRight = canScrollX && scrollLeft < scrollWidth - clientWidth - TOLERANCE;

  if (clippedLeft && clippedRight) node.dataset.overflowX = "both";
  else if (clippedLeft) node.dataset.overflowX = "left";
  else if (clippedRight) node.dataset.overflowX = "right";
  else delete node.dataset.overflowX;
}

export function overflowFade(node: HTMLElement) {
  update(node);

  const onScroll = () => update(node);
  node.addEventListener("scroll", onScroll, { passive: true });

  const resizeObserver = new ResizeObserver(() => update(node));
  resizeObserver.observe(node);

  return {
    destroy() {
      node.removeEventListener("scroll", onScroll);
      resizeObserver.disconnect();
    },
  };
}
