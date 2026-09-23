import type { HTMLInputAttributes } from "svelte/elements";
type Size = "sm" | "md" | "lg";
type Props = Omit<HTMLInputAttributes, "size" | "value"> & {
    size?: Size;
    invalid?: boolean;
    /** Bindable: `<Input bind:value={name} />`. */
    value?: string;
};
declare const Input: import("svelte").Component<Props, {}, "value">;
type Input = ReturnType<typeof Input>;
export default Input;
