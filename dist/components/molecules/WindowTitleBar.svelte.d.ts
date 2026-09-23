import type { Snippet } from "svelte";
type Props = {
    title: string;
    subtitle?: string;
    active?: boolean;
    actions?: Snippet;
    /** Set to give the title an id, e.g. for a dialog's `aria-labelledby`. */
    titleId?: string;
};
declare const WindowTitleBar: import("svelte").Component<Props, {}, "">;
type WindowTitleBar = ReturnType<typeof WindowTitleBar>;
export default WindowTitleBar;
