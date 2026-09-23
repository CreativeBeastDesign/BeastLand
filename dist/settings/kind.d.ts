/**
 * The `settings` tile kind.
 *
 * Like `worklogKind`, this is a singleton: one virtual content id,
 * `"settings:main"`. It always exists — there's nothing to prune.
 */
import type { KindSpec } from "../tiling/kinds.svelte.js";
export declare const SETTINGS_CONTENT_ID = "settings:main";
export declare const settingsKind: KindSpec;
