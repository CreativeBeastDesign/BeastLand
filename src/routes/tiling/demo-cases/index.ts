// Demo `CaseEntry` registration for the tiling route — one lorem-style
// placeholder case (see `LoremCase.svelte`), never real portfolio content.

import type { CaseEntry } from "$lib/cases/index.js";
import LoremCase from "./LoremCase.svelte";

export const demoCases: CaseEntry[] = [
  {
    slug: "lorem",
    title: "Lorem Ipsum Kiosk",
    standfirst: "A placeholder case study demonstrating the reading components in a terminal tile.",
    tags: ["demo", "placeholder"],
    metric: { label: "lorem", value: "42", detail: "ipsum units" },
    component: LoremCase,
  },
];
