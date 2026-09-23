import type { HTMLTextareaAttributes } from "svelte/elements";
type Size = "sm" | "md" | "lg";
type Props = Omit<HTMLTextareaAttributes, "size"> & {
    value?: string;
    size?: Size;
    invalid?: boolean;
    autoResize?: boolean;
    mono?: boolean;
};
declare const Textarea: import("svelte").Component<Props, {}, "value">;
type Textarea = ReturnType<typeof Textarea>;
export default Textarea;
