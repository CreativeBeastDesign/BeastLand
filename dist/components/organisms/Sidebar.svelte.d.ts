import type { Snippet } from "svelte";
type SidebarItem = {
    id: string;
    label: string;
    icon?: Snippet;
    badge?: string;
};
type Props = {
    items?: SidebarItem[];
    activeId?: string;
    onselect?: (id: string) => void;
    header?: Snippet;
    footer?: Snippet;
    children?: Snippet;
};
declare const Sidebar: import("svelte").Component<Props, {}, "">;
type Sidebar = ReturnType<typeof Sidebar>;
export default Sidebar;
