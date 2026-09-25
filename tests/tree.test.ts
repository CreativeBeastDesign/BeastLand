import { describe, expect, it } from "vitest";
import { flattenTree } from "../src/lib/reading/tree.js";
import type { TreeNode } from "../src/lib/reading/types.js";

const nodes: TreeNode[] = [
  {
    id: "src",
    label: "src",
    children: [
      { id: "src/a.ts", label: "a.ts" },
      {
        id: "src/lib",
        label: "lib",
        children: [{ id: "src/lib/b.ts", label: "b.ts" }],
      },
    ],
  },
  { id: "readme", label: "README.md" },
];

describe("flattenTree", () => {
  it("emits only top-level rows when nothing is open", () => {
    const rows = flattenTree(nodes, new Set());
    expect(rows.map((r) => r.node.id)).toEqual(["src", "readme"]);
    expect(rows[0]).toMatchObject({ level: 0, last: false, hasChildren: true, open: false });
    expect(rows[1]).toMatchObject({ level: 0, last: true, hasChildren: false, open: false });
  });

  it("expands an open folder's children in document order", () => {
    const rows = flattenTree(nodes, new Set(["src"]));
    expect(rows.map((r) => r.node.id)).toEqual(["src", "src/a.ts", "src/lib", "readme"]);
  });

  it("only descends into nested folders that are themselves open", () => {
    const rows = flattenTree(nodes, new Set(["src", "src/lib"]));
    expect(rows.map((r) => r.node.id)).toEqual(["src", "src/a.ts", "src/lib", "src/lib/b.ts", "readme"]);
  });

  it("computes guides from ancestor last-ness (pipe = more siblings below, space = last); top-level rows add none", () => {
    const rows = flattenTree(nodes, new Set(["src", "src/lib"]));
    const bDotTs = rows.find((r) => r.node.id === "src/lib/b.ts");
    // src is top-level (drawn bare, no guide); src/lib is last -> space
    expect(bDotTs?.guides).toEqual(["space"]);
    expect(bDotTs?.level).toBe(2);
    expect(bDotTs?.last).toBe(true);
  });

  it("marks last child among siblings correctly at every level", () => {
    const rows = flattenTree(nodes, new Set(["src"]));
    const aTs = rows.find((r) => r.node.id === "src/a.ts");
    const lib = rows.find((r) => r.node.id === "src/lib");
    expect(aTs?.last).toBe(false);
    expect(lib?.last).toBe(true);
  });

  it("returns an empty list for an empty tree", () => {
    expect(flattenTree([], new Set())).toEqual([]);
  });
});
