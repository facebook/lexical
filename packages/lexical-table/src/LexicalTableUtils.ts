/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Grid} from './LexicalTableSelection';
import type {ElementNode} from 'lexical';

import {$findMatchingParent} from '@lexical/utils';
import {
  $createParagraphNode,
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  DEPRECATED_$computeGridMap,
  DEPRECATED_$getNodeTriplet,
  DEPRECATED_$isGridRowNode,
  DEPRECATED_$isGridSelection,
  DEPRECATED_GridCellNode,
  LexicalNode,
} from 'lexical';
import invariant from 'shared/invariant';

import {InsertTableCommandPayloadHeaders} from '.';
import {
  $createTableCellNode,
  $isTableCellNode,
  TableCellHeaderStates,
  TableCellNode,
} from './LexicalTableCellNode';
import {$createTableNode, $isTableNode, TableNode} from './LexicalTableNode';
import {
  $createTableRowNode,
  $isTableRowNode,
  TableRowNode,
} from './LexicalTableRowNode';

export function $createTableNodeWithDimensions(
  rowCount: number,
  columnCount: number,
  includeHeaders: InsertTableCommandPayloadHeaders = true,
): TableNode {
  const tableNode = $createTableNode();

  for (let iRow = 0; iRow < rowCount; iRow++) {
    const tableRowNode = $createTableRowNode();

    for (let iColumn = 0; iColumn < columnCount; iColumn++) {
      let headerState = TableCellHeaderStates.NO_STATUS;

      if (typeof includeHeaders === 'object') {
        if (iRow === 0 && includeHeaders.rows)
          headerState |= TableCellHeaderStates.ROW;
        if (iColumn === 0 && includeHeaders.columns)
          headerState |= TableCellHeaderStates.COLUMN;
      } else if (includeHeaders) {
        if (iRow === 0) headerState |= TableCellHeaderStates.ROW;
        if (iColumn === 0) headerState |= TableCellHeaderStates.COLUMN;
      }

      const tableCellNode = $createTableCellNode(headerState);
      const paragraphNode = $createParagraphNode();
      paragraphNode.append($createTextNode());
      tableCellNode.append(paragraphNode);
      tableRowNode.append(tableCellNode);
    }

    tableNode.append(tableRowNode);
  }

  return tableNode;
}

export function $getTableCellNodeFromLexicalNode(
  startingNode: LexicalNode,
): TableCellNode | null {
  const node = $findMatchingParent(startingNode, (n) => $isTableCellNode(n));

  if ($isTableCellNode(node)) {
    return node;
  }

  return null;
}

export function $getTableRowNodeFromTableCellNodeOrThrow(
  startingNode: LexicalNode,
): TableRowNode {
  const node = $findMatchingParent(startingNode, (n) => $isTableRowNode(n));

  if ($isTableRowNode(node)) {
    return node;
  }

  throw new Error('Expected table cell to be inside of table row.');
}

export function $getTableNodeFromLexicalNodeOrThrow(
  startingNode: LexicalNode,
): TableNode {
  const node = $findMatchingParent(startingNode, (n) => $isTableNode(n));

  if ($isTableNode(node)) {
    return node;
  }

  throw new Error('Expected table cell to be inside of table.');
}

export function $getTableRowIndexFromTableCellNode(
  tableCellNode: TableCellNode,
): number {
  const tableRowNode = $getTableRowNodeFromTableCellNodeOrThrow(tableCellNode);
  const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableRowNode);
  return tableNode.getChildren().findIndex((n) => n.is(tableRowNode));
}

export function $getTableColumnIndexFromTableCellNode(
  tableCellNode: TableCellNode,
): number {
  const tableRowNode = $getTableRowNodeFromTableCellNodeOrThrow(tableCellNode);
  return tableRowNode.getChildren().findIndex((n) => n.is(tableCellNode));
}

export type TableCellSiblings = {
  above: TableCellNode | null | undefined;
  below: TableCellNode | null | undefined;
  left: TableCellNode | null | undefined;
  right: TableCellNode | null | undefined;
};

