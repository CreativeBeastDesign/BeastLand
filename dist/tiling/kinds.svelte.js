/**
 * Kind registry
 *
 * A *kind* is a type of content a container can show (customer, document,
 * work log…). The workspace itself knows nothing about records; each slice
 * registers its kinds while mounted:
 *
 *   $effect(() => kinds.register(customerKind));
 *
 * The registry answers the three questions the workspace and the tiles ask:
 * how big a new container should be, what to call a record, and whether it
 * still exists — plus which component renders it.
 */
import { untrack } from "svelte";
import { DEFAULT_SIZE } from "./types.js";
import { bareId, shortId, shortIdIndex } from "./ids.js";
function createKinds() {
    let specs = $state({});
    // Every registered record, once per change: its kind, its bare id (for
    // `#id` resolution) and its short id. Rebuilt only when a kind's id array
    // changes, instead of rescanning every id per row and per keystroke.
    const records = $derived.by(() => {
        const entries = Object.values(specs).flatMap((spec) => (spec.ids?.() ?? []).map((id) => ({ id, kind: spec.kind, bare: bareId(id) })));
        return { entries, shorts: shortIdIndex(entries.map((e) => e.id)) };
    });
    return {
        get all() {
            return Object.values(specs);
        },
        get(kind) {
            return specs[kind];
        },
        sizeOf(kind) {
            return specs[kind]?.size ?? DEFAULT_SIZE;
        },
        labelOf(kind, contentId) {
            return specs[kind]?.label(contentId) ?? contentId;
        },
        /** Every `#`-addressable id across all registered kinds. */
        /** Short ids of every registered record, by full id. */
        get shortIds() {
            return records.shorts;
        },
        /** The short id of one record — from the cached index, or computed for an unknown id. */
        shortIdOf(id) {
            return records.shorts.get(id) ?? shortId(id, this.allIds);
        },
        get allIds() {
            return Object.values(specs).flatMap((s) => s.ids?.() ?? []);
        },
        /** Resolve `#xp`-style input to a record of whichever kind owns it. */
        /**
         * Resolve `#xp` (or a full id) to one record. Runs against the cached
         * entries — `resolveId`'s own scan recomputes `bareId` for every id, and
         * this runs on every keystroke (completion and previews).
         */
        resolve(input) {
            const needle = bareId(input.replace(/^#/, ""));
            if (!needle)
                return null;
            const { entries } = records;
            const exact = entries.find((e) => e.id === input || e.bare === needle);
            if (exact)
                return { kind: exact.kind, id: exact.id };
            const matches = entries.filter((e) => e.bare.startsWith(needle));
            if (matches.length === 1)
                return { kind: matches[0].kind, id: matches[0].id };
            if (matches.length > 1)
                return { ambiguous: matches.map((m) => m.id) };
            return null;
        },
        /**
         * Unknown kinds are kept (their slice may not be mounted yet); a
         * registered kind that reports `ready() === false` is kept the same way.
         */
        exists(kind, contentId) {
            const spec = specs[kind];
            if (!spec)
                return true;
            if (spec.ready && !spec.ready())
                return true;
            return spec.exists(contentId);
        },
        /** Register a kind; call the returned function to remove it again. */
        register(spec) {
            untrack(() => {
                specs = { ...specs, [spec.kind]: spec };
            });
            return () => {
                untrack(() => {
                    if (specs[spec.kind] === spec) {
                        const next = { ...specs };
                        delete next[spec.kind];
                        specs = next;
                    }
                });
            };
        },
    };
}
export const kinds = createKinds();
