import type { HTMLInputAttributes } from "svelte/elements";
type Size = "sm" | "md";
type Props = Omit<HTMLInputAttributes, "type" | "size" | "checked"> & {
    name: string;
    value: string;
    checked?: boolean;
    label?: string;
    description?: string;
    disabled?: boolean;
    size?: Size;
};
declare const Radio: import("svelte").Component<Props, {}, "">;
type Radio = ReturnType<typeof Radio>;
export default Radio;
