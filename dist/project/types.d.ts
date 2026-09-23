/**
 * Project domain types
 *
 * A `Project` is the CRM's parent record: documents (`Document.projectId`)
 * and work-log entries (`WorkEntry.projectId`) hang off it. Mirrors the
 * shape of `$lib/data/types.ts` — money in minor units, dates as
 * `YYYY-MM-DD`, ids as `project:<20-char alnum>`.
 */
export type ProjectId = `project:${string}`;
export type ProjectStatus = "planned" | "active" | "on_hold" | "done";
export type Project = {
    id: ProjectId;
    name: string;
    customerId: string | null;
    status: ProjectStatus;
    startDate: string | null;
    endDate: string | null;
    /** CHF minor units (rappen), or `null` when no budget was set. */
    budgetMinor: number | null;
    description: string;
    createdAt: string;
    updatedAt: string;
};
/** Editable project fields, i.e. everything but the id and timestamps. */
export type ProjectFields = Omit<Project, "id" | "createdAt" | "updatedAt">;
export declare const projectStatusLabels: Record<ProjectStatus, string>;
