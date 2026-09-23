import type { Snippet } from "svelte";
type MenuAction = {
    id: string;
    label: string;
    shortcut?: string;
    disabled?: boolean;
    danger?: boolean;
    command?: string;
    onselect?: () => void;
};
type MenuSeparator = {
    separator: true;
};
type MenuItem = MenuAction | MenuSeparator;
type Placement = "bottom-start" | "bottom-end";
type Props = {
    items: MenuItem[];
    open: boolean;
    onclose: () => void;
    anchor: Snippet;
    placement?: Placement;
    /** Receives an item's `command` when selected (the app wires it to `shell.run`). */
    oncommand?: (command: string) => void;
};
declare const Menu: import("svelte").Component<Props, {}, "">;
type Menu = ReturnType<typeof Menu>;
export default Menu;
