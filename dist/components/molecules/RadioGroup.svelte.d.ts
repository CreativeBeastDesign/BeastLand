type Option = {
    value: string;
    label: string;
    description?: string;
    disabled?: boolean;
};
type Orientation = "vertical" | "horizontal";
type Props = {
    name: string;
    value?: string;
    options: Option[];
    orientation?: Orientation;
    legend?: string;
};
declare const RadioGroup: import("svelte").Component<Props, {}, "value">;
type RadioGroup = ReturnType<typeof RadioGroup>;
export default RadioGroup;
