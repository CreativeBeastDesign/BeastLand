import type { Snippet } from "svelte";
type TabDatum = {
    id: string;
    label: string;
    badge?: string;
    disabled?: boolean;
};
type Variant = "underline" | "pill";
type Props = {
    tabs: TabDatum[];
    active: string;
    onchange?: (id: string) => void;
    variant?: Variant;
    children?: Snippet<[id: string]>;
};
declare const Tabs: import("svelte").Component<Props, {}, "">;
type Tabs = ReturnType<typeof Tabs>;
export default Tabs;
