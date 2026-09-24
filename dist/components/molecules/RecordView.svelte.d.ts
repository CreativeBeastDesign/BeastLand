/** How a `command` field was activated: click runs it, ⇧-click inserts it into a prompt. */
export type CommandMode = "run" | "insert";
export type RecordField = {
    key: string;
    value: string;
    /** Value may be long; spans both columns in the wide layout. */
    wide?: boolean;
    /** Reads as prose (e.g. a customer name) rather than data — uses the UI font instead of mono. */
    prose?: boolean;
    /** Makes the value a link that runs this terminal line (e.g. `#xp`); ⇧-click inserts it. */
    command?: string;
};
type Props = {
    fields: RecordField[];
    /**
     * Called when a `command` field is activated. The kit does not know the
     * shell; the app passes e.g. `(cmd, mode) => mode === "run" ? shell.run(cmd) : shell.insert(cmd)`.
     * Without it, command fields render as plain text.
     */
    oncommand?: (command: string, mode: CommandMode) => void;
    /**
     * How many key/value pairs may sit side by side on a wide tile: pairs
     * flow row by row, `2` from a 32rem tile, `3` from 52rem (container
     * queries on the tile, so it follows the tile's width, not the window's).
     * `1` keeps the single key/value column. Default 3.
     */
    maxPairs?: 1 | 2 | 3;
};
declare const RecordView: import("svelte").Component<Props, {}, "">;
type RecordView = ReturnType<typeof RecordView>;
export default RecordView;
