import { describe, expect, it } from "vitest";
import { parseInline, parseMarkdown } from "../lib/parse";

describe("parseMarkdown", () => {
  it("parses plain text blocks", () => {
    expect(parseMarkdown("Hello\nworld\n\nNext")).toEqual([
      {
        type: "text",
        children: [{ type: "text", value: "Hello\nworld" }],
      },
      {
        type: "text",
        children: [{ type: "text", value: "Next" }],
      },
    ]);
  });

  it("keeps heading levels for text blocks", () => {
    expect(parseMarkdown("# Title\n\n### Section")).toEqual([
      {
        type: "text",
        headingLevel: 1,
        children: [{ type: "text", value: "Title" }],
      },
      {
        type: "text",
        headingLevel: 3,
        children: [{ type: "text", value: "Section" }],
      },
    ]);
  });

  it("parses unordered lists", () => {
    expect(parseMarkdown("- A\n- B\n- **C**")).toEqual([
      {
        type: "list",
        ordered: false,
        items: [
          [{ type: "text", value: "A" }],
          [{ type: "text", value: "B" }],
          [{ type: "strong", children: [{ type: "text", value: "C" }] }],
        ],
      },
    ]);
  });

  it("parses ordered lists", () => {
    expect(parseMarkdown("1. A\n2. B\n3. **C**")).toEqual([
      {
        type: "list",
        ordered: true,
        start: 1,
        items: [
          [{ type: "text", value: "A" }],
          [{ type: "text", value: "B" }],
          [{ type: "strong", children: [{ type: "text", value: "C" }] }],
        ],
      },
    ]);
  });

  it("parses gfm-style tables", () => {
    expect(
      parseMarkdown(
        "| Name | Count |\n| :--- | ---: |\n| Apples | 3 |\n| Pears | 12 |"
      )
    ).toEqual([
      {
        type: "table",
        header: [
          [{ type: "text", value: "Name" }],
          [{ type: "text", value: "Count" }],
        ],
        alignments: ["left", "right"],
        rows: [
          [[{ type: "text", value: "Apples" }], [{ type: "text", value: "3" }]],
          [[{ type: "text", value: "Pears" }], [{ type: "text", value: "12" }]],
        ],
      },
    ]);
  });

  it("keeps escaped pipes inside table cells", () => {
    expect(parseMarkdown("| A | B |\n| --- | --- |\n| x\\|y | z |")).toEqual([
      {
        type: "table",
        header: [
          [{ type: "text", value: "A" }],
          [{ type: "text", value: "B" }],
        ],
        alignments: [undefined, undefined],
        rows: [
          [[{ type: "text", value: "x|y" }], [{ type: "text", value: "z" }]],
        ],
      },
    ]);
  });
});

describe("parseInline", () => {
  it("parses basic inline text marks", () => {
    expect(parseInline("A **bold** and *em* `code`")).toEqual([
      { type: "text", value: "A " },
      { type: "strong", children: [{ type: "text", value: "bold" }] },
      { type: "text", value: " and " },
      { type: "emphasis", children: [{ type: "text", value: "em" }] },
      { type: "text", value: " " },
      { type: "inlineCode", children: [{ type: "text", value: "code" }] },
    ]);
  });

  it("parses triple emphasis without leaking marker text", () => {
    expect(parseInline("***一、玩偶适配分析***")).toEqual([
      {
        type: "strong",
        children: [
          {
            type: "emphasis",
            children: [{ type: "text", value: "一、玩偶适配分析" }],
          },
        ],
      },
    ]);
  });
});
