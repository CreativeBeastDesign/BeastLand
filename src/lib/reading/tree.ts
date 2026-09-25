/**
 * Pure flattening for `Tree` (Forest TreeView): turns the nested `TreeNode[]`
 * into a flat list of visible rows, each carrying enough about its ancestry
 * to draw box-drawing guides (`├── `, `└── `, `│   `) without the component
 * re-walking the tree on every render.
 */

import type { TreeNode } from "./types.js";

export type TreeGuide = "pipe" | "space";

export type TreeRow = {
  node: TreeNode;
  /** 0-based depth; top-level nodes are level 0. */
  level: number;
  /** One entry per ancestor (not including this row itself). */
  guides: TreeGuide[];
  /** True when this row is the last child among its siblings. */
  last: boolean;
  hasChildren: boolean;
  open: boolean;
};

/**
 * Flattens `nodes` into visible rows in document order. A node's children
 * are only emitted when its id is in `openIds` — collapsed branches
 * contribute a single row and nothing beneath it.
 */
export function flattenTree(nodes: TreeNode[], openIds: Set<string>): TreeRow[] {
  const rows: TreeRow[] = [];

  function walk(list: TreeNode[], level: number, guides: TreeGuide[]) {
    list.forEach((node, index) => {
      const last = index === list.length - 1;
      const hasChildren = Boolean(node.children && node.children.length > 0);
      const open = hasChildren && openIds.has(node.id);

      rows.push({ node, level, guides, last, hasChildren, open });

      if (open && node.children) {
        // Top-level rows are drawn bare (like the root line of `tree`), so
        // their children start without an ancestor guide.
        walk(node.children, level + 1, level === 0 ? [] : [...guides, last ? "space" : "pipe"]);
      }
    });
  }

  walk(nodes, 0, []);
  return rows;
}
