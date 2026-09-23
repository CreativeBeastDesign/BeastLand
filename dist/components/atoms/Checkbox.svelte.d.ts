import type { HTMLInputAttributes } from "svelte/elements";
type Size = "sm" | "md";
type Props = Omit<HTMLInputAttributes, "size" | "type" | "checked"> & {
    checked?: boolean;
    indeterminate?: boolean;
    label?: string;
    description?: string;
    disabled?: boolean;
    size?: Size;
};
declare const Checkbox: import("svelte").Component<Props, {}, "checked">;
type Checkbox = ReturnType<typeof Checkbox>;
export default Checkbox;
