import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
type Props = HTMLAttributes<HTMLDivElement> & {
    label: string;
    value?: string;
    icon?: Snippet;
    children?: Snippet;
};
declare const StatusItem: import("svelte").Component<Props, {}, "">;
type StatusItem = ReturnType<typeof StatusItem>;
export default StatusItem;
