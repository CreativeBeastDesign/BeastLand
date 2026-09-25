/**
 * `createOutlineSpy` — rune-backed outline tracking for `CaseStudy`/`Outline`.
 *
 * Discovers `[data-outline]` entries under a root element (kept fresh with a
 * `MutationObserver`, debounced to a microtask so a burst of DOM changes only
 * recomputes once), tracks which entry is "active" and how far the reader
 * has scrolled through the root's extent, and exposes `goto` to jump to an
 * entry. Works whether the page itself scrolls (root has no scrollable
 * ancestor — falls back to `window`) or the root lives inside a scrolling
 * `Tile`/`ScrollArea` (`nearestScrollRoot` finds it).
 *
 * Not a svelte/store — a plain rune-backed object, created inside a
 * component's `$effect` (so it tears down on unmount) and read directly:
 *
 *   const spy = createOutlineSpy(() => bodyEl);
 *   // spy.entries, spy.activeId, spy.progress, spy.goto(id)
 *
 * SSR-safe: every DOM access is deferred to the `$effect` that only runs in
 * the browser.
 */

import { untrack } from "svelte";
import { activeEntry, collectOutline, nearestScrollRoot, scrollProgress } from "$lib/reading/outline.js";
import type { OutlineEntry } from "$lib/reading/types.js";
import { scrollBehavior } from "./motion.js";

const ACTIVE_THRESHOLD_RATIO = 0.25;

type ScrollTarget = Element | (Window & typeof globalThis);

function isWindow(target: ScrollTarget): target is Window & typeof globalThis {
  return target === window;
}

function viewportHeight(target: ScrollTarget): number {
  return isWindow(target) ? window.innerHeight : (target as Element).clientHeight;
}

function scrollTopOf(target: ScrollTarget): number {
  return isWindow(target) ? window.scrollY : (target as Element).scrollTop;
}

/** `top` of `el` relative to `root`'s scroll position (i.e. document/root-relative). */
function relativeTop(el: Element, root: ScrollTarget): number {
  const rect = el.getBoundingClientRect();
  if (isWindow(root)) return rect.top + window.scrollY;
  const rootEl = root as Element;
  return rect.top - rootEl.getBoundingClientRect().top + rootEl.scrollTop;
}

export function createOutlineSpy(getRoot: () => HTMLElement | undefined) {
  let entries = $state<OutlineEntry[]>([]);
  let activeId = $state<string | null>(null);
  let progress = $state(0);

  function setup(root: HTMLElement) {
    const scrollRoot: ScrollTarget = nearestScrollRoot(root) ?? window;

    function recompute() {
      // Heading tops relative to the scroll root's visible top edge, so the
      // threshold (a fraction of the visible height) compares like with like.
      const viewTop = isWindow(scrollRoot) ? 0 : (scrollRoot as Element).getBoundingClientRect().top;
      const tops = entries.map((entry) => {
        const el = root.ownerDocument?.getElementById(entry.id);
        return { id: entry.id, top: el ? el.getBoundingClientRect().top - viewTop : Number.POSITIVE_INFINITY };
      });

      const threshold = viewportHeight(scrollRoot) * ACTIVE_THRESHOLD_RATIO;
      activeId = activeEntry(tops, threshold);

      // At the very bottom the last sections can never reach the threshold
      // line; treat the last heading that is on screen as the active one.
      const scrollHeight = isWindow(scrollRoot) ? document.documentElement.scrollHeight : (scrollRoot as Element).scrollHeight;
      const atBottom = scrollTopOf(scrollRoot) + viewportHeight(scrollRoot) >= scrollHeight - 2;
      if (atBottom && scrollTopOf(scrollRoot) > 0) {
        const visible = tops.filter((t) => t.top < viewportHeight(scrollRoot));
        if (visible.length > 0) activeId = visible[visible.length - 1].id;
      }

      // Progress over the root element's own extent (not the scroll root's).
      const rootTop = relativeTop(root, scrollRoot);
      const rootExtent = root.scrollHeight || root.getBoundingClientRect().height;
      const scrolledPastRootTop = Math.max(0, scrollTopOf(scrollRoot) - rootTop);
      progress = scrollProgress(scrolledPastRootTop, rootExtent, viewportHeight(scrollRoot));
    }

    let scheduled = false;
    function refreshEntries() {
      entries = collectOutline(root);
      recompute();
    }

    function scheduleRefresh() {
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        refreshEntries();
      });
    }

    let raf = 0;
    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        recompute();
      });
    }

    refreshEntries();

    const scrollTarget: EventTarget = scrollRoot;
    scrollTarget.addEventListener("scroll", onScroll, { passive: true });

    const observer = new MutationObserver(scheduleRefresh);
    observer.observe(root, { childList: true, subtree: true });

    return () => {
      scrollTarget.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }

  let teardown: (() => void) | undefined;

  function destroy() {
    teardown?.();
    teardown = undefined;
  }

  $effect(() => {
    if (typeof window === "undefined") return;
    const root = getRoot();
    if (!root) return;

    // `setup` reads and writes `entries`; untracked so the effect only
    // re-runs when the root element changes, not on its own writes.
    teardown = untrack(() => setup(root));
    return destroy;
  });

  function goto(id: string) {
    const root = getRoot();
    if (!root || typeof document === "undefined") return;

    const target = root.ownerDocument?.getElementById(id) ?? document.getElementById(id);
    if (!target) return;

    target.scrollIntoView({ behavior: scrollBehavior(), block: "start" });

    const scrollRoot = nearestScrollRoot(root) ?? window;
    if (isWindow(scrollRoot)) {
      history.replaceState(null, "", `#${id}`);
    }
  }

  return {
    get entries(): OutlineEntry[] {
      return entries;
    },
    get activeId(): string | null {
      return activeId;
    },
    get progress(): number {
      return progress;
    },
    goto,
    destroy,
  };
}
