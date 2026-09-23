type Size = "sm" | "md" | "lg";
type Tone = "accent" | "secondary" | "neutral";
type Status = "online" | "away" | "busy" | "offline";
type Props = {
    name: string;
    src?: string;
    size?: Size;
    tone?: Tone;
    status?: Status;
};
declare const Avatar: import("svelte").Component<Props, {}, "">;
type Avatar = ReturnType<typeof Avatar>;
export default Avatar;
