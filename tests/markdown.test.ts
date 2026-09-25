import { describe, expect, it } from "vitest";
import { splitRefs, isRunnableFence } from "$lib/markdown/refs.js";
import { parseMarkdown } from "$lib/markdown/parse.js";
import type { Tokens } from "marked";

describe("splitRefs", () => {
  it("returns a single text part when there are no refs", () => {
    expect(splitRefs("hello world")).toEqual([{ text: "hello world" }]);
  });

  it("finds a ref at the very start of the text", () => {
    expect(splitRefs("@12 is the target")).toEqual([{ ref: "@12" }, { text: " is the target" }]);
  });

  it("finds a ref at the very end of the text", () => {
    expect(splitRefs("open #xp")).toEqual([{ text: "open " }, { ref: "#xp" }]);
  });

  it("finds a ref that is the entire text", () => {
    expect(splitRefs("#xp")).toEqual([{ ref: "#xp" }]);
  });

  it("finds multiple refs in one run", () => {
    expect(splitRefs("see @12 and #xp please")).toEqual([
      { text: "see " },
      { ref: "@12" },
      { text: " and " },
      { ref: "#xp" },
      { text: " please" },
    ]);
  });

  it("does not match a ref glued to a word (not word-boundaried)", () => {
    expect(splitRefs("email@12x and foo#xpz")).toEqual([{ text: "email@12x and foo#xpz" }]);
  });

  it("does not match an email-like a@b as a ref", () => {
    expect(splitRefs("contact a@b for help")).toEqual([{ text: "contact a@b for help" }]);
  });

  it("does not match a bare # with no id following", () => {
    expect(splitRefs("a # b")).toEqual([{ text: "a # b" }]);
  });

  it("requires at least 2 chars after #, so a single-char id is not a ref", () => {
    expect(splitRefs("a #x b")).toEqual([{ text: "a #x b" }]);
  });

  it("does match a 2-char id after #", () => {
    expect(splitRefs("a #xp b")).toEqual([{ text: "a " }, { ref: "#xp" }, { text: " b" }]);
  });

  it("matches @ with any number of digits", () => {
    expect(splitRefs("@1 @23 @456")).toEqual([
      { ref: "@1" },
      { text: " " },
      { ref: "@23" },
      { text: " " },
      { ref: "@456" },
    ]);
  });
});

describe("isRunnableFence", () => {
  it("is true for beast", () => {
    expect(isRunnableFence("beast")).toBe(true);
  });

  it("is true for sh", () => {
    expect(isRunnableFence("sh")).toBe(true);
  });

  it("is false for other languages", () => {
    expect(isRunnableFence("ts")).toBe(false);
    expect(isRunnableFence("js")).toBe(false);
    expect(isRunnableFence("python")).toBe(false);
  });

  it("is false for an empty string", () => {
    expect(isRunnableFence("")).toBe(false);
  });

  it("is false for undefined", () => {
    expect(isRunnableFence(undefined)).toBe(false);
  });
});

