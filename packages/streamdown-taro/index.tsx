"use client";

import type { ScrollViewProps, TextProps, ViewProps } from "@tarojs/components";
import type { ComponentType, ReactNode } from "react";
import { memo, useMemo } from "react";
import {
  type InlineNode,
  type MarkdownBlock,
  parseMarkdown,
  type TableAlignment,
} from "./lib/parse";

export type {
  InlineNode,
  MarkdownBlock,
  TableAlignment,
  TableBlock,
  TextBlock,
} from "./lib/parse";
// biome-ignore lint/performance/noBarrelFile: package entrypoint mirrors Streamdown's public API
export { parseInline, parseMarkdown } from "./lib/parse";

type TaroComponent = ComponentType<Record<string, unknown>> | string;

export interface TaroMarkdownComponents {
  emphasis?: TaroComponent;
  inlineCode?: TaroComponent;
  paragraph?: TaroComponent;
  root?: TaroComponent;
  strong?: TaroComponent;
  table?: TaroComponent;
  tableCell?: TaroComponent;
  tableContainer?: TaroComponent;
  tableHeaderCell?: TaroComponent;
  tableRow?: TaroComponent;
  text?: TaroComponent;
}

export interface StreamdownProps {
  children?: string;
  className?: string;
  components?: TaroMarkdownComponents;
  mode?: "static" | "streaming";
  normalizeHtmlIndentation?: boolean;
  parseIncompleteMarkdown?: boolean;
  parseMarkdownFn?: (markdown: string) => MarkdownBlock[];
  selectable?: boolean;
  style?: ViewProps["style"];
}

type TaroStyle = NonNullable<ViewProps["style"]>;
type TaroObjectStyle = Extract<TaroStyle, object>;

const rootStyle: TaroObjectStyle = {
  width: "100%",
};

const defaultView = "view";
const defaultText = "text";
const defaultScrollView = "scroll-view";

const paragraphStyle: TaroObjectStyle = {
  marginBottom: 8,
};

const strongStyle: Extract<NonNullable<TextProps["style"]>, object> = {
  fontWeight: "600",
};

const emphasisStyle: Extract<NonNullable<TextProps["style"]>, object> = {
  fontStyle: "italic",
};

const inlineCodeStyle: Extract<NonNullable<TextProps["style"]>, object> = {
  borderRadius: 4,
  fontFamily: "monospace",
  padding: "0 4px",
};

const tableContainerStyle: Extract<
  NonNullable<ScrollViewProps["style"]>,
  object
> = {
  marginBottom: 8,
  width: "100%",
};

const tableStyle: TaroObjectStyle = {
  minWidth: "100%",
};

const tableRowStyle: TaroObjectStyle = {
  display: "flex",
  flexDirection: "row",
};

const tableCellStyle: TaroObjectStyle = {
  borderColor: "rgba(127, 127, 127, 0.35)",
  borderStyle: "solid",
  borderWidth: 1,
  flex: 1,
  minWidth: 96,
  padding: "6px 8px",
};

const tableHeaderCellStyle: TaroObjectStyle = {
  ...tableCellStyle,
  fontWeight: "600",
};

const alignmentStyle = (alignment: TableAlignment): TaroObjectStyle => {
  if (!alignment) {
    return {};
  }

  return { textAlign: alignment };
};

const mergeStyle = (
  base: TaroObjectStyle,
  override: ViewProps["style"]
): ViewProps["style"] => {
  if (!override) {
    return base;
  }

  return typeof override === "string" ? override : { ...base, ...override };
};

export const Streamdown = memo(
  ({
    children = "",
    className,
    style,
    components,
    mode: _mode = "streaming",
    normalizeHtmlIndentation: _normalizeHtmlIndentation = false,
    parseIncompleteMarkdown: _parseIncompleteMarkdown = true,
    selectable = false,
    parseMarkdownFn = parseMarkdown,
  }: StreamdownProps) => {
    const blocks = useMemo(
      () => parseMarkdownFn(children),
      [children, parseMarkdownFn]
    );

    const Root = components?.root ?? defaultView;

    return (
      <Root className={className} style={mergeStyle(rootStyle, style)}>
        {blocks.map((block, index) =>
          renderBlock(block, `${index}`, components, selectable)
        )}
      </Root>
    );
  },
  (prev, next) =>
    prev.children === next.children &&
    prev.className === next.className &&
    prev.style === next.style &&
    prev.components === next.components &&
    prev.mode === next.mode &&
    prev.normalizeHtmlIndentation === next.normalizeHtmlIndentation &&
    prev.parseIncompleteMarkdown === next.parseIncompleteMarkdown &&
    prev.selectable === next.selectable &&
    prev.parseMarkdownFn === next.parseMarkdownFn
);

