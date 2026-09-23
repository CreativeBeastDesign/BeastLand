import type { Snippet } from "svelte";
import type { ComponentProps } from "svelte";
import Dock from "../organisms/Dock.svelte";
type Props = {
    wallpaper?: string;
    activeWorkspace?: string;
    onworkspace?: (id: string) => void;
    dockItems?: ComponentProps<typeof Dock>["items"];
    activeDockItem?: string;
    ondockselect?: (id: string) => void;
    topbarRight?: Snippet;
    children: Snippet;
};
declare const DesktopShell: import("svelte").Component<Props, {}, "">;
type DesktopShell = ReturnType<typeof DesktopShell>;
export default DesktopShell;
