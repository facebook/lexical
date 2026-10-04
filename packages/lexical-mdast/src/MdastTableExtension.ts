/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {MdastHtmlExtension} from './MdastHtmlExtension';
import type {
  MdastExportHandler,
  MdastImportContext,
  MdastImportHandler,
  MdastNode,
} from './types';
import type {
  AlignType,
  Html,
  HtmlBlock,
  HtmlInline,
  PhrasingContent,
  Table,
  TableCell,
  TableRow,
} from 'mdast';

import {$getPeerDependency, configExtension} from '@lexical/extension';
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  TableCellHeaderStates,
  TableCellNode,
  TableNode,
  TableRowNode,
} from '@lexical/table';
import {
  $createParagraphNode,
  $getState,
  $isDecoratorNode,
  $isElementNode,
  arrayValue,
  createState,
  declarePeerDependency,
  defineExtension,
  enumValue,
  type LexicalNode,
  type ParagraphNode,
} from 'lexical';
import {gfmTableFromMarkdown, gfmTableToMarkdown} from 'mdast-util-gfm-table';
import {gfmTable} from 'micromark-extension-gfm-table';

import {$append} from './handlers';
import {MdastExtension} from './MdastExtension';

/** A GFM column alignment as mdast spells it; anything else reads as `null`. */
const alignValue = enumValue<AlignType>([null, 'left', 'center', 'right']);

/**
 * The per-column alignment (`| :-: |`) a table's delimiter row declared, as
 * imported before alignment moved to the cells' element format. Read on
 * export as the fallback for columns whose cells are not aligned.
 */
const tableAlignState = createState('mdastTableAlign', {
  parse: arrayValue(alignValue),
  resetOnCopyNode: true,
});

/**
 * The GFM alignment a cell renders with: its own element format (what
 * import sets, and what `FORMAT_ELEMENT_COMMAND` sets on a cell selection),
 * else the format its block children share (what that command sets with
 * the caret in a single cell).
 */
function $getCellAlign(cell: TableCellNode): AlignType {
  const own = alignValue(cell.getFormatType());
  if (own !== null) {
    return own;
  }
  let shared: AlignType | undefined;
  for (const child of cell.getChildren()) {
    if ($isElementNode(child) && !child.isInline()) {
      const align = alignValue(child.getFormatType());
      if (shared !== undefined && shared !== align) {
        return null;
      }
      shared = align;
    }
  }
  return shared || null;
}

/**
 * The number of line breaks an inline `<br>` run stands for (`<br>`,
 * `<br/>`, `<br />`, any case), or 0 when `node` is anything else. With
 * {@link MdastHtmlExtension} the tag arrives reassembled as `htmlInline`;
 * without it, as a plain `html` token.
 */
function brCount(node: MdastNode): number {
  if (
    (node.type !== 'html' && node.type !== 'htmlInline') ||
    ('children' in node && node.children.length > 0)
  ) {
    return 0;
  }
  const value = node.value.trim();
  return /^(?:<br\s*\/?>\s*)+$/i.test(value)
    ? value.split(/<br/i).length - 1
    : 0;
}

/**
 * A deep copy of `nodes` with each node that `replace` returns an array for
 * swapped for that array; the children of the others are mapped in turn.
 */
function mapPhrasing(
  nodes: readonly PhrasingContent[],
  replace: (node: PhrasingContent) => PhrasingContent[] | undefined,
): PhrasingContent[] {
  return nodes.flatMap(
    node =>
      replace(node) ||
      ('children' in node
        ? ({
            ...node,
            children: mapPhrasing(node.children, replace),
          } as PhrasingContent)
        : node),
  );
}

/**
 * A copy of `nodes` with every `<br>` nested inside other phrasing content
 * (`**a<br>b**`) replaced by hard `break`s, which import as line breaks.
 */
