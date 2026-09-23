/**
 * Shell commands
 *
 * The command registry powering the Terminal organism. Commands read/write
 * the shared `shell` store so any surface (terminal, top bar, showcase) stays
 * in sync with what's typed here.
 */
import { shell } from "./state.svelte";
import { themes } from "../theme/themes.svelte.js";
import { looks } from "../theme/looks.svelte.js";
import { wallpapers } from "../wallpapers.svelte.js";
import { flag, parseArgs, helpIndexRows, helpRows, helpRowsFor, printHelpRows, } from "./protocol.js";
export * from "./protocol.js";
/**
 * `theme 2` / `wallpaper 2` / `look 2`: a number is the 1-based position in
 * registration order (the same numbering `ws <n>` and the listings use);
 * anything else is taken as an id.
 */
function byNumberOrId(all, arg) {
    if (/^\d+$/.test(arg))
        return all[Number(arg) - 1]?.id ?? arg;
    return arg;
}
/** `  * 2  garden-light — Garden Light` listing line, numbered like `ws`. */
function numbered(index, active, id, label) {
    return `  ${active ? "*" : " "} ${String(index + 1).padStart(2)}  ${id} — ${label}`;
}
export const shellCommands = [
    {
        name: "help",
        description: "List available commands, or show usage for one",
        usage: "help [command] [args…]",
        complete: (args, commands) => {
            if (args.length !== 1)
                return [];
            return commands
                .filter((c) => !c.match)
                .flatMap((c) => [
                { value: c.name, description: c.description, kind: "command" },
                ...(c.aliases ?? []).map((a) => ({
                    value: a,
                    label: c.name,
                    description: c.description,
                    kind: "command",
                })),
            ]);
        },
        run: (args, ctx) => {
            const [name, ...rest] = args;
            if (!name) {
                printHelpRows(helpIndexRows(ctx.commands), ctx);
                return;
            }
            const command = ctx.commands.find((c) => c.name === name || c.aliases?.includes(name));
            if (!command) {
                ctx.print(`no such command: ${name}`, "error");
                return;
            }
            // `help <command>` alone keeps the full static manual (declared
            // subcommands/flags, aliases combined); `help <command> <args…>` is
            // context-specific — identical to `<command> <args…> -h` — so both
            // ways of asking never disagree.
            printHelpRows(rest.length === 0 ? helpRows(command) : helpRowsFor(command, rest, ctx.commands), ctx);
        },
    },
    {
        name: "clear",
        aliases: ["cls"],
        description: "Clear the terminal output",
        run: (_args, ctx) => {
            ctx.clear();
        },
    },
    {
        name: "theme",
        description: "Show or change the active theme",
        usage: "theme [id|n|next] [--with-wallpaper/-w]",
        flags: [
            {
                name: "with-wallpaper",
                short: "w",
                description: "Also switch to the theme's default wallpaper (`look` does this for a pair)",
            },
        ],
        complete: (args) => {
            if (args.length !== 1)
                return [];
            return [
                ...themes.all.map((t, i) => ({ value: t.id, label: t.label, description: String(i + 1), kind: "value" })),
                { value: "next", description: "Cycle to the next theme", kind: "value" },
            ];
        },
        run: (args, ctx) => {
            const parsed = parseArgs(args);
            const [arg] = parsed.positional;
            const withWallpaper = flag(parsed, "with-wallpaper", "w") !== undefined;
            if (!arg) {
                ctx.print(`current theme: ${shell.theme}`, "output");
                ctx.print("available themes:", "output");
                themes.all.forEach((t, i) => {
                    ctx.print(numbered(i, t.id === shell.theme, t.id, t.label), "output");
                });
                return;
            }
            if (arg === "next") {
                shell.nextTheme();
                ctx.print(`theme set to ${shell.theme}`, "output");
                return;
            }
            if (!shell.setTheme(byNumberOrId(themes.all, arg), { withWallpaper })) {
                ctx.print(`unknown theme: ${arg}`, "error");
                return;
            }
            ctx.print(`theme set to ${shell.theme}`, "output");
        },
    },
    {
        name: "wallpaper",
        aliases: ["wp"],
        description: "Show or change the active wallpaper",
        usage: "wallpaper [id|n|next]",
        complete: (args) => {
            if (args.length !== 1)
                return [];
            return [
                ...wallpapers.all.map((w, i) => ({
                    value: w.id,
                    label: w.label,
                    description: `${i + 1}${w.description ? ` · ${w.description}` : ""}`,
                    kind: "value",
                })),
                { value: "next", description: "Cycle to the next wallpaper", kind: "value" },
            ];
        },
        run: (args, ctx) => {
            const [arg] = args;
            if (!arg) {
                if (wallpapers.all.length === 0) {
                    ctx.print("no wallpapers registered", "output");
                    return;
                }
                ctx.print(`current wallpaper: ${shell.wallpaper}`, "output");
                ctx.print("available wallpapers:", "output");
                wallpapers.all.forEach((w, i) => {
                    ctx.print(numbered(i, w.id === shell.wallpaper, w.id, w.label), "output");
                });
                return;
            }
            if (arg === "next") {
                shell.nextWallpaper();
                const meta = shell.wallpaperMeta;
                ctx.print(`wallpaper set to ${meta.label}${meta.description ? ` — ${meta.description}` : ""}`, "output");
                return;
            }
            if (!shell.setWallpaper(byNumberOrId(wallpapers.all, arg))) {
                ctx.print(`unknown wallpaper: ${arg}`, "error");
                return;
            }
            const meta = shell.wallpaperMeta;
            ctx.print(`wallpaper set to ${meta.label}${meta.description ? ` — ${meta.description}` : ""}`, "output");
        },
    },
    {
        name: "look",
        description: "Show or change the active look (a theme + wallpaper pair)",
        usage: "look [list|id|n]",
        subcommands: [{ name: "list", description: "List registered looks" }],
        complete: (args) => {
            if (args.length !== 1)
                return [];
            return [
                { value: "list", description: "List registered looks", kind: "subcommand" },
                ...looks.all.map((l, i) => ({
                    value: l.id,
                    label: l.label,
                    description: `${i + 1}${l.description ? ` · ${l.description}` : ""}`,
                    kind: "value",
                })),
            ];
        },
        run: (args, ctx) => {
            const [arg] = args;
            if (!arg) {
                const current = shell.look;
                if (current) {
                    const l = looks.get(current);
                    ctx.print(`current look: ${l.id} — ${l.label}`, "output");
                }
                else {
                    ctx.print(`current look: custom (${shell.theme} + ${shell.wallpaper || "no wallpaper"})`, "output");
                }
                return;
            }
            if (arg === "list") {
                if (looks.all.length === 0) {
                    ctx.print("no looks registered", "output");
                    return;
                }
                ctx.print("available looks:", "output");
                looks.all.forEach((l, i) => {
                    ctx.print(numbered(i, l.id === shell.look, l.id, l.label), "output");
                });
                return;
            }
            const id = byNumberOrId(looks.all, arg);
            if (!shell.applyLook(id)) {
                ctx.print(`unknown look: ${arg}`, "error");
                return;
            }
            const l = looks.get(id);
            ctx.print(`look set to ${l.id} — ${l.label}`, "output");
        },
    },
    {
        name: "echo",
        description: "Print the given arguments",
        usage: "echo [text...]",
        run: (args, ctx) => {
            ctx.print(args.join(" "), "output");
        },
    },
    {
        name: "about",
        aliases: ["neofetch"],
        description: "Show shell info",
        run: (_args, ctx) => {
            const theme = shell.themeMeta;
            const wallpaper = shell.wallpaperMeta;
            ctx.print("BeastLand shell", "output");
            ctx.print("----------------", "output");
            ctx.print(`theme:      ${theme.label} (${theme.id})`, "output");
            ctx.print(`wallpaper:  ${wallpaper.label} (${wallpaper.id})`, "output");
            ctx.print("svelte 5 · hyprland-inspired", "output");
        },
    },
    {
        name: "time",
        description: "Print the current time",
        run: (_args, ctx) => {
            ctx.print(new Date().toLocaleTimeString(), "output");
        },
    },
];
