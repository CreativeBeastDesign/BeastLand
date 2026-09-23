import type { Snippet } from "svelte";
type Props = {
    title: string;
    description?: string;
    icon?: Snippet;
    actions?: Snippet;
    compact?: boolean;
};
declare const EmptyState: import("svelte").Component<Props, {}, "">;
type EmptyState = ReturnType<typeof EmptyState>;
export default EmptyState;
