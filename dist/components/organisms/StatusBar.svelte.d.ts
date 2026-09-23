import type { Snippet } from "svelte";
type Props = {
    left?: Snippet;
    center?: Snippet;
    right?: Snippet;
    fixed?: boolean;
};
declare const StatusBar: import("svelte").Component<Props, {}, "">;
type StatusBar = ReturnType<typeof StatusBar>;
export default StatusBar;
