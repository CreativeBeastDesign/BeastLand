import { MOD } from "../../shell/keys.js";
import { type KeyBinding, type KeymapEntry } from "../../shell/keymap.js";
export { MOD };
export type { KeymapEntry };
/** Legend for the default bindings; pass your own table to `describeKeymap` for a custom one. */
export declare const keymap: KeymapEntry[];
type Props = {
    /** Key bindings; defaults to `defaultKeymap`. See `$lib/shell/keymap.ts`. */
    keymap?: KeyBinding[];
};
declare const TilingWorkspace: import("svelte").Component<Props, {}, "">;
type TilingWorkspace = ReturnType<typeof TilingWorkspace>;
export default TilingWorkspace;
