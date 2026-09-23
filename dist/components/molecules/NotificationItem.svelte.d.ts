import type { Snippet } from "svelte";
type Tone = "info" | "success" | "warning" | "danger";
type Props = {
    title: string;
    message?: string;
    tone?: Tone;
    timestamp?: string;
    icon?: Snippet;
    ondismiss?: () => void;
};
declare const NotificationItem: import("svelte").Component<Props, {}, "">;
type NotificationItem = ReturnType<typeof NotificationItem>;
export default NotificationItem;
