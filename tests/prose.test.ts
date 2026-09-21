import { describe, expect, it } from "vitest";
import { proseSpans } from "$lib/shell/prose.js";

describe("proseSpans", () => {
  it("renders plain text as a single untoned span", () => {
    expect(proseSpans("hello world")).toEqual([{ text: "hello world" }]);
  });

  it("parses bold", () => {
    expect(proseSpans("a **bold** word")).toEqual([
      { text: "a " },
      { text: "bold", tone: "bold" },
      { text: " word" },
    ]);
  });

  it("parses inline code", () => {
    expect(proseSpans("run `ls -la` now")).toEqual([
      { text: "run " },
      { text: "ls -la", tone: "code" },
      { text: " now" },
    ]);
  });

  it("detects @n and #id refs, word-boundaried, as clickable id spans", () => {
    expect(proseSpans("see @12 and #xp please")).toEqual([
      { text: "see " },
      { text: "@12", tone: "id", command: "@12" },
      { text: " and " },
      { text: "#xp", tone: "id", command: "#xp" },
      { text: " please" },
    ]);
  });

  it("does not treat a ref glued to a word as a ref", () => {
    expect(proseSpans("email@12x and foo#xpz")).toEqual([{ text: "email@12x and foo#xpz" }]);
  });

  it("requires at least 2 chars after # (single-char is not a ref)", () => {
    expect(proseSpans("a #x b")).toEqual([{ text: "a #x b" }]);
  });

  it("does not detect refs inside inline code", () => {
    expect(proseSpans("`see @12 and #xp`")).toEqual([{ text: "see @12 and #xp", tone: "code" }]);
  });

  it("handles adjacency between tokens with no separating space", () => {
    expect(proseSpans("**bold**#xp`code`@1")).toEqual([
      { text: "bold", tone: "bold" },
      { text: "#xp", tone: "id", command: "#xp" },
      { text: "code", tone: "code" },
      { text: "@1", tone: "id", command: "@1" },
    ]);
  });

  it("renders a fenced block with no info string as verbatim mono lines", () => {
    expect(proseSpans("before\n```\nline one\nline two\n```\nafter")).toEqual([
      { text: "before" },
      { text: "\n" },
      { text: "line one", tone: "code" },
      { text: "\n" },
      { text: "line two", tone: "code" },
      { text: "\n" },
      { text: "after" },
    ]);
  });

  it("renders a `beast` fence as one clickable command span per non-empty line", () => {
    expect(proseSpans("```beast\nls\n#xp -d\n```")).toEqual([
      { text: "ls", tone: "accent", command: "ls" },
      { text: "\n" },
      { text: "#xp -d", tone: "accent", command: "#xp -d" },
    ]);
  });

  it("renders a `sh` fence the same way as `beast`", () => {
    expect(proseSpans("```sh\necho hi\n```")).toEqual([{ text: "echo hi", tone: "accent", command: "echo hi" }]);
  });

  it("does not turn markdown or refs on inside a fenced block", () => {
    expect(proseSpans("```\n**not bold** #notaref\n```")).toEqual([
      { text: "**not bold** #notaref", tone: "code" },
    ]);
  });

  it("tolerates an unterminated fence by running it to the end", () => {
    expect(proseSpans("```beast\nls")).toEqual([{ text: "ls", tone: "accent", command: "ls" }]);
  });

  it("keeps an empty fence line as an un-toned command-less line", () => {
    expect(proseSpans("```beast\nls\n\npwd\n```")).toEqual([
      { text: "ls", tone: "accent", command: "ls" },
      { text: "\n" },
      { text: "", tone: "code" },
      { text: "\n" },
      { text: "pwd", tone: "accent", command: "pwd" },
    ]);
  });
});