Streamdown.displayName = "TaroStreamdown";

const renderBlock = (
  block: MarkdownBlock,
  key: string,
  components: TaroMarkdownComponents | undefined,
  selectable: boolean
): ReactNode => {
  if (block.type === "table") {
    return renderTable(block, key, components, selectable);
  }

  const Paragraph = components?.paragraph ?? defaultView;

  return (
    <Paragraph key={key} style={paragraphStyle}>
      {renderInline(block.children, `${key}-text`, components, selectable)}
    </Paragraph>
  );
};

const renderTable = (
  block: Extract<MarkdownBlock, { type: "table" }>,
  key: string,
  components: TaroMarkdownComponents | undefined,
  selectable: boolean
): ReactNode => {
  const TableContainer = components?.tableContainer ?? defaultScrollView;
  const Table = components?.table ?? defaultView;
  const TableRow = components?.tableRow ?? defaultView;
  const HeaderCell = components?.tableHeaderCell ?? defaultView;
  const Cell = components?.tableCell ?? defaultView;

  return (
    <TableContainer
      key={key}
      scrollX
      showScrollbar={false}
      style={tableContainerStyle}
    >
      <Table style={tableStyle}>
        <TableRow style={tableRowStyle}>
          {block.header.map((cell, cellIndex) => (
            <HeaderCell
              // biome-ignore lint/suspicious/noArrayIndexKey: markdown table columns are positional and hold no local state
              key={`h-${cellIndex}`}
              style={{
                ...tableHeaderCellStyle,
                ...alignmentStyle(block.alignments[cellIndex]),
              }}
            >
              {renderInline(
                cell,
                `${key}-h-${cellIndex}`,
                components,
                selectable
              )}
            </HeaderCell>
          ))}
        </TableRow>
        {block.rows.map((row, rowIndex) => (
          <TableRow
            // biome-ignore lint/suspicious/noArrayIndexKey: markdown table rows are positional and hold no local state
            key={`r-${rowIndex}`}
            style={tableRowStyle}
          >
            {row.map((cell, cellIndex) => (
              <Cell
                // biome-ignore lint/suspicious/noArrayIndexKey: markdown table cells are positional and hold no local state
                key={`c-${cellIndex}`}
                style={{
                  ...tableCellStyle,
                  ...alignmentStyle(block.alignments[cellIndex]),
                }}
              >
                {renderInline(
                  cell,
                  `${key}-r-${rowIndex}-${cellIndex}`,
                  components,
                  selectable
                )}
              </Cell>
            ))}
          </TableRow>
        ))}
      </Table>
    </TableContainer>
  );
};

const renderInline = (
  nodes: InlineNode[],
  keyPrefix: string,
  components: TaroMarkdownComponents | undefined,
  selectable: boolean
): ReactNode =>
  nodes.map((node, index) =>
    renderInlineNode(node, `${keyPrefix}-${index}`, components, selectable)
  );

const renderInlineNode = (
  node: InlineNode,
  key: string,
  components: TaroMarkdownComponents | undefined,
  selectable: boolean
): ReactNode => {
  const TextComponent = components?.text ?? defaultText;

  if (node.type === "text") {
    return (
      <TextComponent key={key} selectable={selectable} userSelect={selectable}>
        {node.value}
      </TextComponent>
    );
  }

  let Component = components?.inlineCode ?? defaultText;
  let style = inlineCodeStyle;

  if (node.type === "strong") {
    Component = components?.strong ?? defaultText;
    style = strongStyle;
  } else if (node.type === "emphasis") {
    Component = components?.emphasis ?? defaultText;
    style = emphasisStyle;
  }

  return (
    <Component
      key={key}
      selectable={selectable}
      style={style}
      userSelect={selectable}
    >
      {renderInline(node.children, key, components, selectable)}
    </Component>
  );
};

export default Streamdown;
