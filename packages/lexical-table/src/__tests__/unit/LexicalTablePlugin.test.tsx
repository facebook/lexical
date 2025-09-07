/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $isTableNode,
  INSERT_TABLE_COMMAND,
  registerTablePlugin,
  TableCellNode,
  TableNode,
  TableRowNode,
} from '@lexical/table';
import {
  $getRoot,
  $getSelection,
  $isElementNode,
  $setSelection,
  createEditor,
  LexicalEditor,
  SELECTION_INSERT_CLIPBOARD_NODES_COMMAND,
} from 'lexical';
import {beforeEach, describe, expect, test} from 'vitest';

describe('LexicalTablePlugin', () => {
  let editor: LexicalEditor;

  beforeEach(async () => {
    const testConfig = {
      namespace: 'test',
      nodes: [TableNode, TableCellNode, TableRowNode],
      onError: (error: Error) => {
        throw error;
      },
      theme: {},
    };
    editor = createEditor(testConfig);
    editor._headless = true;
    registerTablePlugin(editor);
  });

  test('INSERT_TABLE_COMMAND inserts a table', async () => {
    editor.update(
      () => {
        const root = $getRoot();
        root.select();
        editor.dispatchCommand(INSERT_TABLE_COMMAND, {
          columns: '3',
          rows: '2',
        });
      },
      {discrete: true},
    );

    editor.getEditorState().read(() => {
      const root = $getRoot();
      const table = root.getFirstChild();

      expect($isTableNode(table)).toBe(true);

      if (!$isTableNode(table)) {
        throw new Error('Expected table node');
      }

      const rows = table.getChildren();
      expect(rows.length).toBe(2);
      const firstRow = rows[0];
      if (!$isElementNode(firstRow)) {
        throw new Error('Expected row node');
      }
      const firstRowCells = firstRow.getChildren();
      expect(firstRowCells.length).toBe(3);
    });
  });

  test('INSERT_TABLE_COMMAND inserts a table when the editor is blurred', async () => {
    editor.update(
      () => {
        const root = $getRoot();
        root.select();
      },
      {discrete: true},
    );

    editor.update(
      () => {
        // Simulate a blur event
        $setSelection(null);
        editor.dispatchCommand(INSERT_TABLE_COMMAND, {
          columns: '3',
          rows: '2',
        });
      },
      {discrete: true},
    );

    editor.getEditorState().read(() => {
      const root = $getRoot();
      const table = root.getFirstChild();

      expect($isTableNode(table)).toBe(true);
    });
  });

  test('INSERT_TABLE_COMMAND handler prevents nested tables', async () => {
    await editor.update(() => {
      const root = $getRoot();
      const table = $createTableNode();
      const row = $createTableRowNode();
      const cell = $createTableCellNode();
      row.append(cell);
      table.append(row);
      root.append(table);
      cell.select();
    });

    // Try to insert a table inside the cell
    await editor.update(() => {
      editor.dispatchCommand(INSERT_TABLE_COMMAND, {
        columns: '2',
        rows: '2',
      });
    });

    // Verify no nested table was created
    await editor.getEditorState().read(() => {
      const root = $getRoot();
      const table = root.getFirstChild();
      if (!$isTableNode(table)) {
        throw new Error('Expected table node');
      }
      const row = table.getFirstChild();
      if (!$isElementNode(row)) {
        throw new Error('Expected row node');
      }
      const cell = row.getFirstChild();
      if (!$isElementNode(cell)) {
        throw new Error('Expected cell node');
      }
      const cellChildren = cell.getChildren();
      expect(cellChildren.some($isTableNode)).toBe(false);
    });
  });

  test('SELECTION_INSERT_CLIPBOARD_NODES_COMMAND handler prevents pasting tables in cells', async () => {
    await editor.update(() => {
      const root = $getRoot();
      const table = $createTableNode();
      const row = $createTableRowNode();
      const cell = $createTableCellNode();
      row.append(cell);
      table.append(row);
      root.append(table);
      cell.select();
    });

    // Try to paste a table inside the cell
    await editor.update(() => {
      const tableNode = $createTableNode();
      const selection = $getSelection();
      if (selection === null) {
        throw new Error('Expected valid selection');
      }
      editor.dispatchCommand(SELECTION_INSERT_CLIPBOARD_NODES_COMMAND, {
        nodes: [tableNode],
        selection,
      });
    });

    // Verify no nested table was created
    await editor.getEditorState().read(() => {
      const root = $getRoot();
      const table = root.getFirstChild();
      if (!$isTableNode(table)) {
        throw new Error('Expected table node');
      }
      const row = table.getFirstChild();
      if (!$isElementNode(row)) {
        throw new Error('Expected row node');
      }
      const cell = row.getFirstChild();
      if (!$isElementNode(cell)) {
        throw new Error('Expected cell node');
      }
      const cellChildren = cell.getChildren();
      expect(cellChildren.some($isTableNode)).toBe(false);
    });
  });
});
