type Radius = "control" | "pill" | "window";
type Props = {
    width?: string;
    height?: string;
    radius?: Radius;
    lines?: number;
};
declare const Skeleton: import("svelte").Component<Props, {}, "">;
type Skeleton = ReturnType<typeof Skeleton>;
export default Skeleton;
