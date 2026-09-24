import type { Snippet } from "svelte";
type Props = {
    title: string;
    active?: boolean;
    subtitle?: string;
    glass?: boolean;
    children: Snippet;
    actions?: Snippet;
};
declare const Window: import("svelte").Component<Props, {}, "">;
type Window = ReturnType<typeof Window>;
export default Window;
