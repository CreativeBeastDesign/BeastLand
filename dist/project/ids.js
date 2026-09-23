/**
 * Stable seed ids for the two demo projects.
 *
 * Kept in their own module (no imports) so `$lib/data/seed.ts` can attach
 * `projectId` to the seeded documents without importing
 * `$lib/project/store.svelte.ts` — which itself imports the data store, and
 * would otherwise form a cycle.
 */
export const SEED_PROJECT_RECO = "project:pr7k2n9vlaseyt3wgh0m";
export const SEED_PROJECT_CORP = "project:pr4bxqzt8cmdywk1nfs2";
