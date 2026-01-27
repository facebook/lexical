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
  $computeTableMapSkipCellCheck,
  $createTableCellNode,
  $createTableNode,
  $createTableNodeWithDimensions,
  $createTableRowNode,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  $isTableSelection,
  $mergeCells,
  INSERT_TABLE_COMMAND,
  TableExtension,
  type TableNode,
} from '@lexical/table';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  defineExtension,
  LexicalEditor,
  NodeKey,
  SELECT_ALL_COMMAND,
} from 'lexical';
import {assert, beforeEach, describe, expect, it, test} from 'vitest';

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
      assert($isTableNode(table), 'Expected table node');
      const row = table.getFirstChild();
      assert($isElementNode(row), 'Expected row node');
      const cell = row.getFirstChild();
      assert($isElementNode(cell), 'Expected cell node');
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
      assert($isTableNode(table), 'Expected table node');
      const row = table.getFirstChild();
      assert($isElementNode(row), 'Expected row node');
      const cell = row.getFirstChild();
      assert($isElementNode(cell), 'Expected cell node');
      const cellChildren = cell.getChildren();
      expect(cellChildren.some($isTableNode)).toBe(true);
    });
  });

  describe('$insertGeneratedNodes', () => {
    test('SELECTION_INSERT_CLIPBOARD_NODES_COMMAND handler prevents pasting whole table into cells by default', () => {
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

      // Try to paste a table inside the cell. Whole table paste (as opposed to a table merge) is done by having multiple nodes
      // on the clipboard.
      editor.update(
        () => {
          const tableNode = $createTableNode();
          const selection = $getSelection();
          assert($isRangeSelection(selection), 'Expected range selection');
          $insertGeneratedNodes(
            editor,
            [tableNode, $createParagraphNode()],
            selection,
          );
        },
        {discrete: true},
      );

      // Verify no nested table was created
      editor.getEditorState().read(() => {
        const root = $getRoot();
        const table = root.getFirstChild();
        assert($isTableNode(table), 'Expected table node');
        const row = table.getFirstChild();
        assert($isElementNode(row), 'Expected row node');
        const cell = row.getFirstChild();
        assert($isElementNode(cell), 'Expected cell node');
        const cellChildren = cell.getChildren();
        expect(cellChildren.some($isTableNode)).toBe(false);
      });
    });

    test('SELECTION_INSERT_CLIPBOARD_NODES_COMMAND handler allows pasting whole table into a single cell when hasNestedTables is true', () => {
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
          assert($isRangeSelection(selection), 'Expected range selection');
          $insertGeneratedNodes(
            editor,
            [tableNode, $createParagraphNode()],
            selection,
          );
        },
        {discrete: true},
      );

      // Verify a nested table was created
      editor.getEditorState().read(() => {
        const root = $getRoot();
        const table = root.getFirstChild();
        assert($isTableNode(table), 'Expected table node');
        const row = table.getFirstChild();
        assert($isElementNode(row), 'Expected row node');
        const cell = row.getFirstChild();
        assert($isElementNode(cell), 'Expected cell node');
        const cellChildren = cell.getChildren();
        expect(cellChildren.some($isTableNode)).toBe(true);
      });
    });

    test('SELECTION_INSERT_CLIPBOARD_NODES_COMMAND handler allows extending table when hasNestedTables is true', () => {
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

      // Try to paste a wider table inside the cell
      editor.update(
        () => {
          const tableNode = $createTableNode();
          const row = $createTableRowNode();
          const cell = $createTableCellNode();
          cell.append($createParagraphNode().append($createTextNode('a')));
          const cell2 = $createTableCellNode();
          cell2.append($createParagraphNode().append($createTextNode('b')));
          row.append(cell, cell2);
          tableNode.append(row);
          const selection = $getSelection();
          if (selection === null) {
            throw new Error('Expected valid selection');
          }
          $insertGeneratedNodes(editor, [tableNode], selection);
        },
        {discrete: true},
      );

      // Verify the table was extended
      editor.getEditorState().read(() => {
        const root = $getRoot();
        const table = root.getFirstChild();
        assert($isTableNode(table), 'Expected table node');
        const row = table.getFirstChild();
        assert($isElementNode(row), 'Expected row node');
        assert(row.getChildren().length === 2, 'Expected 2 children in row');
        const [cell, cell2] = row.getChildren();
        assert($isTableCellNode(cell), 'Expected first cell to be a cell node');
        assert(
          $isTableCellNode(cell2),
          'Expected second cell to be a cell node',
        );
        const cellChild = cell.getFirstChild();
        assert(
          $isParagraphNode(cellChild),
          'Expected first cell child to be a paragraph node',
        );
        expect(cellChild.getTextContent()).toBe('a');
        const cell2Child = cell2.getFirstChild();
        assert(
          $isParagraphNode(cell2Child),
          'Expected second cell child to be a paragraph node',
        );
        expect(cell2Child.getTextContent()).toBe('b');
      });
    });
  });

  describe('colWidths', () => {
    it('removes colWidths if it is an empty array', () => {
      editor.update(
        () => {
          const root = $getRoot();
          root.clear().selectStart();
          editor.dispatchCommand(INSERT_TABLE_COMMAND, {
            columns: '2',
            rows: '2',
          });
          const table = root.getFirstChildOrThrow<TableNode>();
          table.setColWidths([]);
        },
        {discrete: true},
      );

      editor.getEditorState().read(() => {
        const root = $getRoot();
        const table = root.getFirstChildOrThrow<TableNode>();
        expect(table.getColWidths()).toBe(undefined);
      });
    });

    it('uses the last column width if the column count is greater than the number of column widths', () => {
      editor.update(
        () => {
          const root = $getRoot();
          root.clear().selectStart();
          editor.dispatchCommand(INSERT_TABLE_COMMAND, {
            columns: '3',
            rows: '2',
          });
          const table = root.getFirstChildOrThrow<TableNode>();
          table.setColWidths([10, 20]);
        },
        {discrete: true},
      );

      editor.getEditorState().read(() => {
        const root = $getRoot();
        const table = root.getFirstChildOrThrow<TableNode>();
        expect(table.getColWidths()).toEqual([10, 20, 20]);
      });
    });

    it('shortens the colWidths if the column count is less than the number of column widths', () => {
      editor.update(
        () => {
          const root = $getRoot();
          root.clear().selectStart();
          editor.dispatchCommand(INSERT_TABLE_COMMAND, {
            columns: '2',
            rows: '2',
          });
          const table = root.getFirstChildOrThrow<TableNode>();
          table.setColWidths([10, 20, 30]);
        },
        {discrete: true},
      );

      editor.getEditorState().read(() => {
        const root = $getRoot();
        const table = root.getFirstChildOrThrow<TableNode>();
        expect(table.getColWidths()).toEqual([10, 20]);
      });
    });

    test('preserves colWidths of inner table when pasting a table into another table (with hasNestedTables=true and hasFitNestedTables=false)', () => {
      const extension = getExtensionDependencyFromEditor(
        editor,
        TableExtension,
      );
      extension.output.hasNestedTables.value = true;
      extension.output.hasFitNestedTables.value = false;

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

          table.setColWidths([500]);
        },
        {discrete: true},
      );

      editor.update(
        () => {
          const tableNode = $createTableNode();
          const row = $createTableRowNode();
          const cell = $createTableCellNode();
          const cell2 = $createTableCellNode();
          cell.append($createParagraphNode());
          row.append(cell, cell2);
          tableNode.append(row);

          // The sum is wider than the destination cell.
          tableNode.setColWidths([750, 250]);

          const selection = $getSelection();
          assert($isRangeSelection(selection), 'Expected range selection');
          $insertGeneratedNodes(
            editor,
            [tableNode, $createParagraphNode()],
            selection,
          );
        },
        {discrete: true},
      );

      // Verify a nested table was created, with colWidths preserved.
      editor.getEditorState().read(() => {
        const root = $getRoot();
        const table = root.getFirstChild();
        assert($isTableNode(table), 'Expected outer table node');
        const row = table.getFirstChild();
        assert($isElementNode(row), 'Expected outer row node');
        const cell = row.getFirstChild();
        assert($isElementNode(cell), 'Expected outer cell node');
        const [innerTableNode] = cell.getChildren();
        assert($isTableNode(innerTableNode), 'Expected inner table node');
        expect(innerTableNode.getColWidths()).toEqual([750, 250]);
      });
    });

    test('proportionally adjusts colWidths of inner table when pasting a table into another table (with hasNestedTables=true and hasFitNestedTables=true)', () => {
      const extension = getExtensionDependencyFromEditor(
        editor,
        TableExtension,
      );
      extension.output.hasNestedTables.value = true;
      extension.output.hasFitNestedTables.value = true;

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

          table.setColWidths([500]);
        },
        {discrete: true},
      );

      editor.update(
        () => {
          const tableNode = $createTableNode();
          const row = $createTableRowNode();
          const cell = $createTableCellNode();
          const cell2 = $createTableCellNode();
          cell.append($createParagraphNode());
          row.append(cell, cell2);
          tableNode.append(row);

          // The sum is wider than the destination cell.
          tableNode.setColWidths([750, 250]);

          const selection = $getSelection();
          assert($isRangeSelection(selection), 'Expected range selection');
          $insertGeneratedNodes(
            editor,
            [tableNode, $createParagraphNode()],
            selection,
          );
        },
        {discrete: true},
      );

      // Verify a nested table was created, with colWidths updated.
      editor.getEditorState().read(() => {
        const root = $getRoot();
        const table = root.getFirstChild();
        assert($isTableNode(table), 'Expected outer table node');
        const row = table.getFirstChild();
        assert($isElementNode(row), 'Expected outer row node');
        const cell = row.getFirstChild();
        assert($isElementNode(cell), 'Expected outer cell node');
        const [innerTableNode] = cell.getChildren();
        assert($isTableNode(innerTableNode), 'Expected inner table node');
        expect(innerTableNode.getColWidths()).toEqual([375, 125]);
      });
    });
  });

  describe('SELECT_ALL_COMMAND', () => {
    it('Selects all cells in table without merged cells when table is only content', () => {
      editor.update(
        () => {
          const root = $getRoot().clear();
          // Create a 3x3 table
          const table = $createTableNodeWithDimensions(3, 3, false);
          root.append(table);
          // Place cursor in the first cell
          const firstRow = table.getFirstChild();
          assert($isTableRowNode(firstRow), 'Expected first row');
          const firstCell = firstRow.getFirstChild();
          assert($isTableCellNode(firstCell), 'Expected first cell');
          const paragraph = firstCell.getFirstChild();
          assert($isElementNode(paragraph), 'Expected paragraph in cell');
          paragraph.selectStart();
        },
        {discrete: true},
      );

      // Dispatch SELECT_ALL_COMMAND
      editor.update(
        () => {
          editor.dispatchCommand(SELECT_ALL_COMMAND, {} as KeyboardEvent);
        },
        {discrete: true},
      );

      // Verify TableSelection was created and all cells are selected
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        assert(
          $isTableSelection(selection),
          'Expected TableSelection after Ctrl+A',
        );

        const root = $getRoot();
        const table = root.getFirstChild();
        assert($isTableNode(table), 'Expected table node');

        // Verify all cells are selected by checking the selection spans the entire table
        const [tableMap] = $computeTableMapSkipCellCheck(table, null, null);
        const firstCellMap = tableMap[0][0];
        const lastRow = tableMap[tableMap.length - 1];
        const lastCellMap = lastRow[lastRow.length - 1];

        assert(
          firstCellMap !== null && firstCellMap.cell !== null,
          'Expected first cell',
        );
        assert(
          lastCellMap !== null && lastCellMap.cell !== null,
          'Expected last cell',
        );

        const anchorCell = selection.anchor.getNode();
        const focusCell = selection.focus.getNode();

        assert(
          $isTableCellNode(anchorCell),
          'Expected anchor to be in a table cell',
        );
        assert(
          $isTableCellNode(focusCell),
          'Expected focus to be in a table cell',
        );

        // Verify selection spans from first to last cell
        expect(anchorCell.getKey()).toBe(firstCellMap.cell.getKey());
        expect(focusCell.getKey()).toBe(lastCellMap.cell.getKey());

        // Verify all cells are in the selection
        const selectedNodes = selection.getNodes().filter($isTableCellNode);
        const totalCells = tableMap.reduce((acc, row) => {
          const uniqueCells = new Set();
          row.forEach((cellMap) => {
            if (cellMap && cellMap.cell) {
              uniqueCells.add(cellMap.cell.getKey());
            }
          });
          return acc + uniqueCells.size;
        }, 0);
        expect(selectedNodes.length).toBe(totalCells);
      });
    });

    it('Selects all cells in table with merged cells when table is only content', () => {
      editor.update(
        () => {
          const root = $getRoot().clear();
          // Create a 3x3 table
          const table = $createTableNodeWithDimensions(3, 3, false);
          root.append(table);

          // Merge two cells in the last column (merge cells in row 0 and row 1, column 2)
          const row0 = table.getChildAtIndex(0);
          const row1 = table.getChildAtIndex(1);
          assert($isTableRowNode(row0), 'Expected row 0');
          assert($isTableRowNode(row1), 'Expected row 1');
          const cell0_2 = row0.getChildAtIndex(2);
          const cell1_2 = row1.getChildAtIndex(2);
          assert($isTableCellNode(cell0_2), 'Expected cell 0,2');
          assert($isTableCellNode(cell1_2), 'Expected cell 1,2');

          // Merge the cells
          $mergeCells([cell0_2, cell1_2]);

          // Place cursor in any cell (not the merged one)
          const cell0_0 = row0.getChildAtIndex(0);
          assert($isTableCellNode(cell0_0), 'Expected cell 0,0');
          const paragraph = cell0_0.getFirstChild();
          assert($isElementNode(paragraph), 'Expected paragraph in cell');
          paragraph.selectStart();
        },
        {discrete: true},
      );

      // Dispatch SELECT_ALL_COMMAND
      editor.update(
        () => {
          editor.dispatchCommand(SELECT_ALL_COMMAND, {} as KeyboardEvent);
        },
        {discrete: true},
      );

      // Verify TableSelection was created and all cells are selected
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        assert(
          $isTableSelection(selection),
          'Expected TableSelection after Ctrl+A with merged cells',
        );

        const root = $getRoot();
        const table = root.getFirstChild();
        assert($isTableNode(table), 'Expected table node');

        // Verify all cells are selected by checking the selection spans the entire table
        const [tableMap] = $computeTableMapSkipCellCheck(table, null, null);
        const firstCellMap = tableMap[0][0];
        const lastRow = tableMap[tableMap.length - 1];
        const lastCellMap = lastRow[lastRow.length - 1];

        assert(
          firstCellMap !== null && firstCellMap.cell !== null,
          'Expected first cell',
        );
        assert(
          lastCellMap !== null && lastCellMap.cell !== null,
          'Expected last cell',
        );

        const anchorCell = selection.anchor.getNode();
        const focusCell = selection.focus.getNode();

        assert(
          $isTableCellNode(anchorCell),
          'Expected anchor to be in a table cell',
        );
        assert(
          $isTableCellNode(focusCell),
          'Expected focus to be in a table cell',
        );

        // Verify selection spans from first to last cell
        expect(anchorCell.getKey()).toBe(firstCellMap.cell.getKey());
        expect(focusCell.getKey()).toBe(lastCellMap.cell.getKey());

        // Verify all unique cells are in the selection (merged cells should appear once)
        const selectedNodes = selection.getNodes().filter($isTableCellNode);
        const uniqueCellKeys = new Set(
          selectedNodes.map((node) => node.getKey()),
        );
        const totalUniqueCells = new Set<NodeKey>();
        tableMap.forEach((row) => {
          row.forEach((cellMap) => {
            if (cellMap && cellMap.cell) {
              totalUniqueCells.add(cellMap.cell.getKey());
            }
          });
        });
        expect(uniqueCellKeys.size).toBe(totalUniqueCells.size);
      });
    });

    it('Does not intercept SELECT_ALL_COMMAND when cursor is outside table', () => {
      editor.update(
        () => {
          const root = $getRoot().clear();
          const paragraph = $createParagraphNode();
          const text = $createTextNode('Some text');
          paragraph.append(text);
          root.append(paragraph);

          // Add a table after the paragraph
          const table = $createTableNodeWithDimensions(2, 2, false);
          root.append(table);

          // Place cursor in the paragraph (outside table)
          text.selectStart();
        },
        {discrete: true},
      );

      // Dispatch SELECT_ALL_COMMAND
      editor.update(
        () => {
          editor.dispatchCommand(SELECT_ALL_COMMAND, {} as KeyboardEvent);
        },
        {discrete: true},
      );

      // Verify RangeSelection was created (not TableSelection) since cursor is outside table
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        assert(
          $isRangeSelection(selection),
          'Expected RangeSelection when cursor is outside table',
        );
        expect($isTableSelection(selection)).toBe(false);
      });
    });

    it('Does not intercept SELECT_ALL_COMMAND when there is paragraph after table', () => {
      editor.update(
        () => {
          const root = $getRoot().clear();
          // Create a table
          const table = $createTableNodeWithDimensions(2, 2, false);
          root.append(table);

          // Add a paragraph after the table (simulating insertTable behavior)
          const paragraph = $createParagraphNode();
          root.append(paragraph);

          // Place cursor in the table
          const firstRow = table.getFirstChild();
          assert($isTableRowNode(firstRow), 'Expected first row');
          const firstCell = firstRow.getFirstChild();
          assert($isTableCellNode(firstCell), 'Expected first cell');
          const cellParagraph = firstCell.getFirstChild();
          assert($isElementNode(cellParagraph), 'Expected paragraph in cell');
          cellParagraph.selectStart();
        },
        {discrete: true},
      );

      // Dispatch SELECT_ALL_COMMAND
      editor.update(
        () => {
          editor.dispatchCommand(SELECT_ALL_COMMAND, {} as KeyboardEvent);
        },
        {discrete: true},
      );

      // Verify RangeSelection was created (not TableSelection) since there's paragraph after table
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        assert(
          $isRangeSelection(selection),
          'Expected RangeSelection when paragraph exists after table',
        );
        expect($isTableSelection(selection)).toBe(false);
      });
    });
  });
});
