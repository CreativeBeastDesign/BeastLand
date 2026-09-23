import type { Snippet } from "svelte";
type Side = "right" | "left" | "bottom";
type Props = {
    open: boolean;
    onclose: () => void;
    title: string;
    side?: Side;
    size?: string;
    children: Snippet;
    footer?: Snippet;
};
declare const Drawer: import("svelte").Component<Props, {}, "">;
type Drawer = ReturnType<typeof Drawer>;
export default Drawer;
