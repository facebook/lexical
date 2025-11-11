/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {$insertGeneratedNodes} from '@lexical/clipboard';
import {
  buildEditorFromExtensions,
  getExtensionDependencyFromEditor,
} from '@lexical/extension';
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  INSERT_TABLE_COMMAND,
  TableExtension,
  type TableNode,
} from '@lexical/table';
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  defineExtension,
  LexicalEditor,
} from 'lexical';
import {beforeEach, describe, expect, it, test} from 'vitest';

describe('TableExtension', () => {
  let editor: LexicalEditor;

  beforeEach(() => {
    editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [TableExtension],
        name: 'table-test',
        theme: {tableScrollableWrapper: 'table-scrollable-wrapper'},
      }),
    );
  });

  it('Creates a table with INSERT_TABLE_COMMAND', () => {
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

  it('Prevents nested tables by default', async () => {
    editor.update(
      () => {
        const root = $getRoot().clear();
        const table = $createTableNode();
        const row = $createTableRowNode();
        const cell = $createTableCellNode();
        row.append(cell);
        table.append(row);
        root.append(table);
        cell.select();
      },
      {discrete: true},
    );

    // Try to insert a table inside the cell
    editor.update(
      () => {
        editor.dispatchCommand(INSERT_TABLE_COMMAND, {
          columns: '2',
          rows: '2',
        });
      },
      {discrete: true},
    );

    // Verify no nested table was created
    editor.getEditorState().read(() => {
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

  it('Allows nested tables when hasNestedTables is true', async () => {
    const extension = getExtensionDependencyFromEditor(editor, TableExtension);
    extension.output.hasNestedTables.value = true;

    editor.update(
      () => {
        const root = $getRoot().clear();
        const table = $createTableNode();
        const row = $createTableRowNode();
        const cell = $createTableCellNode();
        row.append(cell);
        table.append(row);
        root.append(table);
        cell.select();
      },
      {discrete: true},
    );

    // Try to insert a table inside the cell
    editor.update(
      () => {
        editor.dispatchCommand(INSERT_TABLE_COMMAND, {
          columns: '2',
          rows: '2',
        });
      },
      {discrete: true},
    );

    // Verify nested table was created
    editor.getEditorState().read(() => {
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
      expect(cellChildren.some($isTableNode)).toBe(true);
    });
  });

  describe('$insertGeneratedNodes', () => {
    test('SELECTION_INSERT_CLIPBOARD_NODES_COMMAND handler prevents pasting tables in cells by default', () => {
      editor.update(
        () => {
          const root = $getRoot().clear();
          const table = $createTableNode();
          const row = $createTableRowNode();
          const cell = $createTableCellNode();
          const paragraph = $createParagraphNode();
          cell.append(paragraph);
          row.append(cell);
          table.append(row);
          root.append(table);
          paragraph.select();
        },
        {discrete: true},
      );

      // Try to paste a table inside the cell
      editor.update(
        () => {
          const tableNode = $createTableNode();
          const selection = $getSelection();
          if (selection === null) {
            throw new Error('Expected valid selection');
          }
          $insertGeneratedNodes(editor, [tableNode], selection);
        },
        {discrete: true},
      );

      // Verify no nested table was created
      editor.getEditorState().read(() => {
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

    test('SELECTION_INSERT_CLIPBOARD_NODES_COMMAND handler allows pasting tables in cells when hasNestedTables is true', () => {
      const extension = getExtensionDependencyFromEditor(
        editor,
        TableExtension,
      );
      extension.output.hasNestedTables.value = true;

      editor.update(
        () => {
          const root = $getRoot().clear();
          const table = $createTableNode();
          const row = $createTableRowNode();
          const cell = $createTableCellNode();
          const paragraph = $createParagraphNode();
          cell.append(paragraph);
          row.append(cell);
          table.append(row);
          root.append(table);
          paragraph.select();
        },
        {discrete: true},
      );

      // Try to paste a table inside the cell
      editor.update(
        () => {
          const tableNode = $createTableNode();
          const selection = $getSelection();
          if (selection === null) {
            throw new Error('Expected valid selection');
          }
          $insertGeneratedNodes(editor, [tableNode], selection);
        },
        {discrete: true},
      );

      // Verify no nested table was created
      editor.getEditorState().read(() => {
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
        expect(cellChildren.some($isTableNode)).toBe(true);
      });
    });
  });
});
