/**
 * Short ids, Jujutsu-style.
 *
 * A record id like `customer:xpoakahew4rsp2stfg0y` is referenced in the
 * terminal as `#xp` — the shortest prefix of the bare id that is unique across
 * every known record, with a minimum length so ids stay stable when the next
 * record is created. The UI renders the unique part bold and the remainder
 * dimmed, exactly like `jj log`.
 */

export const SHORT_ID_MIN = 2;
export const SHORT_ID_DISPLAY = 8;

/**
 * Strip the table/namespace prefix and a short type tag: `customer:xpo…` →
 * `xpo…`, `document:doc_fab9…` → `fab9…`, `invoice:inv_4c…` → `4c…`. A tag
 * is 2–5 lowercase letters before an underscore; it is only stripped when
 * something is left afterwards, so `note:ab_` stays `ab_`.
 */
export function bareId(id: string): string {
  const afterTable = id.includes(":") ? id.slice(id.indexOf(":") + 1) : id;
  const stripped = afterTable.replace(/^[a-z]{2,5}_/, "");
  return stripped.length > 0 ? stripped : afterTable;
}

/** Length of the shortest prefix of `bare` that no other id in `all` shares. */
export function uniquePrefixLength(bare: string, all: string[]): number {
  let len = SHORT_ID_MIN;
  for (; len < bare.length; len++) {
    const prefix = bare.slice(0, len);
    const clash = all.some((other) => other !== bare && other.startsWith(prefix));
    if (!clash) return len;
  }
  return bare.length;
}

export type ShortId = {
  /** Full id including table prefix. */
  id: string;
  /** The unique prefix — what the user types after `#`. */
  short: string;
  /** Dimmed tail shown after `short`, cut to SHORT_ID_DISPLAY total chars. */
  rest: string;
};

/** Longest common prefix length of two strings. */
function lcp(a: string, b: string): number {
  const max = Math.min(a.length, b.length);
  let i = 0;
  while (i < max && a[i] === b[i]) i++;
  return i;
}

/** The short id of one bare string, given the longest prefix it shares with any *other* bare id. */
function fromShared(id: string, bare: string, shared: number): ShortId {
  const len = Math.min(Math.max(SHORT_ID_MIN, shared + 1), bare.length);
  return { id, short: bare.slice(0, len), rest: bare.slice(len, Math.max(len, SHORT_ID_DISPLAY)) };
}

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
export function shortIdIndex(all: readonly string[]): Map<string, ShortId> {
  const entries = all.map((id) => ({ id, bare: bareId(id) }));
  const order = entries.map((_, i) => i).sort((a, b) => (entries[a].bare < entries[b].bare ? -1 : entries[a].bare > entries[b].bare ? 1 : 0));

  const index = new Map<string, ShortId>();
  for (let i = 0; i < order.length; i++) {
    const { id, bare } = entries[order[i]];
    let shared = 0;
    // Nearest neighbour with a *different* bare id, in each direction.
    for (let j = i - 1; j >= 0; j--) {
      const other = entries[order[j]].bare;
      if (other === bare) continue;
      shared = Math.max(shared, lcp(bare, other));
      break;
    }
    for (let j = i + 1; j < order.length; j++) {
      const other = entries[order[j]].bare;
      if (other === bare) continue;
      shared = Math.max(shared, lcp(bare, other));
      break;
    }
    index.set(id, fromShared(id, bare, shared));
  }
  return index;
}

/** Compute the short id of `id` relative to every id in `all` (full ids). */
export function shortId(id: string, all: string[]): ShortId {
  const bare = bareId(id);
  const bareAll = all.map(bareId);
  const len = uniquePrefixLength(bare, bareAll);
  const short = bare.slice(0, len);
  const rest = bare.slice(len, Math.max(len, SHORT_ID_DISPLAY));
  return { id, short, rest };
}

/**
 * Resolve user input (`xp`, `#xp`, `xpoakahew`, or the full id) to exactly one
 * id from `all`. Returns `{ id }`, `{ ambiguous: [...] }` or `null` when
 * nothing matches.
 */
export function resolveId(
  input: string,
  all: string[],
): { id: string } | { ambiguous: string[] } | null {
  const needle = bareId(input.replace(/^#/, ""));
  if (!needle) return null;

  const exact = all.find((id) => id === input || bareId(id) === needle);
  if (exact) return { id: exact };

  const matches = all.filter((id) => bareId(id).startsWith(needle));
  if (matches.length === 1) return { id: matches[0] };
  if (matches.length > 1) return { ambiguous: matches };
  return null;
}