export function $getTableCellSiblingsFromTableCellNode(
  tableCellNode: TableCellNode,
  grid: Grid,
): TableCellSiblings {
  const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
  const {x, y} = tableNode.getCordsFromCellNode(tableCellNode, grid);
  return {
    above: tableNode.getCellNodeFromCords(x, y - 1, grid),
    below: tableNode.getCellNodeFromCords(x, y + 1, grid),
    left: tableNode.getCellNodeFromCords(x - 1, y, grid),
    right: tableNode.getCellNodeFromCords(x + 1, y, grid),
  };
}

export function $removeTableRowAtIndex(
  tableNode: TableNode,
  indexToDelete: number,
): TableNode {
  const tableRows = tableNode.getChildren();

  if (indexToDelete >= tableRows.length || indexToDelete < 0) {
    throw new Error('Expected table cell to be inside of table row.');
  }

  const targetRowNode = tableRows[indexToDelete];
  targetRowNode.remove();
  return tableNode;
}

export function $insertTableRow(
  tableNode: TableNode,
  targetIndex: number,
  shouldInsertAfter = true,
  rowCount: number,
  grid: Grid,
): TableNode {
  const tableRows = tableNode.getChildren();

  if (targetIndex >= tableRows.length || targetIndex < 0) {
    throw new Error('Table row target index out of range');
  }

  const targetRowNode = tableRows[targetIndex];

  if ($isTableRowNode(targetRowNode)) {
    for (let r = 0; r < rowCount; r++) {
      const tableRowCells = targetRowNode.getChildren<TableCellNode>();
      const tableColumnCount = tableRowCells.length;
      const newTableRowNode = $createTableRowNode();

      for (let c = 0; c < tableColumnCount; c++) {
        const tableCellFromTargetRow = tableRowCells[c];

        invariant(
          $isTableCellNode(tableCellFromTargetRow),
          'Expected table cell',
        );

        const {above, below} = $getTableCellSiblingsFromTableCellNode(
          tableCellFromTargetRow,
          grid,
        );

        let headerState = TableCellHeaderStates.NO_STATUS;
        const width =
          (above && above.getWidth()) ||
          (below && below.getWidth()) ||
          undefined;

        if (
          (above && above.hasHeaderState(TableCellHeaderStates.COLUMN)) ||
          (below && below.hasHeaderState(TableCellHeaderStates.COLUMN))
        ) {
          headerState |= TableCellHeaderStates.COLUMN;
        }

        const tableCellNode = $createTableCellNode(headerState, 1, width);

        tableCellNode.append($createParagraphNode());

        newTableRowNode.append(tableCellNode);
      }

      if (shouldInsertAfter) {
        targetRowNode.insertAfter(newTableRowNode);
      } else {
        targetRowNode.insertBefore(newTableRowNode);
      }
    }
  } else {
    throw new Error('Row before insertion index does not exist.');
  }

  return tableNode;
}

export function $insertTableRow__EXPERIMENTAL(insertAfter = true): void {
  const selection = $getSelection();
  invariant(
    $isRangeSelection(selection) || DEPRECATED_$isGridSelection(selection),
    'Expected a RangeSelection or GridSelection',
  );
  const focus = selection.focus.getNode();
  const [focusCell, , grid] = DEPRECATED_$getNodeTriplet(focus);
  const [gridMap, focusCellMap] = DEPRECATED_$computeGridMap(
    grid,
    focusCell,
    focusCell,
  );
  const columnCount = gridMap[0].length;
  const {startRow: focusStartRow} = focusCellMap;
  if (insertAfter) {
    const focusEndRow = focusStartRow + focusCell.__rowSpan - 1;
    const focusEndRowMap = gridMap[focusEndRow];
    const newRow = $createTableRowNode();
    for (let i = 0; i < columnCount; i++) {
      const {cell, startRow} = focusEndRowMap[i];
      if (startRow + cell.__rowSpan - 1 <= focusEndRow) {
        newRow.append($createTableCellNode(TableCellHeaderStates.NO_STATUS));
      } else {
        cell.setRowSpan(cell.__rowSpan + 1);
      }
    }
    const focusEndRowNode = grid.getChildAtIndex(focusEndRow);
    invariant(
      DEPRECATED_$isGridRowNode(focusEndRowNode),
      'focusEndRow is not a GridRowNode',
    );
    focusEndRowNode.insertAfter(newRow);
  } else {
    const focusStartRowMap = gridMap[focusStartRow];
    const newRow = $createTableRowNode();
    for (let i = 0; i < columnCount; i++) {
      const {cell, startRow} = focusStartRowMap[i];
      if (startRow === focusStartRow) {
        newRow.append($createTableCellNode(TableCellHeaderStates.NO_STATUS));
      } else {
        cell.setRowSpan(cell.__rowSpan + 1);
      }
    }
    const focusStartRowNode = grid.getChildAtIndex(focusStartRow);
    invariant(
      DEPRECATED_$isGridRowNode(focusStartRowNode),
      'focusEndRow is not a GridRowNode',
    );
    focusStartRowNode.insertBefore(newRow);
  }
}

