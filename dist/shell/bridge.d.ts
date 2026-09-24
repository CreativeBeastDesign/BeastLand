/**
 * The one-line glue between UI-kit callbacks and the shell. UI components
 * (RecordView, Menu, Breadcrumb…) take `oncommand` callbacks so the kit does
 * not depend on the shell; app-layer components pass these.
 */
/** For `RecordView`-style `(command, mode)` callbacks. */
export declare function commandBridge(command: string, mode?: "run" | "insert"): void;
/** For `(command) => void` callbacks (Menu, Breadcrumb). */
export declare function runBridge(command: string): void;
