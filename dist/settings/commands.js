/**
 * Settings commands
 *
 * One command, `settings` (alias `prefs`): opens the settings tile (spawning
 * it on first use, selecting it if it's already open — the same `open`
 * every other singleton tile kind uses, see `worklogCommands`'s `log`), and
 * optionally selects a section by id.
 */
import { workspace } from "../tiling/workspace.svelte.js";
import { settings } from "./registry.svelte.js";
import { SETTINGS_CONTENT_ID } from "./kind.js";
export const settingsCommands = [
    {
        name: "settings",
        aliases: ["prefs"],
        description: "Open the settings tile",
        usage: "settings [section]",
        complete: (args) => {
            if (args.length !== 1)
                return [];
            return settings.all.map((s) => ({ value: s.id, label: s.label, kind: "value" }));
        },
        run: (args, ctx) => {
            const [section] = args;
            workspace.open("settings", SETTINGS_CONTENT_ID);
            if (!section)
                return;
            if (!settings.select(section)) {
                ctx.print(`no such settings section: ${section}`, "error");
            }
        },
    },
];
