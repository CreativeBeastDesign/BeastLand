/**
 * Command registry
 *
 * Routes and features extend the terminal by registering extra commands for
 * the time they are mounted. The Terminal organism reads `registry.commands`
 * reactively when no explicit `commands` prop is given.
 *
 *   $effect(() => registry.register(tilingCommands));   // returns the unregister fn
 */
import { type Command } from "./commands.js";
export declare const registry: {
    readonly commands: Command[];
    /** Register a command group; call the returned function to remove it again. */
    register(commands: Command[]): () => void;
};
