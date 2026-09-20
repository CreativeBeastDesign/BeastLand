/**
 * Shell commands
 *
 * The command registry powering the Terminal organism. Commands read/write
 * the shared `shell` store so any surface (terminal, top bar, showcase) stays
 * in sync with what's typed here.
 */

import { shell } from "$lib/shell/state.svelte";
import { themes, themeIds } from "$lib/theme/themes.js";
import { wallpapers, wallpaperIds } from "$lib/wallpapers.js";
import { parseArgs, type Command, type CommandContext, type FlagSpec, type Suggestion } from "./protocol.js";

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
    usage: "theme [id|next]",
    complete: (args) => {
      if (args.length !== 1) return [];
      return [
        ...themeIds.map((id) => ({ value: id, label: themes[id].label, kind: "value" as const })),
        { value: "next", description: "Cycle to the next theme", kind: "value" as const },
      ];
    },
    run: (args, ctx) => {
      const [arg] = args;

      if (!arg) {
        ctx.print(`current theme: ${shell.theme}`, "output");
        ctx.print("available themes:", "output");
        for (const id of themeIds) {
          const marker = id === shell.theme ? "*" : " ";
          ctx.print(`  ${marker} ${id} — ${themes[id].label}`, "output");
        }
        return;
      }

      if (arg === "next") {
        shell.nextTheme();
        ctx.print(`theme set to ${shell.theme}`, "output");
        return;
      }

      if (!shell.setTheme(arg)) {
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
    usage: "wallpaper [id|next]",
    complete: (args) => {
      if (args.length !== 1) return [];
      return [
        ...wallpaperIds.map((id) => ({
          value: id,
          label: wallpapers[id].label,
          description: wallpapers[id].description,
          kind: "value" as const,
        })),
        { value: "next", description: "Cycle to the next wallpaper", kind: "value" as const },
      ];
    },
    run: (args, ctx) => {
      const [arg] = args;

      if (!arg) {
        ctx.print(`current wallpaper: ${shell.wallpaper}`, "output");
        ctx.print("available wallpapers:", "output");
        for (const id of wallpaperIds) {
          const marker = id === shell.wallpaper ? "*" : " ";
          ctx.print(`  ${marker} ${id} — ${wallpapers[id].label}`, "output");
        }
        return;
      }

      if (arg === "next") {
        shell.nextWallpaper();
        const meta = shell.wallpaperMeta;
        ctx.print(`wallpaper set to ${meta.label} — ${meta.description}`, "output");
        return;
      }

      if (!shell.setWallpaper(arg)) {
        ctx.print(`unknown wallpaper: ${arg}`, "error");
        return;
      }
      const meta = shell.wallpaperMeta;
      ctx.print(`wallpaper set to ${meta.label} — ${meta.description}`, "output");
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
