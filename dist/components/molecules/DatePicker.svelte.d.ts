type Size = "sm" | "md";
type Props = {
    value?: string;
    min?: string;
    max?: string;
    placeholder?: string;
    size?: Size;
    invalid?: boolean;
    disabled?: boolean;
    locale?: string;
    weekStart?: 0 | 1;
    /** Accessible name for the typeable field, since it has no visible `<label>` of its own. */
    ariaLabel?: string;
    onchange?: (iso: string) => void;
};
declare const DatePicker: import("svelte").Component<Props, {}, "value">;
type DatePicker = ReturnType<typeof DatePicker>;
export default DatePicker;
