# taro-streamdown

A lightweight Taro-compatible Markdown renderer for Streamdown.

This package focuses on mini-program friendly rendering for text and tables. It
does not import `@tarojs/components` at runtime; the default output uses Taro JSX
tags such as `view`, `text`, and `scroll-view`.

## Installation

```bash
pnpm add taro-streamdown
```

Peer dependencies:

```bash
pnpm add react @tarojs/components
```

## Tailwind Setup

Add the built package to your Tailwind source scanning so the default utility
classes are generated.

```css
@source "../node_modules/taro-streamdown/dist/*.js";
```

Adjust the path based on where your CSS file lives. In a monorepo, this may need
to point at the hoisted root `node_modules`.

## Usage

```tsx
import { Streamdown } from "taro-streamdown";

const markdown = `
# Title

Plain text with **bold**, *emphasis*, and \`inline code\`.

| Name | Count |
| :--- | ---: |
| Apples | 3 |
| Pears | 12 |
`;

export function Message() {
  return <Streamdown>{markdown}</Streamdown>;
}
```

The default export is also `Streamdown`.

```tsx
import Streamdown from "taro-streamdown";
```

## Supported Markdown

- Paragraph text
- ATX headings from `#` through `######`
- Inline `**strong**`, `*emphasis*`, and `` `inline code` ``
- GFM-style tables with left, center, and right alignment
- Escaped pipes inside table cells, for example `x\|y`

Other Markdown elements are intentionally not rendered as special elements.

## Styling

Default styles are implemented with Tailwind classes. Every rendered element also
has a stable `taro-streamdown-*` class so app-level styles can override the
defaults.

Headings use:

| Markdown | Default classes |
| --- | --- |
| `#` | `text-3xl font-semibold` |
| `##` | `text-2xl font-semibold` |
| `###` | `text-xl font-semibold` |
| `####` | `text-lg font-semibold` |
| `#####` | `text-base font-semibold` |
| `######` | `text-base font-semibold` |

Available override classes:

| Element | Classes |
| --- | --- |
| Root | `taro-streamdown-root` |
| Paragraph | `taro-streamdown-paragraph` |
| Heading | `taro-streamdown-heading`, `taro-streamdown-h1` through `taro-streamdown-h6` |
| Text | `taro-streamdown-text` |
| Strong | `taro-streamdown-strong` |
| Emphasis | `taro-streamdown-emphasis` |
| Inline code | `taro-streamdown-inline-code` |
| Table container | `taro-streamdown-table-container` |
| Table | `taro-streamdown-table` |
| Table header row | `taro-streamdown-table-header-row` |
| Table row | `taro-streamdown-table-row` |
| Table header cell | `taro-streamdown-table-header-cell` |
| Table cell | `taro-streamdown-table-cell` |
| Alignment | `taro-streamdown-align-left`, `taro-streamdown-align-center`, `taro-streamdown-align-right` |

Example override:

```css
.taro-streamdown-root .taro-streamdown-h1 {
  margin-bottom: 16px;
}

.taro-streamdown-table-cell {
  border-color: #d1d5db;
}
```

Table borders are visually collapsed by using `-mt-px` on body rows and `-ml-px`
on non-first cells.

## Custom Components

You can replace the default Taro JSX tags by passing `components`. This is useful
when your app wraps Taro primitives.

```tsx
import { Text, View } from "@tarojs/components";
import { Streamdown } from "taro-streamdown";

<Streamdown
  components={{
    root: View,
    paragraph: View,
    text: Text,
    strong: Text,
  }}
>
  {"Hello **Taro**"}
</Streamdown>;
```

## Props

```ts
interface StreamdownProps {
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
```

`mode`, `normalizeHtmlIndentation`, and `parseIncompleteMarkdown` are accepted
for compatibility with Streamdown usage patterns. The Taro package keeps parsing
minimal and currently does not implement the full web renderer feature set.