function nestedBrToBreaks(nodes: PhrasingContent[]): PhrasingContent[] {
  return mapPhrasing(nodes, node => {
    const count = brCount(node);
    if (count > 0) {
      return Array.from({length: count}, () => ({type: 'break'}));
    }
    return node.type === 'htmlInline' ? [node] : undefined;
  });
}

/** Trims the whitespace a `<br>` was written with (`a <br> b`). */
function trimSegment(segment: PhrasingContent[]): PhrasingContent[] {
  const result = segment.slice();
  const first = result[0];
  if (first && first.type === 'text') {
    result[0] = {...first, value: first.value.replace(/^[ \t]+/, '')};
  }
  const lastIndex = result.length - 1;
  const last = result[lastIndex];
  if (last && last.type === 'text') {
    result[lastIndex] = {...last, value: last.value.replace(/[ \t]+$/, '')};
  }
  return result.filter(node => node.type !== 'text' || node.value !== '');
}

/** The names of the block elements a cell's HTML can open with. */
const BLOCK_HTML_RE =
  /^\s*<(?:address|article|aside|blockquote|details|div|dl|figure|footer|h[1-6]|header|hr|ol|p|pre|section|ul)\b/i;

/**
 * Whether `node` is a block element written as one line of HTML in a cell
 * (`<ul><li>a</li></ul>`). Only {@link MdastHtmlExtension} reassembles such
 * a run into one `htmlInline` node.
 */
function isBlockHtml(node: MdastNode): node is HtmlInline {
  return node.type === 'htmlInline' && BLOCK_HTML_RE.test(node.value);
}

/**
 * Splits a cell's phrasing content into lines, one paragraph each, and the
 * blocks written as HTML between them. GFM cells can't contain a newline,
 * so `<br>` is the conventional line separator; it imports as a paragraph
 * boundary, which is what Enter inserts in a table cell, so typed lines
 * round-trip. A block ends the line before it without a `<br>`, so a `<br>`
 * next to a block stands for an empty line on that side
 * (see {@link joinCellItems}).
 */
function cellItems(cell: TableCell): (PhrasingContent[] | HtmlInline)[] {
  const items: (PhrasingContent[] | HtmlInline)[] = [];
  // The open line, or null right after a block.
  let line: PhrasingContent[] | null = [];
  const endLine = () => {
    if (line !== null) {
      items.push(trimSegment(nestedBrToBreaks(line)));
    }
  };
  for (const child of cell.children) {
    const count = brCount(child);
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        endLine();
        line = [];
      }
    } else if (isBlockHtml(child)) {
      if (line !== null && trimSegment(line).length > 0) {
        endLine();
      }
      items.push(child);
      line = null;
    } else if (
      line !== null ||
      child.type !== 'text' ||
      child.value.trim() !== ''
    ) {
      line = line || [];
      line.push(child);
    }
  }
  endLine();
  return items;
}

/**
 * Imports a block written as HTML in a cell through
 * {@link MdastHtmlExtension}'s block import, which keeps its block
 * structure where an inline run would be flattened into the line.
 */
function $importBlockHtml(
  node: HtmlInline,
  ctx: MdastImportContext,
): LexicalNode[] {
  const block: HtmlBlock = {
    // The phrasing children are pre-imported into their placeholders the
    // same way block children are.
    children: node.children as unknown as HtmlBlock['children'],
    type: 'htmlBlock',
    value: node.value,
  };
  // Inline output (from a block tag no DOM rule handles) gets a paragraph.
  const blocks: LexicalNode[] = [];
  let paragraph: ParagraphNode | null = null;
  for (const child of ctx.importNode(block)) {
    if (
      ($isElementNode(child) || $isDecoratorNode(child)) &&
      !child.isInline()
    ) {
      blocks.push(child);
      paragraph = null;
    } else {
      if (paragraph === null) {
        paragraph = $createParagraphNode();
        blocks.push(paragraph);
      }
      $append(paragraph, [child]);
    }
  }
  return blocks;
}

