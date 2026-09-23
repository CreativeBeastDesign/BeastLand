import type { Snippet } from "svelte";
type Props = {
    children: Snippet;
};
declare const Kbd: import("svelte").Component<Props, {}, "">;
type Kbd = ReturnType<typeof Kbd>;
export default Kbd;
