/**
 * Field flags for projects — shared by `project new`, `project set`, and
 * the kind's `set` hook.
 */

import { flag, type FlagSpec, type ParsedArgs } from "$lib/shell/protocol.js";
import { kinds } from "$lib/tiling/kinds.svelte.js";
import type { ProjectFields, ProjectStatus } from "./types.js";

export const projectStatusValues: ProjectStatus[] = ["planned", "active", "on_hold", "done"];

export const projectFieldFlags: FlagSpec[] = [
  { name: "name", short: "n", description: "Project name", takesValue: true },
  { name: "customer", description: "Customer to attach", takesValue: true },
  { name: "status", description: "Project status", takesValue: true, values: projectStatusValues },
  { name: "start", description: "Start date (ISO)", takesValue: true },
  { name: "end", description: "End date (ISO)", takesValue: true },
  { name: "budget", description: "Budget, in CHF", takesValue: true },
  { name: "description", description: "Description", takesValue: true },
];

export function projectFieldsFromFlags(parsed: ParsedArgs): Partial<ProjectFields> {
  const fields: Partial<ProjectFields> = {};
  const name = flag(parsed, "name", "n");
  if (typeof name === "string") fields.name = name;
  const status = flag(parsed, "status");
  if (typeof status === "string" && (projectStatusValues as string[]).includes(status)) {
    fields.status = status as ProjectStatus;
  }
  const start = flag(parsed, "start");
  if (typeof start === "string") fields.startDate = start;
  const end = flag(parsed, "end");
  if (typeof end === "string") fields.endDate = end;
  const budget = flag(parsed, "budget");
  if (typeof budget === "string") {
    const amount = parseFloat(budget.replace(/'/g, ""));
    fields.budgetMinor = Number.isNaN(amount) ? null : Math.round(amount * 100);
  }
  const description = flag(parsed, "description");
  if (typeof description === "string") fields.description = description;
  return fields;
}

/**
 * `--customer <#id>` → customer id, `null` when absent, or an error string.
 * Resolved through the kind registry so it accepts short ids.
 */
export function customerIdFromFlags(parsed: ParsedArgs): { id: string | null } | { error: string } {
  const token = flag(parsed, "customer");
  if (typeof token !== "string") return { id: null };
  const resolved = kinds.resolve(token);
  if (!resolved) return { error: `unknown id: ${token}` };
  if ("ambiguous" in resolved) return { error: `ambiguous: ${token}` };
  if (resolved.kind !== "customer") return { error: `${token} is not a customer` };
  return { id: resolved.id };
}
