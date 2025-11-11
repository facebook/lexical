/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  INSERT_TABLE_COMMAND,
  TableExtension,
  type TableNode,
} from '@lexical/table';
import {$getRoot, defineExtension} from 'lexical';
import {describe, expect, it} from 'vitest';

describe('Table', () => {
  it('Creates a table with INSERT_TABLE_COMMAND', () => {
    const editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [TableExtension],
        name: 'table-test',
        theme: {tableScrollableWrapper: 'table-scrollable-wrapper'},
      }),
    );
    editor.update(
      () => {
        $getRoot().selectEnd();
        editor.dispatchCommand(INSERT_TABLE_COMMAND, {
          columns: '3',
          includeHeaders: true,
          rows: '2',
        });
      },
      {discrete: true},
    );
    editor.read(() => {
      const children = $getRoot().getChildren();
      expect(children.map((node) => node.getType())).toEqual([
        'paragraph',
        'table',
        'paragraph',
      ]);
      const table = children[1] as TableNode;
      expect($isTableNode(table)).toBe(true);
      const rows = table.getChildren();
      expect(rows.length).toBe(2);
      rows.forEach((row) => {
        expect($isTableRowNode(row)).toBe(true);
        if ($isTableRowNode(row)) {
          const cells = row.getChildren();
          expect(cells.length).toBe(3);
          expect(cells.every($isTableCellNode));
        }
      });
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
