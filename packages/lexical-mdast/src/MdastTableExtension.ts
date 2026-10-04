/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {MdastExportHandler, MdastImportHandler, MdastNode} from './types';
import type {
  AlignType,
  Html,
  PhrasingContent,
  Table,
  TableCell,
  TableRow,
} from 'mdast';

import {configExtension} from '@lexical/extension';
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
  $isElementNode,
  createState,
  defineExtension,
} from 'lexical';
import {gfmTableFromMarkdown, gfmTableToMarkdown} from 'mdast-util-gfm-table';
import {gfmTable} from 'micromark-extension-gfm-table';

import {$append} from './handlers';
import {MdastExtension} from './MdastExtension';

function parseAlign(v: unknown): AlignType {
  return v === 'center' || v === 'left' || v === 'right' ? v : null;
}

/**
 * The per-column alignment (`| :-: |`) a table's delimiter row declared, as
 * imported before alignment moved to the cells' element format. Read on
 * export as the fallback for columns whose cells are not aligned.
 */
const tableAlignState = createState('mdastTableAlign', {
  parse: (v): AlignType[] => (Array.isArray(v) ? v.map(parseAlign) : []),
  resetOnCopyNode: true,
});

/**
 * The GFM alignment a cell renders with: its own element format (what
 * import sets, and what `FORMAT_ELEMENT_COMMAND` sets on a cell selection),
 * else the format its block children share (what that command sets with
 * the caret in a single cell).
 */
function $getCellAlign(cell: TableCellNode): AlignType {
  const own = parseAlign(cell.getFormatType());
  if (own !== null) {
    return own;
  }
  let shared: AlignType | undefined;
  for (const child of cell.getChildren()) {
    if ($isElementNode(child) && !child.isInline()) {
      const align = parseAlign(child.getFormatType());
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
 * A copy of `nodes` with every `<br>` nested inside other phrasing content
 * (`**a<br>b**`) replaced by hard `break`s, which import as line breaks.
 */
function nestedBrToBreaks(nodes: PhrasingContent[]): PhrasingContent[] {
  const result: PhrasingContent[] = [];
  for (const node of nodes) {
    const count = brCount(node);
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        result.push({type: 'break'});
      }
    } else if ('children' in node && node.type !== 'htmlInline') {
      result.push({
        ...node,
        children: nestedBrToBreaks(node.children as PhrasingContent[]),
      } as PhrasingContent);
    } else {
      result.push(node);
    }
  }
  return result;
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

/**
 * Splits a cell's phrasing content into one paragraph per line. GFM cells
 * can't contain a newline, so `<br>` is the conventional line separator; it
 * imports as a paragraph boundary, which is what Enter inserts in a table
 * cell, so typed lines round-trip.
 */
function cellLines(cell: TableCell): PhrasingContent[][] {
  const lines: PhrasingContent[][] = [[]];
  for (const child of cell.children) {
    const count = brCount(child);
    for (let i = 0; i < count; i++) {
      lines.push([]);
    }
    if (count === 0) {
      lines[lines.length - 1].push(child);
    }
  }
  return lines.map(line => trimSegment(nestedBrToBreaks(line)));
}

const $importTable: MdastImportHandler<Table> = (node, ctx) => {
  const table = $createTableNode();
  const align = node.align || [];
  node.children.forEach((row, rowIndex) => {
    const rowNode = $createTableRowNode();
    row.children.forEach((cell, columnIndex) => {
      const cellNode = $createTableCellNode(
        rowIndex === 0
          ? TableCellHeaderStates.ROW
          : TableCellHeaderStates.NO_STATUS,
      );
      const cellAlign = align[columnIndex];
      if (cellAlign) {
        // Every cell of the column carries it, so it renders as the cell's
        // text-align and moves with the cells when columns are edited.
        cellNode.setFormat(cellAlign);
      }
      for (const line of cellLines(cell)) {
        const paragraph = $createParagraphNode();
        $append(
          paragraph,
          ctx.importChildren({children: line, type: 'tableCell'}),
        );
        $append(cellNode, [paragraph]);
      }
      $append(rowNode, [cellNode]);
    });
    $append(table, [rowNode]);
  });
  return table;
};

/** The line separator inside a GFM table cell, which can't hold a newline. */
function lineBreakHtml(): Html {
  return {type: 'html', value: '<br>'};
}

/**
 * Rewrites the line breaks in exported phrasing content (`break` nodes and
 * newlines inside text) as `<br>`. Left alone, gfm-table would serialize
 * them as spaces, losing the line structure.
 */
function breaksToHtml(nodes: readonly PhrasingContent[]): PhrasingContent[] {
  const result: PhrasingContent[] = [];
  for (const node of nodes) {
    if (node.type === 'break') {
      result.push(lineBreakHtml());
    } else if (node.type === 'text' && /[\r\n]/.test(node.value)) {
      node.value.split(/\r?\n|\r/).forEach((value, i) => {
        if (i > 0) {
          result.push(lineBreakHtml());
        }
        if (value) {
          result.push({type: 'text', value});
        }
      });
    } else if ('children' in node) {
      result.push({
        ...node,
        children: breaksToHtml(node.children as PhrasingContent[]),
      } as PhrasingContent);
    } else {
      result.push(node);
    }
  }
  return result;
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

const $exportTable: MdastExportHandler = (node, ctx) => {
  if (!$isTableNode(node)) {
    return null;
  }
  const rows: TableRow[] = [];
  const legacyAlign = $getState(node, tableAlignState);
  const align: AlignType[] = [];
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
      const lines = cellContentLines(ctx.exportChildren(cell));
      // Empty lines are kept as consecutive (or leading/trailing) `<br>`s,
      // which import back as the same empty paragraphs.
      const children: TableCell['children'] = [];
      lines.forEach((line, i) => {
        if (i > 0) {
          children.push(lineBreakHtml());
        }
        children.push(...line);
      });
      cells.push({children, type: 'tableCell'});
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
 * paragraph boundary. Column alignment is the element format of the
 * column's cells (`TableCellNode.setFormat`).
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
});