const $importTable: MdastImportHandler<Table> = (node, ctx) => {
  const align = node.align || [];
  return $append(
    $createTableNode(),
    node.children.map((row, rowIndex) =>
      $append(
        $createTableRowNode(),
        row.children.map((cell, columnIndex) => {
          const cellNode = $createTableCellNode(
            rowIndex === 0
              ? TableCellHeaderStates.ROW
              : TableCellHeaderStates.NO_STATUS,
          );
          // Every cell of the column carries the alignment, so it renders as
          // the cell's text-align and moves with the cells when columns are
          // edited.
          return $append(
            cellNode.setFormat(align[columnIndex] || ''),
            cellItems(cell).flatMap(item =>
              Array.isArray(item)
                ? [
                    $append(
                      $createParagraphNode(),
                      ctx.importChildren({children: item, type: 'tableCell'}),
                    ),
                  ]
                : $importBlockHtml(item, ctx),
            ),
          );
        }),
      ),
    ),
  );
};

function html(value: string): Html {
  return {type: 'html', value};
}

/** The line separator inside a GFM table cell, which can't hold a newline. */
function lineBreakHtml(): Html {
  return html('<br>');
}

/**
 * Rewrites the line breaks in exported phrasing content (`break` nodes and
 * newlines inside text) as `<br>`. Left alone, gfm-table would serialize
 * them as spaces, losing the line structure.
 */
function breaksToHtml(nodes: readonly PhrasingContent[]): PhrasingContent[] {
  return mapPhrasing(nodes, node => {
    if (node.type === 'break') {
      return [lineBreakHtml()];
    }
    if (node.type === 'text' && /[\r\n]/.test(node.value)) {
      return joinLines(
        node.value
          .split(/\r?\n|\r/)
          .map((value): PhrasingContent[] =>
            value ? [{type: 'text', value}] : [],
          ),
      );
    }
    return undefined;
  });
}

/** Joins lines of phrasing content with `<br>`, keeping empty lines. */
function joinLines(lines: readonly PhrasingContent[][]): PhrasingContent[] {
  return lines.flatMap((line, i) =>
    i > 0 ? [lineBreakHtml(), ...line] : line,
  );
}

/**
 * Flattens the mdast a cell's children exported to into lines of phrasing
 * content: a GFM cell holds a single line of inline content, so every block
 * (paragraph, heading, list item, code line) becomes its own line.
 */
function cellContentLines(nodes: readonly MdastNode[]): PhrasingContent[][] {
  const lines: PhrasingContent[][] = [];
  const visit = (node: MdastNode) => {
    switch (node.type) {
      case 'paragraph':
      case 'heading':
      case 'tableCell':
        lines.push(breaksToHtml(node.children));
        return;
      case 'code':
        for (const value of node.value.split(/\r?\n|\r/)) {
          lines.push(value ? [{type: 'inlineCode', value}] : []);
        }
        return;
      case 'html':
        lines.push([
          {type: 'html', value: node.value.replace(/\s*\n\s*/g, ' ')},
        ]);
        return;
      case 'thematicBreak':
      case 'definition':
        return;
    }
    if ('children' in node) {
      node.children.forEach(visit);
    } else if ('value' in node) {
      // Phrasing content exported at the cell's top level (an inline
      // decorator's fallback, for one) stays on the current line.
      const phrasing = breaksToHtml([node as PhrasingContent]);
      if (lines.length === 0) {
        lines.push([]);
      }
      lines[lines.length - 1].push(...phrasing);
    }
  };
  nodes.forEach(visit);
  return lines;
}

/**
 * Whether `value`'s characters can go in an HTML attribute value as is.
 */
