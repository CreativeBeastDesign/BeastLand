/** `thumb` keeps a picker from downloading every full-size wallpaper. */
type WallpaperOption = {
    id: string;
    label: string;
    src: string;
    thumb?: string;
};
type Props = {
    wallpapers: WallpaperOption[];
    value: string;
    onchange?: (id: string) => void;
};
declare const WallpaperPicker: import("svelte").Component<Props, {}, "">;
type WallpaperPicker = ReturnType<typeof WallpaperPicker>;
export default WallpaperPicker;
