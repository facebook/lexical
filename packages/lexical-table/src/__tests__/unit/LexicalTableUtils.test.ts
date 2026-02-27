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
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  $moveTableColumn,
  TableCellNode,
  TableNode,
  TableRowNode,
} from '@lexical/table';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
  LexicalEditor,
} from 'lexical';
import {beforeEach, describe, expect, test} from 'vitest';

function $createTestTable(rows: number, columns: number): TableNode {
  const tableNode = $createTableNode();
  for (let r = 0; r < rows; r++) {
    const row = $createTableRowNode();
    for (let c = 0; c < columns; c++) {
      const cell = $createTableCellNode();
      cell.append($createParagraphNode().append($createTextNode(`r${r}c${c}`)));
      row.append(cell);
    }
    tableNode.append(row);
  }
  return tableNode;
}

function $getTableCellTexts(tableNode: TableNode): string[][] {
  return tableNode.getChildren().map((row) => {
    if (!$isTableRowNode(row)) {
      return [];
    }
    return row.getChildren().map((cell) => {
      if (!$isTableCellNode(cell)) {
        return '';
      }
      return cell.getTextContent();
    });
  });
}

describe('$moveTableColumn', () => {
  let editor: LexicalEditor;

  beforeEach(() => {
    editor = createEditor({
      namespace: 'test',
      nodes: [TableNode, TableCellNode, TableRowNode],
      onError: (error: Error) => {
        throw error;
      },
      theme: {},
    });
    editor._headless = true;
  });

  test('moves a column forward', () => {
    editor.update(
      () => {
        const root = $getRoot();
        root.append($createTestTable(2, 4));
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const table = $getRoot().getFirstChild<TableNode>();
        if (!$isTableNode(table)) {
          throw new Error('Expected table node');
        }
        $moveTableColumn(table, 0, 2);
      },
      {discrete: true},
    );

    editor.getEditorState().read(() => {
      const table = $getRoot().getFirstChild<TableNode>();
      if (!$isTableNode(table)) {
        throw new Error('Expected table node');
      }
      expect($getTableCellTexts(table)).toEqual([
        ['r0c1', 'r0c2', 'r0c0', 'r0c3'],
        ['r1c1', 'r1c2', 'r1c0', 'r1c3'],
      ]);
    });
  });

  test('moves a column backward', () => {
    editor.update(
      () => {
        const root = $getRoot();
        root.append($createTestTable(2, 4));
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const table = $getRoot().getFirstChild<TableNode>();
        if (!$isTableNode(table)) {
          throw new Error('Expected table node');
        }
        $moveTableColumn(table, 3, 1);
      },
      {discrete: true},
    );

    editor.getEditorState().read(() => {
      const table = $getRoot().getFirstChild<TableNode>();
      if (!$isTableNode(table)) {
        throw new Error('Expected table node');
      }
      expect($getTableCellTexts(table)).toEqual([
        ['r0c0', 'r0c3', 'r0c1', 'r0c2'],
        ['r1c0', 'r1c3', 'r1c1', 'r1c2'],
      ]);
    });
  });

  test('moves a column to the first position', () => {
    editor.update(
      () => {
        const root = $getRoot();
        root.append($createTestTable(2, 3));
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const table = $getRoot().getFirstChild<TableNode>();
        if (!$isTableNode(table)) {
          throw new Error('Expected table node');
        }
        $moveTableColumn(table, 2, 0);
      },
      {discrete: true},
    );

    editor.getEditorState().read(() => {
      const table = $getRoot().getFirstChild<TableNode>();
      if (!$isTableNode(table)) {
        throw new Error('Expected table node');
      }
      expect($getTableCellTexts(table)).toEqual([
        ['r0c2', 'r0c0', 'r0c1'],
        ['r1c2', 'r1c0', 'r1c1'],
      ]);
    });
  });

  test('moves a column to the last position', () => {
    editor.update(
      () => {
        const root = $getRoot();
        root.append($createTestTable(2, 3));
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const table = $getRoot().getFirstChild<TableNode>();
        if (!$isTableNode(table)) {
          throw new Error('Expected table node');
        }
        $moveTableColumn(table, 0, 2);
      },
      {discrete: true},
    );

    editor.getEditorState().read(() => {
      const table = $getRoot().getFirstChild<TableNode>();
      if (!$isTableNode(table)) {
        throw new Error('Expected table node');
      }
      expect($getTableCellTexts(table)).toEqual([
        ['r0c1', 'r0c2', 'r0c0'],
        ['r1c1', 'r1c2', 'r1c0'],
      ]);
    });
  });

  test('is a no-op when origin equals target', () => {
    editor.update(
      () => {
        const root = $getRoot();
        root.append($createTestTable(2, 3));
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const table = $getRoot().getFirstChild<TableNode>();
        if (!$isTableNode(table)) {
          throw new Error('Expected table node');
        }
        $moveTableColumn(table, 1, 1);
      },
      {discrete: true},
    );

    editor.getEditorState().read(() => {
      const table = $getRoot().getFirstChild<TableNode>();
      if (!$isTableNode(table)) {
        throw new Error('Expected table node');
      }
      expect($getTableCellTexts(table)).toEqual([
        ['r0c0', 'r0c1', 'r0c2'],
        ['r1c0', 'r1c1', 'r1c2'],
      ]);
    });
  });

  test('is a no-op when origin is out of bounds', () => {
    editor.update(
      () => {
        const root = $getRoot();
        root.append($createTestTable(2, 3));
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const table = $getRoot().getFirstChild<TableNode>();
        if (!$isTableNode(table)) {
          throw new Error('Expected table node');
        }
        $moveTableColumn(table, 5, 0);
      },
      {discrete: true},
    );

    editor.getEditorState().read(() => {
      const table = $getRoot().getFirstChild<TableNode>();
      if (!$isTableNode(table)) {
        throw new Error('Expected table node');
      }
      expect($getTableCellTexts(table)).toEqual([
        ['r0c0', 'r0c1', 'r0c2'],
        ['r1c0', 'r1c1', 'r1c2'],
      ]);
    });
  });

  test('is a no-op when target is out of bounds', () => {
    editor.update(
      () => {
        const root = $getRoot();
        root.append($createTestTable(2, 3));
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const table = $getRoot().getFirstChild<TableNode>();
        if (!$isTableNode(table)) {
          throw new Error('Expected table node');
        }
        $moveTableColumn(table, 0, 10);
      },
      {discrete: true},
    );

    editor.getEditorState().read(() => {
      const table = $getRoot().getFirstChild<TableNode>();
      if (!$isTableNode(table)) {
        throw new Error('Expected table node');
      }
      expect($getTableCellTexts(table)).toEqual([
        ['r0c0', 'r0c1', 'r0c2'],
        ['r1c0', 'r1c1', 'r1c2'],
      ]);
    });
  });

  test('is a no-op when origin is negative', () => {
    editor.update(
      () => {
        const root = $getRoot();
        root.append($createTestTable(2, 3));
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const table = $getRoot().getFirstChild<TableNode>();
        if (!$isTableNode(table)) {
          throw new Error('Expected table node');
        }
        $moveTableColumn(table, -1, 0);
      },
      {discrete: true},
    );

    editor.getEditorState().read(() => {
      const table = $getRoot().getFirstChild<TableNode>();
      if (!$isTableNode(table)) {
        throw new Error('Expected table node');
      }
      expect($getTableCellTexts(table)).toEqual([
        ['r0c0', 'r0c1', 'r0c2'],
        ['r1c0', 'r1c1', 'r1c2'],
      ]);
    });
  });

  test('reorders colWidths when present', () => {
    editor.update(
      () => {
        const root = $getRoot();
        const table = $createTestTable(2, 4);
        table.setColWidths([100, 200, 300, 400]);
        root.append(table);
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const table = $getRoot().getFirstChild<TableNode>();
        if (!$isTableNode(table)) {
          throw new Error('Expected table node');
        }
        $moveTableColumn(table, 0, 2);
      },
      {discrete: true},
    );

    editor.getEditorState().read(() => {
      const table = $getRoot().getFirstChild<TableNode>();
      if (!$isTableNode(table)) {
        throw new Error('Expected table node');
      }
      expect(table.getColWidths()).toEqual([200, 300, 100, 400]);
    });
  });

  test('does not modify table with merged cells', () => {
    editor.update(
      () => {
        const root = $getRoot();
        const tableNode = $createTableNode();
        // Row 0: cell spanning 2 columns, then a normal cell
        const row0 = $createTableRowNode();
        const mergedCell = $createTableCellNode();
        mergedCell.setColSpan(2);
        mergedCell.append(
          $createParagraphNode().append($createTextNode('merged')),
        );
        const normalCell = $createTableCellNode();
        normalCell.append(
          $createParagraphNode().append($createTextNode('r0c2')),
        );
        row0.append(mergedCell, normalCell);

        // Row 1: 3 normal cells
        const row1 = $createTableRowNode();
        for (let c = 0; c < 3; c++) {
          const cell = $createTableCellNode();
          cell.append(
            $createParagraphNode().append($createTextNode(`r1c${c}`)),
          );
          row1.append(cell);
        }

        tableNode.append(row0, row1);
        root.append(tableNode);
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const table = $getRoot().getFirstChild<TableNode>();
        if (!$isTableNode(table)) {
          throw new Error('Expected table node');
        }
        $moveTableColumn(table, 0, 1);
      },
      {discrete: true},
    );

    editor.getEditorState().read(() => {
      const table = $getRoot().getFirstChild<TableNode>();
      if (!$isTableNode(table)) {
        throw new Error('Expected table node');
      }
      // Should be unchanged because table has merged cells
      const rows = table.getChildren();
      if (!$isTableRowNode(rows[0])) {
        throw new Error('Expected row node');
      }
      const firstRowCells = rows[0].getChildren();
      expect(firstRowCells.length).toBe(2); // merged cell + normal cell
      if (!$isTableCellNode(firstRowCells[0])) {
        throw new Error('Expected cell node');
      }
      expect(firstRowCells[0].getColSpan()).toBe(2);
      expect(firstRowCells[0].getTextContent()).toBe('merged');
    });
  });

  test('swaps adjacent columns', () => {
    editor.update(
      () => {
        const root = $getRoot();
        root.append($createTestTable(3, 2));
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const table = $getRoot().getFirstChild<TableNode>();
        if (!$isTableNode(table)) {
          throw new Error('Expected table node');
        }
        $moveTableColumn(table, 0, 1);
      },
      {discrete: true},
    );

    editor.getEditorState().read(() => {
      const table = $getRoot().getFirstChild<TableNode>();
      if (!$isTableNode(table)) {
        throw new Error('Expected table node');
      }
      expect($getTableCellTexts(table)).toEqual([
        ['r0c1', 'r0c0'],
        ['r1c1', 'r1c0'],
        ['r2c1', 'r2c0'],
      ]);
    });
  });

  test('preserves table structure after move', () => {
    editor.update(
      () => {
        const root = $getRoot();
        root.append($createTestTable(3, 4));
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const table = $getRoot().getFirstChild<TableNode>();
        if (!$isTableNode(table)) {
          throw new Error('Expected table node');
        }
        $moveTableColumn(table, 1, 3);
      },
      {discrete: true},
    );

    editor.getEditorState().read(() => {
      const table = $getRoot().getFirstChild<TableNode>();
      if (!$isTableNode(table)) {
        throw new Error('Expected table node');
      }
      // Verify row and column count is preserved
      const rows = table.getChildren();
      expect(rows.length).toBe(3);
      rows.forEach((row) => {
        if (!$isTableRowNode(row)) {
          throw new Error('Expected row node');
        }
        expect(row.getChildrenSize()).toBe(4);
      });
    });
  });
});
