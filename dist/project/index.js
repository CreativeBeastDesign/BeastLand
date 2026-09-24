/**
 * Project slice — public surface + cross-slice wiring.
 *
 * `registerDocumentExtras` pushes a "Project" field into `documentFields`,
 * the same way `$lib/worklog/index.ts` appends its "Logged" field — keeps
 * `$lib/data/views.ts` free of a project-slice dependency. The tiling route
 * calls this once, alongside `kinds.register(projectKind)`.
 */
import { documentFields } from "../data/views.js";
import { projects } from "./store.svelte.js";
/** Push the "Project" field into `documentFields`; call the result to remove it again. */
export function registerDocumentExtras() {
    const projectField = {
        key: "project",
        label: "Project",
        level: "details",
        get: (d) => {
            if (!d.projectId)
                return "—";
            const p = projects.get(d.projectId);
            return p ? p.name : "—";
        },
    };
    documentFields.push(projectField);
    return () => {
        const i = documentFields.indexOf(projectField);
        if (i !== -1)
            documentFields.splice(i, 1);
    };
}
export { projects } from "./store.svelte.js";
export * from "./types.js";
export { projectFields } from "./views.js";
export { projectKind } from "./kind.js";
export { projectCommands } from "./commands.js";
