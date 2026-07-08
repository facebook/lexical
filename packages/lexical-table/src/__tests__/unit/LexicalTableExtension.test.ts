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
  $createTableSelectionFrom,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  $isTableSelection,
  $mergeCells,
  INSERT_TABLE_COMMAND,
  TableExtension,
} from '@lexical/table';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  $setSelection,
  defineExtension,
  type LexicalEditorWithDispose,
  type NodeKey,
  SELECT_ALL_COMMAND,
} from 'lexical';
import {$assertNodeType} from 'lexical/src/__tests__/utils';
import {
  afterEach,
  assert,
  beforeEach,
  describe,
  expect,
  it,
  test,
} from 'vitest';

describe('TableExtension', () => {
  let editor: LexicalEditorWithDispose;

  beforeEach(() => {
    editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [TableExtension],
        name: 'table-test',
        theme: {tableScrollableWrapper: 'table-scrollable-wrapper'},
      }),
    );
  });
  afterEach(() => {
    editor.dispose();
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
      expect(children.map(node => node.getType())).toEqual([
        'paragraph',
        'table',
        'paragraph',
      ]);
      const table = $assertNodeType(children[1], $isTableNode);
      expect($isTableNode(table)).toBe(true);
      const rows = table.getChildren();
      expect(rows.length).toBe(2);
      rows.forEach(row => {
        expect($isTableRowNode(row)).toBe(true);
        if ($isTableRowNode(row)) {
          const cells = row.getChildren();
          expect(cells.length).toBe(3);
          expect(cells.every($isTableCellNode));
        }
      });
    });
  });

  it('repaints existing tables when hasHorizontalScroll toggles', async () => {
    const div = document.createElement('div');
    editor.setRootElement(div);
    editor.update(
      () => {
        $getRoot().selectEnd();
        editor.dispatchCommand(INSERT_TABLE_COMMAND, {columns: '2', rows: '2'});
      },
      {discrete: true},
    );

    const {hasHorizontalScroll} = getExtensionDependencyFromEditor(
      editor,
      TableExtension,
    ).output;

    // Default config enables horizontal scroll: the table is wrapped in the
    // scrollable <div>.
    expect(div.querySelector('.table-scrollable-wrapper > table')).not.toBe(
      null,
    );

    // Toggling the signal re-renders existing tables via a (deferred) full
    // reconcile, removing the wrapper.
    hasHorizontalScroll.value = false;
    await Promise.resolve();
    expect(div.querySelector('.table-scrollable-wrapper')).toBe(null);
    expect(div.querySelector('table')).not.toBe(null);

    // And restored when re-enabled.
    hasHorizontalScroll.value = true;
    await Promise.resolve();
    expect(div.querySelector('.table-scrollable-wrapper > table')).not.toBe(
      null,
    );
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
    editor.read('latest', () => {
      const root = $getRoot();
      const table = root.getFirstChild();
      assert($isTableNode(table), 'Expected table node');
      const row = table.getFirstChild();
      assert($isTableRowNode(row), 'Expected row node');
      const cell = row.getFirstChild();
      assert($isTableCellNode(cell), 'Expected cell node');
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
    editor.read('latest', () => {
      const root = $getRoot();
      const table = root.getFirstChild();
      assert($isTableNode(table), 'Expected table node');
      const row = table.getFirstChild();
      assert($isTableRowNode(row), 'Expected row node');
      const cell = row.getFirstChild();
      assert($isTableCellNode(cell), 'Expected cell node');
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
          const tableNode = $createTableNode().append(
            $createTableRowNode().append(
              $createTableCellNode().append($createParagraphNode()),
            ),
          );
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
      editor.read('latest', () => {
        const root = $getRoot();
        const table = root.getFirstChild();
        assert($isTableNode(table), 'Expected table node');
        const row = table.getFirstChild();
        assert($isTableRowNode(row), 'Expected row node');
        const cell = row.getFirstChild();
        assert($isTableCellNode(cell), 'Expected cell node');
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
          const tableNode = $createTableNode().append(
            $createTableRowNode().append(
              $createTableCellNode().append($createParagraphNode()),
            ),
          );
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
      editor.read('latest', () => {
        const root = $getRoot();
        const table = root.getFirstChild();
        assert($isTableNode(table), 'Expected table node');
        const row = table.getFirstChild();
        assert($isTableRowNode(row), 'Expected row node');
        const cell = row.getFirstChild();
        assert($isTableCellNode(cell), 'Expected cell node');
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
      editor.read('latest', () => {
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

    test('SELECTION_INSERT_CLIPBOARD_NODES_COMMAND clips to selection boundary with TableSelection', () => {
      editor.update(
        () => {
          const root = $getRoot().clear();
          const table = $createTableNode();
          for (let r = 0; r < 2; r++) {
            const row = $createTableRowNode();
            for (let c = 0; c < 2; c++) {
              const cell = $createTableCellNode();
              cell.append(
                $createParagraphNode().append($createTextNode(`${c},${r}`)),
              );
              row.append(cell);
            }
            table.append(row);
          }
          root.append(table);

          const [tableMap] = $computeTableMapSkipCellCheck(table, null, null);
          const tableSelection = $createTableSelectionFrom(
            table,
            tableMap[0][0].cell,
            tableMap[1][1].cell,
          );
          $setSelection(tableSelection);
        },
        {discrete: true},
      );

      editor.update(
        () => {
          const template = $createTableNode();
          for (let r = 0; r < 3; r++) {
            const row = $createTableRowNode();
            for (let c = 0; c < 3; c++) {
              const cell = $createTableCellNode();
              cell.append(
                $createParagraphNode().append(
                  $createTextNode(String.fromCharCode(65 + r * 3 + c)),
                ),
              );
              row.append(cell);
            }
            template.append(row);
          }
          const selection = $getSelection();
          assert($isTableSelection(selection), 'Expected table selection');
          $insertGeneratedNodes(editor, [template], selection);
        },
        {discrete: true},
      );

      editor.read('latest', () => {
        const root = $getRoot();
        const table = root.getFirstChild();
        assert($isTableNode(table), 'Expected table node');
        const rows = table.getChildren().filter($isTableRowNode);
        expect(rows.length).toBe(2);
        expect(rows[0].getChildren().length).toBe(2);
        const texts = rows.map(row =>
          row.getChildren().map(cell => cell.getTextContent()),
        );
        expect(texts).toEqual([
          ['A', 'B'],
          ['D', 'E'],
        ]);
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
          const table = $assertNodeType(root.getFirstChild(), $isTableNode);
          table.setColWidths([]);
        },
        {discrete: true},
      );

      editor.read('latest', () => {
        const root = $getRoot();
        const table = $assertNodeType(root.getFirstChild(), $isTableNode);
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
          const table = $assertNodeType(root.getFirstChild(), $isTableNode);
          table.setColWidths([10, 20]);
        },
        {discrete: true},
      );

      editor.read('latest', () => {
        const root = $getRoot();
        const table = $assertNodeType(root.getFirstChild(), $isTableNode);
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
          const table = $assertNodeType(root.getFirstChild(), $isTableNode);
          table.setColWidths([10, 20, 30]);
        },
        {discrete: true},
      );

      editor.read('latest', () => {
        const root = $getRoot();
        const table = $assertNodeType(root.getFirstChild(), $isTableNode);
        expect(table.getColWidths()).toEqual([10, 20]);
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
          assert($isParagraphNode(paragraph), 'Expected paragraph in cell');
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
      editor.read('latest', () => {
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
          row.forEach(cellMap => {
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
      editor.read('latest', () => {
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
          selectedNodes.map(node => node.getKey()),
        );
        const totalUniqueCells = new Set<NodeKey>();
        tableMap.forEach(row => {
          row.forEach(cellMap => {
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
      editor.read('latest', () => {
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
      editor.read('latest', () => {
        const selection = $getSelection();
        assert(
          $isRangeSelection(selection),
          'Expected RangeSelection when paragraph exists after table',
        );
        expect($isTableSelection(selection)).toBe(false);
      });
    });
  });

  describe('drag selection', () => {
    // Polyfill PointerEvent for jsdom
    interface PointerEventInit extends EventInit {
      button?: number;
      buttons?: number;
      pointerType?: string;
      clientX?: number;
      clientY?: number;
    }
    if (
      typeof (globalThis as {PointerEvent?: unknown}).PointerEvent ===
      'undefined'
    ) {
      (globalThis as unknown as {PointerEvent: unknown}).PointerEvent =
        class PointerEvent extends Event {
          button: number;
          buttons: number;
          pointerType: string;
          clientX: number;
          clientY: number;
          constructor(type: string, options: PointerEventInit = {}) {
            super(type, options);
            this.button = options.button || 0;
            this.buttons = options.buttons ?? 1;
            this.pointerType = options.pointerType || 'mouse';
            this.clientX = options.clientX ?? 0;
            this.clientY = options.clientY ?? 0;
          }
        };
    }

    it('attaches the window pointerdown handler when setRootElement is called after register', () => {
      // The TableExtension registers handlers during buildEditor, before any
      // root element is mounted. Regression test for the bug where the
      // pointerdown listener on editorWindow was never attached because
      // editor.getRootElement() was null at register() time, breaking drag
      // selection. See https://github.com/facebook/lexical/issues/8491
      const container = document.createElement('div');
      document.body.appendChild(container);
      try {
        editor.setRootElement(container);
        editor.update(
          () => {
            const root = $getRoot().clear();
            const table = $createTableNodeWithDimensions(2, 2, false);
            root.append(table);
            const firstRow = table.getFirstChild();
            assert($isTableRowNode(firstRow), 'Expected first row');
            const firstCell = firstRow.getFirstChild();
            assert($isTableCellNode(firstCell), 'Expected first cell');
            const paragraph = firstCell.getFirstChild();
            assert($isParagraphNode(paragraph), 'Expected paragraph in cell');
            paragraph.selectStart();
          },
          {discrete: true},
        );

        const firstCellElement = container.querySelector('td');
        assert(firstCellElement !== null, 'Expected first cell element');
        const tableElement = container.querySelector('table');
        assert(tableElement !== null, 'Expected table element');

        // Before the pointerdown, no anchor cell is set on the TableObserver.
        const observerKey = '__lexicalTableSelection';
        const observerBefore = (
          tableElement as unknown as Record<string, {anchorCell: unknown}>
        )[observerKey];
        assert(observerBefore !== undefined, 'Expected TableObserver to exist');
        expect(observerBefore.anchorCell).toBeNull();

        const pointerEvent = new (
          globalThis as unknown as {
            PointerEvent: new (
              type: string,
              options?: PointerEventInit,
            ) => Event;
          }
        ).PointerEvent('pointerdown', {
          bubbles: true,
          button: 0,
          buttons: 1,
          cancelable: true,
          pointerType: 'mouse',
        });
        firstCellElement.dispatchEvent(pointerEvent);

        // After the pointerdown, the window-level pointerdown handler should
        // have run and set the anchor cell on the observer. If the handler
        // was never attached, the anchor remains null.
        const observerAfter = (
          tableElement as unknown as Record<string, {anchorCell: unknown}>
        )[observerKey];
        expect(observerAfter.anchorCell).not.toBeNull();
      } finally {
        editor.setRootElement(null);
        document.body.removeChild(container);
      }
    });
  });
});
