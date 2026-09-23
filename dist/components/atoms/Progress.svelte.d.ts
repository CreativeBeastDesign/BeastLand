type Tone = "accent" | "secondary" | "success" | "warning" | "danger";
type Size = "sm" | "md";
type Props = {
    value?: number;
    label?: string;
    size?: Size;
    tone?: Tone;
};
declare const Progress: import("svelte").Component<Props, {}, "">;
type Progress = ReturnType<typeof Progress>;
export default Progress;
