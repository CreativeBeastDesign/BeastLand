import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
type Radius = "none" | "control" | "window" | "popup";
type Props = HTMLAttributes<HTMLDivElement> & {
    glass?: boolean;
    active?: boolean;
    radius?: Radius;
    children: Snippet;
};
declare const Surface: import("svelte").Component<Props, {}, "">;
type Surface = ReturnType<typeof Surface>;
export default Surface;
