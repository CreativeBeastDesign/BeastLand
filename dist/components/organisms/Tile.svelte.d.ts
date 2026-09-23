import type { Snippet } from "svelte";
import type { Container, ContainerId } from "../../tiling/types.js";
import type { ShortId as ShortIdParts } from "../../tiling/ids.js";
type Props = {
    container: Container;
    selected?: boolean;
    /** e.g. record display name for the title bar, used when the container has no explicit title. */
    label?: string;
    /** Every known id, for the header's short id. Ignored when `short` is given. */
    allIds?: string[];
    /** Precomputed short id (`kinds.shortIdOf`) — cheaper than scanning `allIds` per tile. */
    short?: ShortIdParts;
    children: Snippet;
    onselect?: (id: ContainerId) => void;
    /** Highlighted as the target of the line currently being typed in the terminal. */
    preview?: boolean;
    /** Short status badge shown while `preview` is active, e.g. `w 2 → 4`. */
    hint?: string;
    /** The previewed action would be refused (overlap, edge…). */
    invalid?: boolean;
};
declare const Tile: import("svelte").Component<Props, {}, "">;
type Tile = ReturnType<typeof Tile>;
export default Tile;
