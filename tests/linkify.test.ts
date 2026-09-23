import { describe, expect, it } from "vitest";
import { isAllowedLinkHref, linkify } from "$lib/shell/linkify.js";

describe("linkify", () => {
  it("returns plain text unchanged when there is no URL", () => {
    expect(linkify("no links here")).toEqual([{ text: "no links here" }]);
  });

  it("detects a bare http(s) URL", () => {
    expect(linkify("see https://example.com/doc for details")).toEqual([
      { text: "see " },
      { text: "https://example.com/doc", href: "https://example.com/doc" },
      { text: " for details" },
    ]);
  });

  it("detects a URL at the start and end of the string", () => {
    expect(linkify("https://example.com")).toEqual([{ text: "https://example.com", href: "https://example.com" }]);
  });

  it("finds more than one URL", () => {
    expect(linkify("http://a.com and https://b.com")).toEqual([
      { text: "http://a.com", href: "http://a.com" },
      { text: " and " },
      { text: "https://b.com", href: "https://b.com" },
    ]);
  });

  it("trims trailing sentence punctuation that isn't part of the URL", () => {
    expect(linkify("Deployed: https://example.com/doc.")).toEqual([
      { text: "Deployed: " },
      { text: "https://example.com/doc", href: "https://example.com/doc" },
      { text: "." },
    ]);
    expect(linkify("see https://example.com/doc, then reload")).toEqual([
      { text: "see " },
      { text: "https://example.com/doc", href: "https://example.com/doc" },
      { text: "," },
      { text: " then reload" },
    ]);
  });

  it("strips a trailing close-paren that wraps the URL in prose", () => {
    expect(linkify("(see https://example.com/doc)")).toEqual([
      { text: "(see " },
      { text: "https://example.com/doc", href: "https://example.com/doc" },
      { text: ")" },
    ]);
  });

  it("keeps a close-paren that is balanced within the URL itself", () => {
    const url = "https://en.wikipedia.org/wiki/Foo_(bar)";
    expect(linkify(url)).toEqual([{ text: url, href: url }]);
  });

  it("never matches javascript: or data: schemes", () => {
    expect(linkify("javascript:alert(1)")).toEqual([{ text: "javascript:alert(1)" }]);
    expect(linkify("data:text/html,hi")).toEqual([{ text: "data:text/html,hi" }]);
  });

  it("does not linkify a scheme embedded mid-word", () => {
    expect(linkify("xhttps://example.com")).toEqual([{ text: "xhttps://example.com" }]);
  });
});

describe("isAllowedLinkHref", () => {
  it("allows http and https", () => {
    expect(isAllowedLinkHref("https://example.com")).toBe(true);
    expect(isAllowedLinkHref("http://example.com")).toBe(true);
    expect(isAllowedLinkHref("HTTPS://example.com")).toBe(true);
  });

  it("rejects everything else", () => {
    expect(isAllowedLinkHref("javascript:alert(1)")).toBe(false);
    expect(isAllowedLinkHref("data:text/html,hi")).toBe(false);
    expect(isAllowedLinkHref("mailto:a@b.com")).toBe(false);
    expect(isAllowedLinkHref("/relative/path")).toBe(false);
    expect(isAllowedLinkHref("#xp")).toBe(false);
  });
});
