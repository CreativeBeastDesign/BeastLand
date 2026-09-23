type LookOption = {
    id: string;
    label: string;
    description?: string;
};
type Props = {
    looks: LookOption[];
    value: string | null;
    onchange?: (id: string) => void;
};
declare const LookPicker: import("svelte").Component<Props, {}, "">;
type LookPicker = ReturnType<typeof LookPicker>;
export default LookPicker;
