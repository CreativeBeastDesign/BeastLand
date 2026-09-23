import type { Snippet } from "svelte";
type SettingRow = {
    id: string;
    label: string;
    description?: string;
};
type Props = {
    title?: string;
    sections?: {
        id: string;
        label: string;
    }[];
    activeSection?: string;
    onsection?: (id: string) => void;
    rows?: SettingRow[];
    children?: Snippet;
};
declare const SettingsPane: import("svelte").Component<Props, {}, "">;
type SettingsPane = ReturnType<typeof SettingsPane>;
export default SettingsPane;
