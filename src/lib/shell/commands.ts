/**
 * Shell commands
 *
 * The command registry powering the Terminal organism. Commands read/write
 * the shared `shell` store so any surface (terminal, top bar, showcase) stays
 * in sync with what's typed here.
 */

import { shell } from "$lib/shell/state.svelte";
import { themes } from "$lib/theme/themes.svelte.js";
import { looks } from "$lib/theme/looks.svelte.js";
import { wallpapers } from "$lib/wallpapers.svelte.js";
import { flag, parseArgs, type Command, type CommandContext, type FlagSpec, type Suggestion } from "./protocol.js";

export * from "./protocol.js";

function padName(command: Command): string {
  const label = [command.name, ...(command.aliases ?? [])].join(", ");
  return label;
}

/**
 * Two-column line: `name` in the key tone padded to `width`, then `text`.
 * The hanging indent makes wrapped descriptions continue under themselves.
 */
function printColumns(ctx: CommandContext, name: string, text: string, width: number, indent = 2) {
  const gap = 2;
  ctx.print(
    [
      { text: " ".repeat(indent) },
      { text: name.padEnd(width), tone: "key" },
      { text: " ".repeat(gap) + text },
    ],
    "output",
    { hang: indent + width + gap },
  );
}

/** `--width, -w <value>` — the left column of a flag help line. */
function flagLabel(f: FlagSpec): string {
  const names = [`--${f.name}`, ...(f.short ? [`-${f.short}`] : [])].join(", ");
  return f.takesValue ? `${names} <value>` : names;
}

/** Print one `flags:` block, indented, columns aligned. */
function printFlags(ctx: CommandContext, flags: FlagSpec[], indent: number) {
  if (flags.length === 0) return;
  const labels = flags.map(flagLabel);
  const width = Math.max(...labels.map((l) => l.length));
  flags.forEach((f, i) => printColumns(ctx, labels[i], f.description, width, indent));
}

/** `help <command>`: usage, description, subcommands (with their own flags), then flags. */
function printCommandHelp(command: Command, ctx: CommandContext) {
  ctx.print(`usage: ${command.usage ?? command.name}`, "output");
  ctx.print(command.description, "output");

  if (command.subcommands && command.subcommands.length > 0) {
    ctx.print("", "output");
    ctx.print("subcommands:", "output");
    const labels = command.subcommands.map((s) => [s.name, ...(s.aliases ?? [])].join(", "));
    const width = Math.max(...labels.map((l) => l.length));
    command.subcommands.forEach((s, i) => {
      printColumns(ctx, labels[i], s.description, width);
      if (s.flags && s.flags.length > 0) printFlags(ctx, s.flags, 6);
    });
  }

  if (command.flags && command.flags.length > 0) {
    ctx.print("", "output");
    ctx.print("flags:", "output");
    printFlags(ctx, command.flags, 2);
  }
}

/**
 * `theme 2` / `wallpaper 2` / `look 2`: a number is the 1-based position in
 * registration order (the same numbering `ws <n>` and the listings use);
 * anything else is taken as an id.
 */
function byNumberOrId<T extends { id: string }>(all: readonly T[], arg: string): string {
  if (/^\d+$/.test(arg)) return all[Number(arg) - 1]?.id ?? arg;
  return arg;
}

/** `  * 2  garden-light — Garden Light` listing line, numbered like `ws`. */
function numbered(index: number, active: boolean, id: string, label: string): string {
  return `  ${active ? "*" : " "} ${String(index + 1).padStart(2)}  ${id} — ${label}`;
}

export const shellCommands: Command[] = [
  {
    name: "help",
    description: "List available commands, or show usage for one",
    usage: "help [command]",
    complete: (args, commands) => {
      if (args.length !== 1) return [];
      return commands
        .filter((c) => !c.match)
        .flatMap((c) => [
          { value: c.name, description: c.description, kind: "command" as const },
          ...(c.aliases ?? []).map((a) => ({
            value: a,
            label: c.name,
            description: c.description,
            kind: "command" as const,
          })),
        ]);
    },
    run: (args, ctx) => {
      const [name] = args;
      if (!name) {
        const width = Math.max(...ctx.commands.map((c) => padName(c).length));
        ctx.print("commands:", "output");
        for (const command of ctx.commands) printColumns(ctx, padName(command), command.description, width);
        ctx.print("", "output");
        ctx.print("help <command> shows its subcommands and flags", "system");
        return;
      }

      const command = ctx.commands.find((c) => c.name === name || c.aliases?.includes(name));
      if (!command) {
        ctx.print(`no such command: ${name}`, "error");
        return;
      }
      printCommandHelp(command, ctx);
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
      if (args.length !== 1) return [];
      return [
        ...themes.all.map((t, i) => ({ value: t.id, label: t.label, description: String(i + 1), kind: "value" as const })),
        { value: "next", description: "Cycle to the next theme", kind: "value" as const },
      ];
    },
    run: (args, ctx) => {
      const parsed = parseArgs(args);
      const [arg] = parsed.positional;
      const withWallpaper = flag(parsed, "with-wallpaper", "w") !== undefined;

      if (!arg) {
        ctx.print(`current theme: ${shell.theme}`, "output");
        ctx.print("available themes:", "output");
        themes.all.forEach((t, i) => ctx.print(numbered(i, t.id === shell.theme, t.id, t.label), "output"));
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
      if (args.length !== 1) return [];
      return [
        ...wallpapers.all.map((w, i) => ({
          value: w.id,
          label: w.label,
          description: `${i + 1}${w.description ? ` · ${w.description}` : ""}`,
          kind: "value" as const,
        })),
        { value: "next", description: "Cycle to the next wallpaper", kind: "value" as const },
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
        wallpapers.all.forEach((w, i) => ctx.print(numbered(i, w.id === shell.wallpaper, w.id, w.label), "output"));
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
      if (args.length !== 1) return [];
      return [
        { value: "list", description: "List registered looks", kind: "subcommand" as const },
        ...looks.all.map((l, i) => ({
          value: l.id,
          label: l.label,
          description: `${i + 1}${l.description ? ` · ${l.description}` : ""}`,
          kind: "value" as const,
        })),
      ];
    },
    run: (args, ctx) => {
      const [arg] = args;

      if (!arg) {
        const current = shell.look;
        if (current) {
          const l = looks.get(current)!;
          ctx.print(`current look: ${l.id} — ${l.label}`, "output");
        } else {
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
        looks.all.forEach((l, i) => ctx.print(numbered(i, l.id === shell.look, l.id, l.label), "output"));
        return;
      }

      const id = byNumberOrId(looks.all, arg);
      if (!shell.applyLook(id)) {
        ctx.print(`unknown look: ${arg}`, "error");
        return;
      }
      const l = looks.get(id)!;
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
