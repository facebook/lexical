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
  $findTableNode,
  $insertTableColumnAtSelection,
  $insertTableRowAtSelection,
  $isTableSelection,
  TableExtension,
  type TableNode,
} from '@lexical/table';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  configExtension,
  createCommand,
  defineExtension,
  type LexicalCommand,
} from 'lexical';

export type TableEdit =
  | 'row-above'
  | 'row-below'
  | 'column-left'
  | 'column-right'
  | 'delete-row'
  | 'delete-column'
  | 'delete-table';

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
            $insertTableRowAtSelection(edit === 'row-below');
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
