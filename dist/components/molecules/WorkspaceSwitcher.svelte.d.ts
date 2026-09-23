type Workspace = {
    id: string;
    label: string;
};
type Props = {
    workspaces?: Workspace[];
    activeId?: string;
    onchange?: (id: string) => void;
    /** `solid` (default): pill on a surface, accent-filled active. `ghost`: bare text, accent-coloured active — for title bars. */
    variant?: "solid" | "ghost";
};
declare const WorkspaceSwitcher: import("svelte").Component<Props, {}, "">;
type WorkspaceSwitcher = ReturnType<typeof WorkspaceSwitcher>;
export default WorkspaceSwitcher;
