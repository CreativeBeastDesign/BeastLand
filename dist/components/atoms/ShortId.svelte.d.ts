import { type ShortId as ShortIdParts } from "../../tiling/ids.js";
type Props = {
    id: string;
    /** Every known id, to derive the shortest unique prefix from. */
    all?: string[];
    /**
     * A precomputed short id (`kinds.shortIdOf(id)`), which skips the scan
     * over `all` — what callers with many records should pass.
     */
    short?: ShortIdParts;
    prefix?: string;
};
declare const ShortId: import("svelte").Component<Props, {}, "">;
type ShortId = ReturnType<typeof ShortId>;
export default ShortId;
