import type { Snippet } from "svelte";
type Placement = "top" | "bottom" | "left" | "right";
type Props = {
    text: string;
    placement?: Placement;
    delay?: number;
    children: Snippet;
};
declare const Tooltip: import("svelte").Component<Props, {}, "">;
type Tooltip = ReturnType<typeof Tooltip>;
export default Tooltip;
