/**
 * Views — which fields of a `Project` are shown at which level of detail.
 * See `$lib/data/views.ts` for the level semantics (`list` ⊂ `details` ⊂ `full`).
 */
import type { FieldDef } from "../data/views.js";
import type { Project } from "./types.js";
export declare const projectFields: FieldDef<Project>[];
