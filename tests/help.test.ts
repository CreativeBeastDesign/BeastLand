/**
 * `helpText` / `helpIndex` are the plain-text twins of what `help` prints —
 * built from the same rows — so an app embedding the grammar elsewhere (an
 * LLM system prompt) cannot drift from the terminal.
 */
import { describe, expect, it } from "vitest";
import { helpIndex, helpRows, helpText, shellCommands } from "$lib/shell/commands.js";
import { runCommand, type Command, type CommandContext, type Span } from "$lib/shell/protocol.js";

const cmd: Command = {
  name: "widget",
  aliases: ["w"],
  description: "Manage widgets",
  usage: "widget [list|new --name]",
  flags: [{ name: "verbose", short: "v", description: "Say more" }],
  subcommands: [
    { name: "list", aliases: ["ls"], description: "List widgets" },
    { name: "new", description: "Create one", flags: [{ name: "name", short: "n", description: "Name", takesValue: true }] },
  ],
  run: () => {},
};

async function printed(line: string, commands: Command[]): Promise<string[]> {
  const lines: string[] = [];
  const ctx: CommandContext = {
    print: (t) => {
      lines.push(typeof t === "string" ? t : (t as Span[]).map((s) => s.text).join(""));
      return { set: () => {}, append: () => {} };
    },
    clear: () => {},
    commands,
    signal: new AbortController().signal,
  };
  await runCommand(line, commands, ctx);
  return lines;
}

describe("help text", () => {
  it("helpText equals what `help <command>` prints", async () => {
    const commands = [...shellCommands, cmd];
    expect(helpText(cmd).split("\n")).toEqual(await printed("help widget", commands));
    expect(helpText(cmd)).toBe(
      [
        "usage: widget [list|new --name]",
        "Manage widgets",
        "",
        "subcommands:",
        "  list, ls  List widgets",
        "  new       Create one",
        "      --name, -n <value>  Name",
        "",
        "flags:",
        "  --verbose, -v  Say more",
      ].join("\n"),
    );
  });

  it("helpIndex equals what bare `help` prints", async () => {
    const commands = [...shellCommands, cmd];
    expect(helpIndex(commands).split("\n")).toEqual(await printed("help", commands));
    expect(helpRows(cmd).filter((r) => "name" in r)).toHaveLength(4);
  });
});
