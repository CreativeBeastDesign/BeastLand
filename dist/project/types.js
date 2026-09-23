/**
 * Project domain types
 *
 * A `Project` is the CRM's parent record: documents (`Document.projectId`)
 * and work-log entries (`WorkEntry.projectId`) hang off it. Mirrors the
 * shape of `$lib/data/types.ts` — money in minor units, dates as
 * `YYYY-MM-DD`, ids as `project:<20-char alnum>`.
 */
export const projectStatusLabels = {
    planned: "Planned",
    active: "Active",
    on_hold: "On hold",
    done: "Done",
};