describe("parseMarkdown", () => {
  it("produces a heading token with depth and inline tokens", () => {
    const tokens = parseMarkdown("## Section title\n");
    expect(tokens).toHaveLength(1);
    const heading = tokens[0] as Tokens.Heading;
    expect(heading.type).toBe("heading");
    expect(heading.depth).toBe(2);
    expect(heading.text).toBe("Section title");
  });

  it("produces a paragraph token whose inline tokens include bold, code and a ref", () => {
    const tokens = parseMarkdown("hi **bold** `code` #xp\n");
    const paragraph = tokens[0] as Tokens.Paragraph;
    expect(paragraph.type).toBe("paragraph");
    const types = paragraph.tokens.map((t) => t.type);
    expect(types).toEqual(["text", "strong", "text", "codespan", "text"]);
  });

  it("produces a table token with per-column align from GFM alignment markers", () => {
    const tokens = parseMarkdown("| name | qty |\n|:---|---:|\n| widget | 3 |\n");
    const table = tokens[0] as Tokens.Table;
    expect(table.type).toBe("table");
    expect(table.align).toEqual(["left", "right"]);
    expect(table.header.map((c) => c.text)).toEqual(["name", "qty"]);
    expect(table.rows).toEqual([
      [
        expect.objectContaining({ text: "widget" }),
        expect.objectContaining({ text: "3" }),
      ],
    ]);
  });

  it("produces task list items with checked state", () => {
    const tokens = parseMarkdown("- [ ] todo\n- [x] done\n");
    const list = tokens[0] as Tokens.List;
    expect(list.type).toBe("list");
    expect(list.items).toHaveLength(2);
    expect(list.items[0]).toMatchObject({ task: true, checked: false });
    expect(list.items[1]).toMatchObject({ task: true, checked: true });
  });

  it("produces a plain (non-task) list item unchanged", () => {
    const tokens = parseMarkdown("- plain item\n");
    const list = tokens[0] as Tokens.List;
    expect(list.items[0]).toMatchObject({ task: false });
  });

  it("produces a code token carrying the fence's language", () => {
    const tokens = parseMarkdown("```beast\nls\n```\n");
    const code = tokens[0] as Tokens.Code;
    expect(code.type).toBe("code");
    expect(code.lang).toBe("beast");
    expect(code.text).toBe("ls");
  });

  it("produces a code token with an empty lang for a fence with no info string", () => {
    const tokens = parseMarkdown("```\nplain\n```\n");
    const code = tokens[0] as Tokens.Code;
    expect(code.lang).toBe("");
  });
});

describe("parseMarkdown math (opt-in via { math: true })", () => {
  it("leaves $…$ as literal text when math is not requested", () => {
    const tokens = parseMarkdown("cost is $5 and $10\n");
    const paragraph = tokens[0] as Tokens.Paragraph;
    expect(paragraph.tokens.map((t) => t.type)).toEqual(["text"]);
    expect((paragraph.tokens[0] as Tokens.Text).text).toBe("cost is $5 and $10");
  });

  it("leaves $…$ as literal text even with { math: true } when it looks like currency", () => {
    // "$5 and $10": the second "$" has a space right before it, so it can
    // never close a math run that started at the first "$".
    const tokens = parseMarkdown("cost is $5 and $10\n", { math: true });
    const paragraph = tokens[0] as Tokens.Paragraph;
    expect(paragraph.tokens.some((t) => t.type === "mathInline")).toBe(false);
  });

  it("tokenizes inline math as a mathInline token", () => {
    const tokens = parseMarkdown("Euler's identity is $e^{i\\pi}+1=0$ neat.\n", { math: true });
    const paragraph = tokens[0] as Tokens.Paragraph;
    const math = paragraph.tokens.find((t) => t.type === "mathInline") as unknown as {
      type: string;
      tex: string;
    };
    expect(math).toBeDefined();
    expect(math.tex).toBe("e^{i\\pi}+1=0");
  });

  it("tokenizes a $$…$$ block as a mathBlock token", () => {
    const tokens = parseMarkdown("intro\n\n$$\nx = y\n$$\n\nend\n", { math: true });
    const block = (tokens as { type: string }[]).find((t) => t.type === "mathBlock") as unknown as {
      type: string;
      tex: string;
    };
    expect(block).toBeDefined();
    expect(block.tex).toBe("x = y");
  });

  it("tokenizes a same-line $$…$$ block", () => {
    const tokens = parseMarkdown("$$x = y$$\n", { math: true });
    const block = tokens[0] as unknown as { type: string; tex: string };
    expect(block.type).toBe("mathBlock");
    expect(block.tex).toBe("x = y");
  });

  it("does not tokenize $…$ as math when the opening $ is followed by a space", () => {
    const tokens = parseMarkdown("a $ b$ c\n", { math: true });
    const paragraph = tokens[0] as Tokens.Paragraph;
    expect(paragraph.tokens.some((t) => t.type === "mathInline")).toBe(false);
  });
});
