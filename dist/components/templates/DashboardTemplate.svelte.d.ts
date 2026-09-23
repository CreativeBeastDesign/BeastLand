import type { Snippet } from "svelte";
import Sidebar from "../organisms/Sidebar.svelte";
import type { ComponentProps } from "svelte";
type Props = {
    sidebarItems?: ComponentProps<typeof Sidebar>["items"];
    activeSidebarItem?: string;
    onsidebar?: (id: string) => void;
    header?: Snippet;
    footer?: Snippet;
    topbarRight?: Snippet;
    children: Snippet;
};
declare const DashboardTemplate: import("svelte").Component<Props, {}, "">;
type DashboardTemplate = ReturnType<typeof DashboardTemplate>;
export default DashboardTemplate;
