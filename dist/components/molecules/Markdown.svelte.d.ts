import type { LineVerdict } from "../../shell/prose.js";
export type HighlightSpan = {
    text: string;
    tone?: string;
};
type Props = {
    source: string;
    /** Activated by a ref click/⇧-click and by a runnable fence line. Absent
     * → refs and fence lines render as plain, inert text. */
    oncommand?: (command: string, mode: "run" | "insert") => void;
    /** Optional syntax highlighter for non-runnable fences. */
    highlight?: (code: string, lang: string | undefined) => HighlightSpan[] | string;
    /** Tighter spacing for tiles. */
    compact?: boolean;
    /**
     * Validate each runnable fence line before it becomes clickable (same
     * hook as `proseSpans`' `validate`). Invalid lines render struck through
     * with their reason and carry no command.
     */
    validateLine?: (line: string) => LineVerdict;
};
declare const Markdown: import("svelte").Component<Props, {}, "">;
type Markdown = ReturnType<typeof Markdown>;
export default Markdown;