function isPlainAttribute(value: string): boolean {
  return /^[\w.+#-]+$/.test(value);
}

/**
 * Exported blocks as one line of HTML tags around their Markdown phrasing
 * (paragraphs as bare lines separated by `<br>`), or null when one of them
 * has no such form.
 */
function flowHtml(nodes: readonly MdastNode[]): PhrasingContent[] | null {
  const result: PhrasingContent[] = [];
  let afterLine = false;
  for (const node of nodes) {
    if (node.type === 'paragraph') {
      if (afterLine) {
        result.push(lineBreakHtml());
      }
      result.push(...breaksToHtml(node.children));
      afterLine = true;
    } else {
      const block = blockHtml(node);
      if (block === null) {
        return null;
      }
      result.push(...block);
      afterLine = false;
    }
  }
  return result;
}

/**
 * An exported block as one line of HTML around its Markdown phrasing, which
 * GFM allows in a cell, or null for a block with no such form here.
 */
function blockHtml(node: MdastNode): PhrasingContent[] | null {
  const wrap = (
    open: string,
    content: PhrasingContent[] | null,
    close: string,
  ): PhrasingContent[] | null =>
    content && [html(open), ...content, html(close)];
  switch (node.type) {
    case 'heading':
      return wrap(
        `<h${node.depth}>`,
        breaksToHtml(node.children),
        `</h${node.depth}>`,
      );
    case 'blockquote':
      return wrap('<blockquote>', flowHtml(node.children), '</blockquote>');
    case 'list': {
      const tag = node.ordered ? 'ol' : 'ul';
      let attributes =
        node.ordered && typeof node.start === 'number' && node.start !== 1
          ? ` start="${node.start}"`
          : '';
      // The classes GitHub renders task lists with, which the list DOM
      // import rules read back as a check list.
      if (node.children.some(item => typeof item.checked === 'boolean')) {
        attributes += ' class="contains-task-list"';
      }
      return wrap(
        `<${tag}${attributes}>`,
        flowHtml(node.children),
        `</${tag}>`,
      );
    }
    case 'listItem':
      return wrap(
        typeof node.checked === 'boolean'
          ? `<li class="task-list-item"><input type="checkbox" disabled${
              node.checked ? ' checked' : ''
            }>`
          : '<li>',
        flowHtml(node.children),
        '</li>',
      );
    case 'code':
      return wrap(
        node.lang && isPlainAttribute(node.lang)
          ? `<pre data-language="${node.lang}">`
          : '<pre>',
        joinLines(
          node.value
            .split(/\r?\n|\r/)
            .map((value): PhrasingContent[] =>
              value ? [{type: 'text', value}] : [],
            ),
        ),
        '</pre>',
      );
    case 'thematicBreak':
      return [html('<hr>')];
    case 'html':
      return [html(node.value.replace(/\s*\n\s*/g, ' '))];
  }
  return null;
}

/**
 * A cell's exported blocks as lines of phrasing content and, with
 * {@link MdastHtmlExtension}, blocks written as one line of HTML.
 * Without it, every block is flattened into lines (see
 * {@link cellContentLines}).
 */
function cellExportItems(
  nodes: readonly MdastNode[],
  withHtml: boolean,
): {block: boolean; content: PhrasingContent[]}[] {
  const items: {block: boolean; content: PhrasingContent[]}[] = [];
  let pending: MdastNode[] = [];
  const flush = () => {
    for (const content of cellContentLines(pending)) {
      items.push({block: false, content});
    }
    pending = [];
  };
  for (const node of nodes) {
    const block =
      withHtml && node.type !== 'paragraph' ? blockHtml(node) : null;
    if (block === null) {
      pending.push(node);
    } else {
      flush();
      items.push({block: true, content: block});
    }
  }
  flush();
  return items;
}

/**
 * Joins a cell's items into its content, the inverse of
 * {@link cellItems}: lines are separated by `<br>`, and a block needs none
 * unless the line beside it is empty. Empty lines are kept as consecutive
 * (or leading/trailing) `<br>`s, which import back as the same empty
 * paragraphs.
 */
function joinCellItems(
  items: readonly {block: boolean; content: PhrasingContent[]}[],
): PhrasingContent[] {
  return items.flatMap((item, i) => {
    const prev = items[i - 1];
    const needsBreak =
      prev !== undefined &&
      (prev.block
        ? !item.block && item.content.length === 0
        : !item.block || prev.content.length === 0);
    return needsBreak ? [lineBreakHtml(), ...item.content] : item.content;
  });
}

/** Whether the editor writes cell blocks as HTML: its HTML peer is there. */
function $hasHtmlPeer(): boolean {
  return (
    $getPeerDependency<typeof MdastHtmlExtension>('@lexical/mdast/Html') !==
    undefined
  );
}

const $exportTable: MdastExportHandler = (node, ctx) => {
  if (!$isTableNode(node)) {
    return null;
  }
  const rows: TableRow[] = [];
  const legacyAlign = $getState(node, tableAlignState);
  const align: AlignType[] = [];
  const withHtml = $hasHtmlPeer();
  for (const row of node.getChildren()) {
    // Structural iteration bypasses the walk's selection filter, so rows a
    // selection export does not reach are skipped here. Cells stay: dropping
    // one would shift the remaining cells into other columns.
    if (!$isTableRowNode(row) || !ctx.isIncluded(row)) {
      continue;
    }
    const cells: TableCell[] = [];
    for (const cell of row.getChildren()) {
      if (!$isTableCellNode(cell)) {
        continue;
      }
      // A column takes the alignment of its first cell that has one, so a
      // row inserted above the header doesn't clear it.
      const column = cells.length;
      align[column] =
        align[column] || $getCellAlign(cell) || legacyAlign[column] || null;
      cells.push({
        children: joinCellItems(
          cellExportItems(ctx.exportChildren(cell), withHtml),
        ),
        type: 'tableCell',
      });
    }
    rows.push({children: cells, type: 'tableRow'});
  }
  return {
    align,
    children: rows,
    type: 'table',
  };
};

/**
 * GFM tables, mapped to `@lexical/table` nodes. Opt-in (not part of
 * {@link MdastCommonMarkExtension}) because it pulls in the `@lexical/table`
 * nodes it ships. The first table row is treated as the header row in both
 * directions. A GFM cell holds a single line, so the paragraphs and line
 * breaks in a cell are written as `<br>`, and `<br>` reads back as a
 * paragraph boundary. With {@link MdastHtmlExtension} in the editor, the
 * other blocks in a cell (lists, headings, quotes, code) are written as one
 * line of HTML and read back as blocks; without it they are flattened into
 * lines. Column alignment is the element format of the column's cells
 * (`TableCellNode.setFormat`).
 *
 * @example
 * ```ts
 * import {MdastShortcutsExtension, MdastTableExtension} from '@lexical/mdast';
 * import {buildEditorFromExtensions} from '@lexical/extension';
 * import {defineExtension} from 'lexical';
 *
 * const editor = buildEditorFromExtensions(
 *   defineExtension({
 *     dependencies: [MdastShortcutsExtension, MdastTableExtension],
 *     name: '[root]',
 *   }),
 * );
 * ```
 * @experimental
 */
export const MdastTableExtension = defineExtension({
  dependencies: [
    configExtension(MdastExtension, {
      exportRules: [{$export: $exportTable, type: TableNode}],
      importRules: [{$import: $importTable, type: 'table'}],
      mdastExtensions: [/* @__PURE__ */ gfmTableFromMarkdown()],
      micromarkExtensions: [/* @__PURE__ */ gfmTable()],
      toMarkdownExtensions: [/* @__PURE__ */ gfmTableToMarkdown()],
    }),
  ],
  name: '@lexical/mdast/Table',
  nodes: [TableNode, TableRowNode, TableCellNode],
  // With it, blocks a cell's single line can't express in Markdown are
  // written as HTML.
  peerDependencies: [
    declarePeerDependency<typeof MdastHtmlExtension>('@lexical/mdast/Html'),
  ],
});
