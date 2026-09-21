/**
 * Re-exports the theme registry from `themes.svelte.ts`.
 *
 * Runes need the `.svelte.ts` extension to compile; this plain-`.ts` path
 * predates that split and existing call sites (e.g. the showcase route)
 * still import from it, so it stays alive as a pass-through.
 */
export * from "./themes.svelte.js";
