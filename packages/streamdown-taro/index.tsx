"use client";

import type { ViewProps } from "@tarojs/components";
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

const defaultView = "view";
const defaultText = "text";
const defaultScrollView = "scroll-view";

const rootClassName = "taro-streamdown-root w-full";
const paragraphClassName = "taro-streamdown-paragraph mb-2";
const headingClassNames = {
  1: "taro-streamdown-heading taro-streamdown-h1 mb-2 text-3xl font-semibold",
  2: "taro-streamdown-heading taro-streamdown-h2 mb-2 text-2xl font-semibold",
  3: "taro-streamdown-heading taro-streamdown-h3 mb-2 text-xl font-semibold",
  4: "taro-streamdown-heading taro-streamdown-h4 mb-2 text-lg font-semibold",
  5: "taro-streamdown-heading taro-streamdown-h5 mb-2 text-base font-semibold",
  6: "taro-streamdown-heading taro-streamdown-h6 mb-2 text-sm font-semibold",
} as const;
const textClassName = "taro-streamdown-text";
const strongClassName = "taro-streamdown-strong font-semibold";
const emphasisClassName = "taro-streamdown-emphasis italic";
const inlineCodeClassName =
  "taro-streamdown-inline-code rounded px-1 font-mono";
const tableContainerClassName = "taro-streamdown-table-container mb-2 w-full";
const tableClassName = "taro-streamdown-table min-w-full";
const tableHeaderRowClassName =
  "taro-streamdown-table-header-row flex flex-row";
const tableRowClassName = "taro-streamdown-table-row flex flex-row -mt-px";
const tableCellBaseClassName =
  "taro-streamdown-table-cell min-w-24 flex-1 border border-gray-300 px-2 py-1";
const tableHeaderCellClassName = `taro-streamdown-table-header-cell ${tableCellBaseClassName} font-semibold`;

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const alignmentClassName = (alignment: TableAlignment): string | undefined => {
  if (alignment === "center") {
    return "taro-streamdown-align-center text-center";
  }
  if (alignment === "right") {
    return "taro-streamdown-align-right text-right";
  }
  if (alignment === "left") {
    return "taro-streamdown-align-left text-left";
  }
  return undefined;
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
      <Root className={cn(rootClassName, className)} style={style}>
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
  const blockClassName = block.headingLevel
    ? headingClassNames[block.headingLevel]
    : paragraphClassName;

  return (
    <Paragraph className={blockClassName} key={key}>
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
      className={tableContainerClassName}
      key={key}
      scrollX
      showScrollbar={false}
    >
      <Table className={tableClassName}>
        <TableRow className={tableHeaderRowClassName}>
          {block.header.map((cell, cellIndex) => (
            <HeaderCell
              className={cn(
                tableHeaderCellClassName,
                cellIndex > 0 && "-ml-px",
                alignmentClassName(block.alignments[cellIndex])
              )}
              // biome-ignore lint/suspicious/noArrayIndexKey: markdown table columns are positional and hold no local state
              key={`h-${cellIndex}`}
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
            className={tableRowClassName}
            // biome-ignore lint/suspicious/noArrayIndexKey: markdown table rows are positional and hold no local state
            key={`r-${rowIndex}`}
          >
            {row.map((cell, cellIndex) => (
              <Cell
                className={cn(
                  tableCellBaseClassName,
                  cellIndex > 0 && "-ml-px",
                  alignmentClassName(block.alignments[cellIndex])
                )}
                // biome-ignore lint/suspicious/noArrayIndexKey: markdown table cells are positional and hold no local state
                key={`c-${cellIndex}`}
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
      <TextComponent
        className={textClassName}
        key={key}
        selectable={selectable}
        userSelect={selectable}
      >
        {node.value}
      </TextComponent>
    );
  }

  let Component = components?.inlineCode ?? defaultText;
  let className = inlineCodeClassName;

  if (node.type === "strong") {
    Component = components?.strong ?? defaultText;
    className = strongClassName;
  } else if (node.type === "emphasis") {
    Component = components?.emphasis ?? defaultText;
    className = emphasisClassName;
  }

  return (
    <Component
      className={className}
      key={key}
      selectable={selectable}
      userSelect={selectable}
    >
      {renderInline(node.children, key, components, selectable)}
    </Component>
  );
};

export default Streamdown;
