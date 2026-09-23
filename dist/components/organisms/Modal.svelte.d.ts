import type { Snippet } from "svelte";
type Props = {
    title: string;
    open: boolean;
    onclose?: () => void;
    closeOnBackdrop?: boolean;
    children: Snippet;
    footer?: Snippet;
};
declare const Modal: import("svelte").Component<Props, {}, "">;
type Modal = ReturnType<typeof Modal>;
export default Modal;
