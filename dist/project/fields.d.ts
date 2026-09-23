/**
 * Field flags for projects — shared by `project new`, `project set`, and
 * the kind's `set` hook.
 */
import { type FlagSpec, type ParsedArgs } from "../shell/protocol.js";
import type { ProjectFields, ProjectStatus } from "./types.js";
export declare const projectStatusValues: ProjectStatus[];
export declare const projectFieldFlags: FlagSpec[];
export declare function projectFieldsFromFlags(parsed: ParsedArgs): Partial<ProjectFields>;
/**
 * `--customer <#id>` → customer id, `null` when absent, or an error string.
 * Resolved through the kind registry so it accepts short ids.
 */
export declare function customerIdFromFlags(parsed: ParsedArgs): {
    id: string | null;
} | {
    error: string;
};
