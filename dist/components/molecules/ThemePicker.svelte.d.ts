type ThemeOption = {
    id: string;
    label: string;
    mode?: "dark" | "light";
};
type Props = {
    themes: ThemeOption[];
    value: string;
    onchange?: (id: string) => void;
};
declare const ThemePicker: import("svelte").Component<Props, {}, "">;
type ThemePicker = ReturnType<typeof ThemePicker>;
export default ThemePicker;
