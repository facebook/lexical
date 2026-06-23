/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {MdastExportHandler, MdastImportHandler} from './types';
import type {Table, TableCell, TableRow} from 'mdast';

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
import {$createParagraphNode, $isElementNode, defineExtension} from 'lexical';
import {gfmTableFromMarkdown, gfmTableToMarkdown} from 'mdast-util-gfm-table';
import {gfmTable} from 'micromark-extension-gfm-table';

import {MdastExtension} from './MdastExtension';

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
 * GFM tables, mapped to `@lexical/table` nodes. Opt-in (not part of
 * {@link MdastCommonMarkExtension}) because it pulls in the `@lexical/table`
 * nodes it ships. The first table row is treated as the header row in both
 * directions.
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
 */
export const MdastTableExtension = /* @__PURE__ */ defineExtension({
  dependencies: [
    /* @__PURE__ */ configExtension(MdastExtension, {
      exportRules: [{$export: exportTable, type: 'table'}],
      importRules: [{$import: $importTable, type: 'table'}],
      mdastExtensions: [gfmTableFromMarkdown()],
      micromarkExtensions: [gfmTable()],
      toMarkdownExtensions: [gfmTableToMarkdown()],
    }),
  ],
  name: '@lexical/mdast/Table',
  nodes: [TableNode, TableRowNode, TableCellNode],
});
