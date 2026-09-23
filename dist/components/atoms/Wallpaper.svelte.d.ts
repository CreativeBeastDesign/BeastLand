import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
type Variant = "auto" | "dark" | "light";
type Props = HTMLAttributes<HTMLDivElement> & {
    src?: string;
    variant?: Variant;
    overlay?: boolean;
    dim?: number;
    children?: Snippet;
};
declare const Wallpaper: import("svelte").Component<Props, {}, "">;
type Wallpaper = ReturnType<typeof Wallpaper>;
export default Wallpaper;
