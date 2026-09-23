type Option = {
    value: string;
    label: string;
    description?: string;
    disabled?: boolean;
};
type Size = "sm" | "md" | "lg";
type Props = {
    value?: string;
    options: Option[];
    placeholder?: string;
    size?: Size;
    invalid?: boolean;
    disabled?: boolean;
    onchange?: (value: string) => void;
};
declare const Select: import("svelte").Component<Props, {}, "value">;
type Select = ReturnType<typeof Select>;
export default Select;
