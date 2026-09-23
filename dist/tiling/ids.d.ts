/**
 * Short ids, Jujutsu-style.
 *
 * A record id like `customer:xpoakahew4rsp2stfg0y` is referenced in the
 * terminal as `#xp` — the shortest prefix of the bare id that is unique across
 * every known record, with a minimum length so ids stay stable when the next
 * record is created. The UI renders the unique part bold and the remainder
 * dimmed, exactly like `jj log`.
 */
export declare const SHORT_ID_MIN = 2;
export declare const SHORT_ID_DISPLAY = 8;
/**
 * Strip the table/namespace prefix and a short type tag: `customer:xpo…` →
 * `xpo…`, `document:doc_fab9…` → `fab9…`, `invoice:inv_4c…` → `4c…`. A tag
 * is 2–5 lowercase letters before an underscore; it is only stripped when
 * something is left afterwards, so `note:ab_` stays `ab_`.
 */
export declare function bareId(id: string): string;
/** Length of the shortest prefix of `bare` that no other id in `all` shares. */
export declare function uniquePrefixLength(bare: string, all: string[]): number;
export type ShortId = {
    /** Full id including table prefix. */
    id: string;
    /** The unique prefix — what the user types after `#`. */
    short: string;
    /** Dimmed tail shown after `short`, cut to SHORT_ID_DISPLAY total chars. */
    rest: string;
};
/**
 * Short ids for a whole id set in one pass.
 *
 * `shortId` rescans every other id, so rendering a list costs one O(n) scan
 * per row — 2000 records took ~270ms per listing, and completion redid it on
 * every keystroke. Sorting makes the longest prefix an id shares with any
 * other a comparison with its neighbours, so the whole set is O(n log n).
 * Equal bare ids are deliberately not treated as clashes, matching
 * `uniquePrefixLength` (they collide, and `resolveId` reports them ambiguous).
 */
export declare function shortIdIndex(all: readonly string[]): Map<string, ShortId>;
/** Compute the short id of `id` relative to every id in `all` (full ids). */
export declare function shortId(id: string, all: string[]): ShortId;
/**
 * Resolve user input (`xp`, `#xp`, `xpoakahew`, or the full id) to exactly one
 * id from `all`. Returns `{ id }`, `{ ambiguous: [...] }` or `null` when
 * nothing matches.
 */
export declare function resolveId(input: string, all: string[]): {
    id: string;
} | {
    ambiguous: string[];
} | null;
