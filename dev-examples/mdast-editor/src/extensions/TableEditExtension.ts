/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $deleteTableColumnAtSelection,
  $deleteTableRowAtSelection,
  $findCellNode,
  $findTableNode,
  $getTableColumnIndexFromTableCellNode,
  $insertTableColumnAtSelection,
  $insertTableRowAtSelection,
  $isTableCellNode,
  $isTableRowNode,
  $isTableSelection,
  type TableCellNode,
  TableExtension,
  type TableNode,
  type TableRowNode,
} from '@lexical/table';
import {
  $createParagraphNode,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  configExtension,
  createCommand,
  defineExtension,
  type ElementFormatType,
  type LexicalCommand,
} from 'lexical';

export type TableEdit =
  | 'row-above'
  | 'row-below'
  | 'column-left'
  | 'column-right'
  | 'delete-row'
  | 'delete-column'
  | 'delete-table'
  | 'align-left'
  | 'align-center'
  | 'align-right'
  | 'align-none';

const COLUMN_ALIGN = {
  'align-center': 'center',
  'align-left': 'left',
  'align-none': '',
  'align-right': 'right',
} as const;

// The alignments GFM writes for a column.
const GFM_ALIGN = /^(?:left|center|right)$/;

/**
 * Aligns every column the selection touches. GFM alignment belongs to a
 * column (the delimiter row's `:-:`), so it is set as the element format of
 * each cell in the column, which `@lexical/mdast` renders as `text-align`
 * and exports. The cells' paragraphs aligned in a way GFM writes are reset
 * so they follow the cell; others (justified) keep their format.
 */
function $alignSelectedColumns(table: TableNode, format: ElementFormatType) {
  const selection = $getSelection();
  const cells = $isTableSelection(selection)
    ? selection.getNodes().filter($isTableCellNode)
    : [
        $isRangeSelection(selection)
          ? $findCellNode(selection.anchor.getNode())
          : null,
      ];
  const columns = new Set<number>();
  for (const cell of cells) {
    if (cell) {
      columns.add($getTableColumnIndexFromTableCellNode(cell));
    }
  }
  for (const row of table.getChildren()) {
    if (!$isTableRowNode(row)) {
      continue;
    }
    const rowCells = row.getChildren();
    for (const column of columns) {
      const cell = rowCells[column];
      if ($isTableCellNode(cell)) {
        cell.setFormat(format);
        for (const child of cell.getChildren()) {
          if (
            $isElementNode(child) &&
            !child.isInline() &&
            GFM_ALIGN.test(child.getFormatType())
          ) {
            child.setFormat('');
          }
        }
      }
    }
  }
}

/**
 * The GFM alignment a cell renders with, as `@lexical/mdast` exports it:
 * the one its blocks share, each with its own or else the cell's.
 */
function $getCellAlign(cell: TableCellNode): ElementFormatType {
  const own = cell.getFormatType();
  let shared: ElementFormatType | undefined;
  for (const child of cell.getChildren()) {
    if ($isElementNode(child) && !child.isInline()) {
      const format = child.getFormatType();
      const align = GFM_ALIGN.test(format) ? format : own;
      if (shared !== undefined && shared !== align) {
        return '';
      }
      shared = align;
    }
  }
  const align = shared ?? own;
  return GFM_ALIGN.test(align) ? align : '';
}

/**
 * Gives the cells of an inserted row the alignment of their column, which
 * the row beside it has, on its cells or on their paragraphs.
 */
function $alignInsertedRow(row: TableRowNode | null) {
  const beside = row && (row.getPreviousSibling() ?? row.getNextSibling());
  if ($isTableRowNode(beside)) {
    const besideCells = beside.getChildren();
    row!.getChildren().forEach((cell, i) => {
      const from = besideCells[i];
      if ($isTableCellNode(cell) && $isTableCellNode(from)) {
        cell.setFormat($getCellAlign(from));
      }
    });
  }
}

/**
 * Edits the structure of the table the selection is in. The toolbar
 * dispatches this rather than calling the `@lexical/table` helpers itself,
 * so this extension owns table editing behavior.
 */
export const TABLE_EDIT_COMMAND: LexicalCommand<TableEdit> =
  createCommand('TABLE_EDIT_COMMAND');

/**
 * The table the current selection is in, or null when it is outside one.
 */
export function $getSelectedTable(): TableNode | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) && !$isTableSelection(selection)) {
    return null;
  }
  const anchorTable = $findTableNode(selection.anchor.getNode());
  return anchorTable !== null &&
    anchorTable.is($findTableNode(selection.focus.getNode()))
    ? anchorTable
    : null;
}

/**
 * GFM tables, as `@lexical/table` nodes with the table editing behavior
 * (cell selection, Tab navigation, horizontal scroll) and structure
 * commands. Markdown tables have a header row and plain cells, so the
 * features GFM can't express (merged cells, cell background colors, nested
 * tables) are turned off rather than silently dropped on export.
 */
export const TableEditExtension = defineExtension({
  dependencies: [
    configExtension(TableExtension, {
      hasCellBackgroundColor: false,
      hasCellMerge: false,
      hasNestedTables: false,
    }),
  ],
  name: '@lexical/dev-mdast-editor-example/TableEdit',
  register(editor) {
    return editor.registerCommand(
      TABLE_EDIT_COMMAND,
      edit => {
        const table = $getSelectedTable();
        if (!editor.isEditable() || table === null) {
          return false;
        }
        switch (edit) {
          case 'row-above':
          case 'row-below':
            $alignInsertedRow($insertTableRowAtSelection(edit === 'row-below'));
            break;
          case 'column-left':
          case 'column-right':
            $insertTableColumnAtSelection(edit === 'column-right');
            break;
          case 'delete-row':
            $deleteTableRowAtSelection();
            break;
          case 'delete-column':
            $deleteTableColumnAtSelection();
            break;
          case 'align-left':
          case 'align-center':
          case 'align-right':
          case 'align-none':
            $alignSelectedColumns(table, COLUMN_ALIGN[edit]);
            break;
          case 'delete-table': {
            const paragraph = $createParagraphNode();
            table.replace(paragraph);
            paragraph.select();
            break;
          }
        }
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  },
});
