export type InlineNode =
  | {
      type: "text";
      value: string;
    }
  | {
      type: "strong" | "emphasis" | "inlineCode";
      children: InlineNode[];
    };

export interface TextBlock {
  children: InlineNode[];
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  type: "text";
}

export type TableAlignment = "left" | "center" | "right" | undefined;

export interface TableBlock {
  alignments: TableAlignment[];
  header: InlineNode[][];
  rows: InlineNode[][][];
  type: "table";
}

export type MarkdownBlock = TextBlock | TableBlock;

const NEWLINE_PATTERN = /\r\n?/g;
const INLINE_TOKEN_PATTERN =
  /(`+)([\s\S]*?)\1|(\*\*|__)([\s\S]+?)\3|(\*|_)([^\s*_][\s\S]*?[^\s*_]|\S)\5/g;
const LEADING_PIPE_PATTERN = /^\|/;
const TRAILING_PIPE_PATTERN = /\|$/;
const TABLE_DELIMITER_PATTERN = /^:?-{3,}:?$/;
const HEADING_PATTERN = /^(#{1,6})\s+(.+)$/;
const BLOCK_CACHE_LIMIT = 100;

const blockCache = new Map<string, MarkdownBlock[]>();

export const parseMarkdown = (markdown = ""): MarkdownBlock[] => {
  const cached = blockCache.get(markdown);
  if (cached) {
    return cached;
  }

  const normalized = markdown.replace(NEWLINE_PATTERN, "\n");
  const lines = normalized.split("\n");
  const blocks: MarkdownBlock[] = [];

  for (let index = 0; index < lines.length; ) {
    if (lines[index]?.trim() === "") {
      index += 1;
      continue;
    }

    const table = parseTable(lines, index);
    if (table) {
      blocks.push(table.block);
      index = table.nextIndex;
      continue;
    }

    const text = parseTextBlock(lines, index);
    blocks.push(text.block);
    index = text.nextIndex;
  }

  if (blockCache.size >= BLOCK_CACHE_LIMIT) {
    const oldest = blockCache.keys().next().value;
    if (oldest) {
      blockCache.delete(oldest);
    }
  }
  blockCache.set(markdown, blocks);

  return blocks;
};

const parseTextBlock = (
  lines: string[],
  startIndex: number
): { block: TextBlock; nextIndex: number } => {
  const heading = parseHeading(lines[startIndex] ?? "");
  if (heading) {
    return {
      block: {
        type: "text",
        headingLevel: heading.level,
        children: parseInline(heading.text),
      },
      nextIndex: startIndex + 1,
    };
  }

  const paragraphLines: string[] = [];
  let index = startIndex;
  while (index < lines.length && lines[index]?.trim() !== "") {
    if (paragraphLines.length > 0 && parseTable(lines, index)) {
      break;
    }
    paragraphLines.push(lines[index] ?? "");
    index += 1;
  }

  return {
    block: {
      type: "text",
      children: parseInline(paragraphLines.join("\n").trim()),
    },
    nextIndex: index,
  };
};

export const parseInline = (value: string): InlineNode[] => {
  const nodes: InlineNode[] = [];
  let lastIndex = 0;

  for (const match of value.matchAll(INLINE_TOKEN_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      nodes.push({
        type: "text",
        value: unescapeText(value.slice(lastIndex, index)),
      });
    }

    if (match[1]) {
      nodes.push({
        type: "inlineCode",
        children: [{ type: "text", value: match[2] ?? "" }],
      });
    } else if (match[3]) {
      nodes.push({
        type: "strong",
        children: parseInline(match[4] ?? ""),
      });
    } else if (match[5]) {
      nodes.push({
        type: "emphasis",
        children: parseInline(match[6] ?? ""),
      });
    }

    lastIndex = index + match[0].length;
  }

  if (lastIndex < value.length) {
    nodes.push({ type: "text", value: unescapeText(value.slice(lastIndex)) });
  }

  return mergeTextNodes(nodes);
};

const parseTable = (
  lines: string[],
  startIndex: number
): { block: TableBlock; nextIndex: number } | null => {
  const headerLine = lines[startIndex];
  const delimiterLine = lines[startIndex + 1];

  if (!(headerLine && delimiterLine && headerLine.includes("|"))) {
    return null;
  }

  const headerCells = splitTableRow(headerLine);
  const delimiterCells = splitTableRow(delimiterLine);

  if (
    headerCells.length === 0 ||
    headerCells.length !== delimiterCells.length ||
    !delimiterCells.every(isDelimiterCell)
  ) {
    return null;
  }

  const rows: InlineNode[][][] = [];
  let index = startIndex + 2;

  while (index < lines.length && lines[index]?.includes("|")) {
    const rawCells = splitTableRow(lines[index] ?? "");
    if (rawCells.length === 0) {
      break;
    }

    rows.push(
      normalizeTableCells(rawCells, headerCells.length).map((cell) =>
        parseInline(cell.trim())
      )
    );
    index += 1;
  }

  return {
    block: {
      type: "table",
      header: headerCells.map((cell) => parseInline(cell.trim())),
      alignments: delimiterCells.map(parseAlignment),
      rows,
    },
    nextIndex: index,
  };
};

const splitTableRow = (line: string): string[] => {
  const trimmed = line.trim();
  const source =
    trimmed.startsWith("|") && trimmed.endsWith("|")
      ? trimmed.slice(1, -1)
      : trimmed
          .replace(LEADING_PIPE_PATTERN, "")
          .replace(TRAILING_PIPE_PATTERN, "");
  const cells: string[] = [];
  let cell = "";
  let escaped = false;

  for (const char of source) {
    if (escaped) {
      cell += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === "|") {
      cells.push(cell);
      cell = "";
      continue;
    }

    cell += char;
  }

  cells.push(cell);
  return cells;
};

const normalizeTableCells = (cells: string[], length: number): string[] =>
  Array.from({ length }, (_, index) => cells[index] ?? "");

const isDelimiterCell = (cell: string): boolean =>
  TABLE_DELIMITER_PATTERN.test(cell.trim());

const parseAlignment = (cell: string): TableAlignment => {
  const value = cell.trim();
  const left = value.startsWith(":");
  const right = value.endsWith(":");

  if (left && right) {
    return "center";
  }
  if (right) {
    return "right";
  }
  if (left) {
    return "left";
  }
  return undefined;
};

const parseHeading = (
  line: string
): { level: 1 | 2 | 3 | 4 | 5 | 6; text: string } | null => {
  const trimmed = line.trim();
  const heading = trimmed.match(HEADING_PATTERN);
  if (!heading) {
    return null;
  }

  return {
    level: heading[1]?.length as 1 | 2 | 3 | 4 | 5 | 6,
    text: heading[2] ?? "",
  };
};

const unescapeText = (value: string): string =>
  value.replace(/\\([\\`*_[\]{}()#+\-.!|>])/g, "$1");

const mergeTextNodes = (nodes: InlineNode[]): InlineNode[] => {
  const merged: InlineNode[] = [];

  for (const node of nodes) {
    const previous = merged.at(-1);
    if (node.type === "text" && previous?.type === "text") {
      previous.value += node.value;
    } else if (!(node.type === "text" && node.value.length === 0)) {
      merged.push(node);
    }
  }

  return merged;
};
