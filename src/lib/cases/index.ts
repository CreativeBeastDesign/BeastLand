// Cases slice — public surface. See `$lib/cases/kind.ts` for the content-id
// scheme (`case:<slug>`) and `$lib/cases/store.svelte.ts` for the outline
// bridge (`attach`/`outline`) `CaseTile` uses.

export { cases } from "./store.svelte.js";
export type { CaseEntry, CaseOutlineHandle } from "./types.js";
export { caseKind, slugOf, caseContentId } from "./kind.js";
export { caseCommands, caseCommand } from "./commands.js";
