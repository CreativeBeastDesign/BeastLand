/**
 * Command registry
 *
 * Routes and features extend the terminal by registering extra commands for
 * the time they are mounted. The Terminal organism reads `registry.commands`
 * reactively when no explicit `commands` prop is given.
 *
 *   $effect(() => registry.register(tilingCommands));   // returns the unregister fn
 */

import { untrack } from "svelte";
import { shellCommands, type Command } from "./commands.js";

function createRegistry() {
  let extensions = $state<Command[][]>([]);

  return {
    get commands(): Command[] {
      return [...shellCommands, ...extensions.flat()];
    },

    /** Register a command group; call the returned function to remove it again. */
    register(commands: Command[]): () => void {
      // Callers register from inside `$effect`; untrack so the effect does not
      // subscribe to the very state it writes and loop.
      untrack(() => {
        extensions = [...extensions, commands];
      });
      return () => {
        untrack(() => {
          extensions = extensions.filter((group) => group !== commands);
        });
      };
    },
  };
}

export const registry = createRegistry();
