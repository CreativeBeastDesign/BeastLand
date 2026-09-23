import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";
type Props = HTMLAttributes<HTMLSpanElement> & {
    tone?: Tone;
    dot?: boolean;
    children?: Snippet;
};
declare const Badge: import("svelte").Component<Props, {}, "">;
type Badge = ReturnType<typeof Badge>;
export default Badge;
