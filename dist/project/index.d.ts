/**
 * Project slice — public surface + cross-slice wiring.
 *
 * `registerDocumentExtras` pushes a "Project" field into `documentFields`,
 * the same way `$lib/worklog/index.ts` appends its "Logged" field — keeps
 * `$lib/data/views.ts` free of a project-slice dependency. The tiling route
 * calls this once, alongside `kinds.register(projectKind)`.
 */
/** Push the "Project" field into `documentFields`; call the result to remove it again. */
export declare function registerDocumentExtras(): () => void;
export { projects } from "./store.svelte.js";
export * from "./types.js";
export { projectFields } from "./views.js";
export { projectKind } from "./kind.js";
export { projectCommands } from "./commands.js";
