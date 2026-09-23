import type { Snippet } from "svelte";
import type { HTMLButtonAttributes } from "svelte/elements";
type Variant = "solid" | "glass" | "ghost" | "accent";
type Size = "sm" | "md" | "lg";
type Props = HTMLButtonAttributes & {
    variant?: Variant;
    size?: Size;
    children?: Snippet;
};
declare const Button: import("svelte").Component<Props, {}, "">;
type Button = ReturnType<typeof Button>;
export default Button;
