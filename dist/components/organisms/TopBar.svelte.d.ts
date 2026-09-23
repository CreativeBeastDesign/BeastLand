import type { Snippet } from "svelte";
type Props = {
    left?: Snippet;
    activeWorkspace?: string;
    onworkspace?: (id: string) => void;
    right?: Snippet;
};
declare const TopBar: import("svelte").Component<Props, {}, "">;
type TopBar = ReturnType<typeof TopBar>;
export default TopBar;
