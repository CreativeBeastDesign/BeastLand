/**
 * Toast store
 *
 * A single rune-backed store for transient chrome notifications ("toasts"),
 * shared between whatever pushes them (commands, async work, showcase demos)
 * and `ToastStack`, which renders `toasts.items`.
 *
 * Import it as `import { toasts, notify } from "./toasts.svelte";`.
 */
export type ToastTone = "info" | "success" | "warning" | "danger";
export type ToastAction = {
    label: string;
    command?: string;
    onclick?: () => void;
};
export type Toast = {
    id: string;
    title: string;
    message?: string;
    tone: ToastTone;
    /** ms until auto-dismiss; 0 = sticky (stays until dismissed). */
    timeout: number;
    createdAt: number;
    action?: ToastAction;
};
export type ToastInput = Omit<Toast, "id" | "createdAt" | "timeout" | "tone"> & {
    tone?: ToastTone;
    timeout?: number;
};
export declare const toasts: {
    readonly items: Toast[];
    push: (input: ToastInput) => string;
    dismiss: (id: string) => void;
    pause: (id: string) => void;
    resume: (id: string) => void;
    clear: () => void;
};
/** Convenience alias for `toasts.push`. */
export declare function notify(input: ToastInput): string;
