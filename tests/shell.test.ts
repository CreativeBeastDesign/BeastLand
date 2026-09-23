import { describe, expect, it } from "vitest";
import { flag, inUnterminatedQuote, matchCommand, parseArgs, tokenize, type Command } from "$lib/shell/protocol.js";
import { applySuggestion, candidatesFor, fuzzyScore, splitInput } from "$lib/shell/completion.js";

describe("tokenize / parseArgs", () => {
  it("honours double quotes", () => {
    expect(tokenize('customer set --name "John Doe" -f John')).toEqual(["customer", "set", "--name", "John Doe", "-f", "John"]);
  });
  it("honours single quotes that start a token", () => {
    expect(tokenize("ask -w #id 'This is a long query'")).toEqual(["ask", "-w", "#id", "This is a long query"]);
  });
  it("leaves an apostrophe mid-word literal", () => {
    expect(tokenize("don't split this")).toEqual(["don't", "split", "this"]);
  });
  it("folds an unterminated quote's trailing space into the last token", () => {
    expect(tokenize('ask -w #id "This is a long ')).toEqual(["ask", "-w", "#id", "This is a long "]);
  });
  it("splits flags and positionals; boolean when no value follows", () => {
    const p = parseArgs(["new", "--optional", "-t", "Logo", "--price", "1600.50", "-o"]);
    expect(p.positional).toEqual(["new"]);
    expect(p.flags).toEqual({ optional: true, t: "Logo", price: "1600.50", o: true });
    expect(flag(p, "title", "t")).toBe("Logo");
  });
  it("treats negative numbers as values, not flags", () => {
    expect(parseArgs(["--discount", "-5"]).flags).toEqual({ discount: "-5" });
  });
  it("supports --key=value", () => {
    expect(parseArgs(["--width=4"]).flags).toEqual({ width: "4" });
  });
});

describe("inUnterminatedQuote", () => {
  it("is true while the caret sits inside an open double-quoted span", () => {
    const line = 'ask -w #id "This is a long ';
    expect(inUnterminatedQuote(line, line.length)).toBe(true);
  });
  it("is false once the quote is closed", () => {
    const line = 'ask -w #id "This is a long query" ';
    expect(inUnterminatedQuote(line, line.length)).toBe(false);
  });
  it("is false before the quote opens", () => {
    const line = 'ask -w #id "long query"';
    expect(inUnterminatedQuote(line, "ask -w #id".length)).toBe(false);
  });
  it("honours the same single-quote token-start rule as tokenize", () => {
    expect(inUnterminatedQuote("ask 'foo", 8)).toBe(true);
    expect(inUnterminatedQuote("don't", 5)).toBe(false);
  });
});

const cmds: Command[] = [
  { name: "customer", aliases: ["c"], description: "Customers", run: () => {} },
  { name: "@<n>", description: "container", match: (t) => /^@\d*$/.test(t), run: () => {} },
];

describe("matchCommand", () => {
  it("finds by name and alias", () => {
    expect(matchCommand("c list", cmds)?.command.name).toBe("customer");
    expect(matchCommand("c list", cmds)?.args).toEqual(["list"]);
  });
  it("routes prefix tokens with the raw token as args[0]", () => {
    expect(matchCommand("@2 -w 4", cmds)?.args).toEqual(["@2", "-w", "4"]);
  });
});

describe("fuzzy completion", () => {
  it("prefix beats scattered subsequence", () => {
    expect(fuzzyScore("cus", "customer")!).toBeGreaterThan(fuzzyScore("cus", "cluster-us")!);
  });
  it("matches initials on word starts", () => {
    expect(fuzzyScore("vdl", "Rob Van Der Linden")).not.toBeNull();
  });
  it("does not let an alias outrank the command it aliases", () => {
    expect(candidatesFor("cu", cmds).map((s) => s.value)).toEqual(["customer", "c"]);
  });
  it("strips a sigil when matching labels", () => {
    const withIds: Command[] = [
      { ...cmds[1], match: (t) => /^#\S*$/.test(t), complete: () => [{ value: "#xq", label: "Rob Van Der Linden" }, { value: "#xp", label: "Engin Kiran" }] },
    ];
    expect(candidatesFor("#rob", withIds)[0].value).toBe("#xq");
  });
  it("offers nothing while a flag waits for a free-form value", () => {
    const withFlags: Command[] = [
      { name: "@<n>", description: "c", match: (t) => /^@\d*$/.test(t), flags: [
        { name: "width", short: "w", description: "w", takesValue: true },
        { name: "down", short: "d", description: "d" },
        { name: "status", description: "s", takesValue: true, values: ["draft", "sent"] },
      ], run: () => {} },
    ];
    expect(candidatesFor("@5 -w", withFlags)).toEqual([]);      // token is a complete value flag
    expect(candidatesFor("@5 -w ", withFlags)).toEqual([]);     // value required, none to suggest
    expect(candidatesFor("@5 --status ", withFlags).map((s) => s.value)).toEqual(["draft", "sent"]);
    expect(candidatesFor("@5 -d", withFlags)).toEqual([]);      // exact boolean flag: done
    expect(candidatesFor("@5 -", withFlags).length).toBeGreaterThan(0);
  });

  it("closes when the token exactly matches a candidate", () => {
    expect(candidatesFor("customer", cmds)).toEqual([]);
  });

  it("applies a suggestion by replacing the partial token", () => {
    expect(applySuggestion("customer li", "list")).toBe("customer list ");
    expect(splitInput('a "b c" d')).toEqual({ tokens: ["a", "b c"], partial: "d" });
  });

  it("offers nothing while the caret is inside an unterminated quote, even across a space", () => {
    const withFlags: Command[] = [
      { name: "ask", description: "a", flags: [{ name: "width", short: "w", description: "w", takesValue: true }], run: () => {} },
    ];
    // The bug this guards: a trailing space inside an open quote used to be
    // read as "token boundary", reopening the popup mid-sentence.
    expect(splitInput('ask -w 4 "This is a long ')).toEqual({ tokens: ["ask", "-w", "4"], partial: "This is a long " });
    expect(candidatesFor('ask -w 4 "This is a long ', withFlags)).toEqual([]);
    expect(candidatesFor('ask -w 4 "This is a long query"', withFlags)).toEqual([]);
    // Suggestions resume normally once the quote closes.
    expect(candidatesFor('ask -w 4 "done" -', withFlags).length).toBeGreaterThan(0);
  });
});
