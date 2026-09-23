type Props = {
    value?: string;
    placeholder?: string;
    shortcut?: string;
    onsearch?: (value: string) => void;
};
declare const SearchField: import("svelte").Component<Props, {}, "">;
type SearchField = ReturnType<typeof SearchField>;
export default SearchField;
