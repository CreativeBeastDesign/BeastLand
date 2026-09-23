import type { HTMLAttributes } from "svelte/elements";
type Size = "sm" | "md";
type Props = Omit<HTMLAttributes<HTMLButtonElement>, "onclick"> & {
    checked?: boolean;
    label?: string;
    description?: string;
    disabled?: boolean;
    size?: Size;
};
declare const Switch: import("svelte").Component<Props, {}, "checked">;
type Switch = ReturnType<typeof Switch>;
export default Switch;