export function $insertTableColumn(
  tableNode: TableNode,
  targetIndex: number,
  shouldInsertAfter = true,
  columnCount: number,
  grid: Grid,
): TableNode {
  const tableRows = tableNode.getChildren();

  for (let r = 0; r < tableRows.length; r++) {
    const currentTableRowNode = tableRows[r];

    if ($isTableRowNode(currentTableRowNode)) {
      for (let c = 0; c < columnCount; c++) {
        const tableRowChildren = currentTableRowNode.getChildren();

        if (targetIndex >= tableRowChildren.length || targetIndex < 0) {
          throw new Error('Table column target index out of range');
        }

        const targetCell = tableRowChildren[targetIndex];

        invariant($isTableCellNode(targetCell), 'Expected table cell');

        const {left, right} = $getTableCellSiblingsFromTableCellNode(
          targetCell,
          grid,
        );

        let headerState = TableCellHeaderStates.NO_STATUS;

        if (
          (left && left.hasHeaderState(TableCellHeaderStates.ROW)) ||
          (right && right.hasHeaderState(TableCellHeaderStates.ROW))
        ) {
          headerState |= TableCellHeaderStates.ROW;
        }

        const newTableCell = $createTableCellNode(headerState);

        newTableCell.append($createParagraphNode());

        if (shouldInsertAfter) {
          targetCell.insertAfter(newTableCell);
        } else {
          targetCell.insertBefore(newTableCell);
        }
      }
    }
  }

  return tableNode;
}

export function $insertTableColumn__EXPERIMENTAL(insertAfter = true): void {
  const selection = $getSelection();
  invariant(
    $isRangeSelection(selection) || DEPRECATED_$isGridSelection(selection),
    'Expected a RangeSelection or GridSelection',
  );
  const focus = selection.focus.getNode();
  const [focusCell, , grid] = DEPRECATED_$getNodeTriplet(focus);
  const [gridMap, focusCellMap] = DEPRECATED_$computeGridMap(
    grid,
    focusCell,
    focusCell,
  );
  const rowCount = gridMap.length;
  const {startColumn: focusStartColumn} = focusCellMap;
  if (insertAfter) {
    const focusEndColumn = focusStartColumn + focusCell.__colSpan - 1;
    for (let i = 0; i < rowCount; i++) {
      const {cell, startColumn} = gridMap[i][focusEndColumn];
      if (startColumn + cell.__colSpan - 1 <= focusEndColumn) {
        cell.insertAfter($createTableCellNode(TableCellHeaderStates.NO_STATUS));
      } else {
        cell.setColSpan(cell.__colSpan + 1);
      }
    }
  } else {
    for (let i = 0; i < rowCount; i++) {
      const {cell, startColumn} = gridMap[i][focusStartColumn];
      if (startColumn === focusStartColumn) {
        cell.insertBefore(
          $createTableCellNode(TableCellHeaderStates.NO_STATUS),
        );
      } else {
        cell.setColSpan(cell.__colSpan + 1);
      }
    }
  }
}

