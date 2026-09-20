/**
 * The one-line glue between UI-kit callbacks and the shell. UI components
 * (RecordView, Menu, Breadcrumb…) take `oncommand` callbacks so the kit does
 * not depend on the shell; app-layer components pass these.
 */

import { shell } from "./state.svelte.js";

/** For `RecordView`-style `(command, mode)` callbacks. */
export function commandBridge(command: string, mode: "run" | "insert" = "run") {
  if (mode === "insert") shell.insert(command);
  else shell.run(command);
}

/** For `(command) => void` callbacks (Menu, Breadcrumb). */
export function runBridge(command: string) {
  shell.run(command);
}
