import type { Snippet } from "svelte";
import type { HTMLButtonAttributes } from "svelte/elements";
type Size = "sm" | "md" | "lg";
type Props = HTMLButtonAttributes & {
    label: string;
    size?: Size;
    active?: boolean;
    children?: Snippet;
};
declare const IconButton: import("svelte").Component<Props, {}, "">;
type IconButton = ReturnType<typeof IconButton>;
export default IconButton;
