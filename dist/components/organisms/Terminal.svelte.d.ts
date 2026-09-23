import { type Snippet } from "svelte";
import { type Command, type LineHandle, type OutputLine, type PrintOptions, type Span } from "../../shell/commands.js";
type Props = {
    title?: string;
    indicators?: Snippet;
    commands?: Command[];
    motd?: string[];
    prompt?: string;
    /** Panel width. */
    width?: string;
    /**
     * Width while the prompt is focused. When set, the panel grows OVER the
     * workspace (no reflow) and shrinks back 250ms after blur. Defaults to
     * `width`, i.e. static — see Roadmap for the reasoning.
     */
    focusWidth?: string;
    /**
     * Raw line submitted by the user, emitted before dispatch. Useful for
     * logging, or as the sole channel when `dispatch` is false.
     */
    onsubmit?: (line: string) => void;
    /**
     * Whether the terminal itself dispatches lines to `commands`. Set to
     * false to treat the component as a pure line editor and drive it via
     * `onsubmit` + the exported `print`/`clear` instance methods.
     */
    dispatch?: boolean;
    /**
     * When set, ↑/↓ input history persists through `storage` under
     * `beastland:history:<historyKey>` (capped at 200 entries) and reloads
     * whenever the key changes — e.g. `historyKey={workspace.activeId}` for
     * a history per workspace. Without it, history stays in memory only.
     */
    historyKey?: string;
    /**
     * Rendered in the title bar, right of the title: the shell's status line.
     * The app passes what belongs there (a workspace switcher, service
     * status dots); the Terminal itself knows nothing about workspaces.
     */
    header?: Snippet;
    /**
     * How many lines the prompt may grow to before it scrolls instead.
     * The field starts at one line and grows with the command; past this
     * many it keeps the caret in view and scrolls internally.
     */
    maxInputLines?: number;
    /**
     * How many blocks the transcript keeps. Oldest are dropped past this —
     * a shell that runs for days would otherwise grow without bound (and
     * `ctx.blocks` with it). Set 0 for no cap.
     */
    maxBlocks?: number;
};
declare const Terminal: import("svelte").Component<Props, {
    print: (text: string | Span[], kind?: OutputLine["kind"], opts?: PrintOptions) => LineHandle;
    clear: () => void;
}, "">;
type Terminal = ReturnType<typeof Terminal>;
export default Terminal;
