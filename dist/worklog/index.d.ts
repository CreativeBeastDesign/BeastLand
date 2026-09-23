/**
 * Work log slice — public surface + cross-slice wiring.
 *
 * `registerDocumentExtras` is how the "hours flow into the document" wiring
 * happens. The natural place for a "Logged" field would be
 * `$lib/data/views.ts` (`documentFields`), but that would make the *data*
 * slice depend on the *worklog* slice — the two are meant to stay decoupled
 * (either could be dropped from the app without touching the other). So
 * instead `documentFields` stays a plain, worklog-agnostic array (declared
 * `export const`, but its contents are mutable — pushing/splicing does not
 * touch the binding), and the worklog slice reaches over and appends its own
 * field to it at runtime, the same way `kinds.register`/`registry.register`
 * let a slice extend shared state while it's mounted. The tiling route
 * calls this once, alongside `kinds.register(worklogKind)`.
 */
/** Push the "Logged" field into `documentFields`; call the result to remove it again. */
export declare function registerDocumentExtras(): () => void;
export { worklog, clock } from "./store.svelte.js";
export * from "./types.js";
export { worklogKind, WORKLOG_CONTENT_ID } from "./kind.js";
export { worklogCommands } from "./commands.js";
