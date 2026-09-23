import type { Snippet } from "svelte";
type BreadcrumbItem = {
    label: string;
    href?: string;
    command?: string;
    icon?: Snippet;
};
type Props = {
    items: BreadcrumbItem[];
    separator?: string;
    maxItems?: number;
    /** Receives an item's `command` when clicked (the app wires it to `shell.run`). */
    oncommand?: (command: string) => void;
};
declare const Breadcrumb: import("svelte").Component<Props, {}, "">;
type Breadcrumb = ReturnType<typeof Breadcrumb>;
export default Breadcrumb;
