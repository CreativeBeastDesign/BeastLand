import type { Snippet } from "svelte";
type DockItem = {
    id: string;
    label: string;
    icon?: Snippet;
};
type Props = {
    items?: DockItem[];
    activeId?: string;
    onselect?: (id: string) => void;
    fixed?: boolean;
    children?: Snippet;
};
declare const Dock: import("svelte").Component<Props, {}, "">;
type Dock = ReturnType<typeof Dock>;
export default Dock;
