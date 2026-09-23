import type { Snippet } from "svelte";
type Axis = "y" | "x" | "both";
type Props = {
    axis?: Axis;
    children: Snippet;
    class?: string;
};
declare const ScrollArea: import("svelte").Component<Props, {}, "">;
type ScrollArea = ReturnType<typeof ScrollArea>;
export default ScrollArea;
