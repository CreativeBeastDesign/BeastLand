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
};
declare const RecordView: import("svelte").Component<Props, {}, "">;
type RecordView = ReturnType<typeof RecordView>;
export default RecordView;