export function $deleteTableColumn(
  tableNode: TableNode,
  targetIndex: number,
): TableNode {
  const tableRows = tableNode.getChildren();

  for (let i = 0; i < tableRows.length; i++) {
    const currentTableRowNode = tableRows[i];

    if ($isTableRowNode(currentTableRowNode)) {
      const tableRowChildren = currentTableRowNode.getChildren();

      if (targetIndex >= tableRowChildren.length || targetIndex < 0) {
        throw new Error('Table column target index out of range');
      }

      tableRowChildren[targetIndex].remove();
    }
  }

  return tableNode;
}

export function $deleteTableRow__EXPERIMENTAL(): void {
  const selection = $getSelection();
  invariant(
    $isRangeSelection(selection) || DEPRECATED_$isGridSelection(selection),
    'Expected a RangeSelection or GridSelection',
  );
  const anchor = selection.anchor.getNode();
  const focus = selection.focus.getNode();
  const [anchorCell, , grid] = DEPRECATED_$getNodeTriplet(anchor);
  const [focusCell] = DEPRECATED_$getNodeTriplet(focus);
  const [gridMap, anchorCellMap, focusCellMap] = DEPRECATED_$computeGridMap(
    grid,
    anchorCell,
    focusCell,
  );
  const {startRow: anchorStartRow} = anchorCellMap;
  const {startRow: focusStartRow} = focusCellMap;
  const focusEndRow = focusStartRow + focusCell.__rowSpan - 1;
  if (gridMap.length === focusEndRow - anchorStartRow + 1) {
    // Empty grid
    grid.remove();
    return;
  }
  const columnCount = gridMap[0].length;
  const nextRow = gridMap[focusEndRow + 1];
  const nextRowNode = grid.getChildAtIndex(focusEndRow + 1);
  invariant(
    DEPRECATED_$isGridRowNode(nextRowNode),
    'Expected GridNode childAtIndex(%s) to be RowNode',
    String(focusEndRow + 1),
  );
  for (let row = focusEndRow; row >= anchorStartRow; row--) {
    for (let column = columnCount - 1; column >= 0; column--) {
      const {
        cell,
        startRow: cellStartRow,
        startColumn: cellStartColumn,
      } = gridMap[row][column];
      if (cellStartColumn !== column) {
        // Don't repeat work for the same Cell
        continue;
      }
      // Rows overflowing top have to be trimmed
      if (row === anchorStartRow && cellStartRow < anchorStartRow) {
        cell.setRowSpan(cell.__rowSpan - (cellStartRow - anchorStartRow));
      }
      // Rows overflowing bottom have to be trimmed and moved to the next row
      if (
        cellStartRow >= anchorStartRow &&
        cellStartRow + cell.__rowSpan - 1 > focusEndRow
      ) {
        cell.setRowSpan(cell.__rowSpan - (focusEndRow - cellStartRow + 1));
        if (column === 0) {
          $insertFirst(nextRowNode, cell);
        } else {
          const {cell: previousCell} = nextRow[column - 1];
          previousCell.insertAfter(cell);
        }
      }
    }
    const rowNode = grid.getChildAtIndex(row);
    invariant(
      DEPRECATED_$isGridRowNode(rowNode),
      'Expected GridNode childAtIndex(%s) to be RowNode',
      String(row),
    );
    rowNode.remove();
  }
  if (nextRow !== undefined) {
    const {cell} = nextRow[0];
    $moveSelectionToCell(cell);
  } else {
    const previousRow = gridMap[anchorStartRow - 1];
    const {cell} = previousRow[0];
    $moveSelectionToCell(cell);
  }
}

function $moveSelectionToCell(cell: DEPRECATED_GridCellNode): void {
  const firstDescendant = cell.getFirstDescendant();
  invariant(firstDescendant !== null, 'Unexpected empty cell');
  firstDescendant.getParentOrThrow().selectStart();
}

function $insertFirst(parent: ElementNode, node: LexicalNode): void {
  const firstChild = parent.getFirstChild();
  if (firstChild !== null) {
    parent.insertBefore(firstChild);
  } else {
    parent.append(node);
  }
}
