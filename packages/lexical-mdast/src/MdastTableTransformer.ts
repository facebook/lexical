/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  MdastExportHandler,
  MdastImportHandler,
  MdastTransformer,
} from './types';
import type {Table, TableCell, TableRow} from 'mdast';

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
import {$createParagraphNode, $isElementNode} from 'lexical';
import {gfmTableFromMarkdown, gfmTableToMarkdown} from 'mdast-util-gfm-table';
import {gfmTable} from 'micromark-extension-gfm-table';

const $importTable: MdastImportHandler<Table> = (node, ctx) => {
  const table = $createTableNode();
  node.children.forEach((row, rowIndex) => {
    const rowNode = $createTableRowNode();
    for (const cell of row.children) {
      const cellNode = $createTableCellNode(
        rowIndex === 0
          ? TableCellHeaderStates.ROW
          : TableCellHeaderStates.NO_STATUS,
      );
      const paragraph = $createParagraphNode();
      paragraph.append(...ctx.importChildren(cell));
      cellNode.append(paragraph);
      rowNode.append(cellNode);
    }
    table.append(rowNode);
  });
  return table;
};

const exportTable: MdastExportHandler = (node, ctx) => {
  if (!$isTableNode(node)) {
    return null;
  }
  const rows: TableRow[] = [];
  for (const row of node.getChildren()) {
    if (!$isTableRowNode(row)) {
      continue;
    }
    const cells: TableCell[] = [];
    for (const cell of row.getChildren()) {
      if (!$isTableCellNode(cell)) {
        continue;
      }
      const children: TableCell['children'] = [];
      for (const child of cell.getChildren()) {
        if ($isElementNode(child)) {
          children.push(...(ctx.exportInline(child) as TableCell['children']));
        }
      }
      cells.push({children, type: 'tableCell'});
    }
    rows.push({children: cells, type: 'tableRow'});
  }
  return {align: [], children: rows, type: 'table'};
};

/**
 * GFM tables, mapped to `@lexical/table` nodes. This is opt-in (not part of the
 * default {@link TRANSFORMERS}) because it requires the `@lexical/table` nodes
 * to be registered on the editor. The first table row is treated as the header
 * row in both directions.
 */
export const TABLE_TRANSFORMER: MdastTransformer = {
  dependencies: [TableNode, TableRowNode, TableCellNode],
  exportHandlers: {table: exportTable},
  importHandlers: {table: $importTable},
  mdastExtensions: [gfmTableFromMarkdown()],
  micromarkExtensions: [gfmTable()],
  name: '@lexical/mdast/gfm-table',
  toMarkdownExtensions: [gfmTableToMarkdown()],
};
