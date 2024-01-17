/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Grid} from './LexicalTableSelection';
import type {DEPRECATED_GridRowNode, ElementNode} from 'lexical';

import {$findMatchingParent} from '@lexical/utils';
import {
  $createParagraphNode,
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  DEPRECATED_$computeGridMap,
  DEPRECATED_$getNodeTriplet,
  DEPRECATED_$isGridRowNode,
  DEPRECATED_GridCellNode,
  LexicalNode,
} from 'lexical';
import invariant from 'shared/invariant';

import {$isGridSelection, InsertTableCommandPayloadHeaders} from '.';
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
    $isRangeSelection(selection) || $isGridSelection(selection),
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
        newRow.append(
          $createTableCellNode(TableCellHeaderStates.NO_STATUS).append(
            $createParagraphNode(),
          ),
        );
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
        newRow.append(
          $createTableCellNode(TableCellHeaderStates.NO_STATUS).append(
            $createParagraphNode(),
          ),
        );
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

  const tableCellsToBeInserted = [];
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
        tableCellsToBeInserted.push({
          newTableCell,
          targetCell,
        });
      }
    }
  }
  tableCellsToBeInserted.forEach(({newTableCell, targetCell}) => {
    if (shouldInsertAfter) {
      targetCell.insertAfter(newTableCell);
    } else {
      targetCell.insertBefore(newTableCell);
    }
  });

  return tableNode;
}

export function $insertTableColumn__EXPERIMENTAL(insertAfter = true): void {
  const selection = $getSelection();
  invariant(
    $isRangeSelection(selection) || $isGridSelection(selection),
    'Expected a RangeSelection or GridSelection',
  );
  const anchor = selection.anchor.getNode();
  const focus = selection.focus.getNode();
  const [anchorCell] = DEPRECATED_$getNodeTriplet(anchor);
  const [focusCell, , grid] = DEPRECATED_$getNodeTriplet(focus);
  const [gridMap, focusCellMap, anchorCellMap] = DEPRECATED_$computeGridMap(
    grid,
    focusCell,
    anchorCell,
  );
  const rowCount = gridMap.length;
  const startColumn = insertAfter
    ? Math.max(focusCellMap.startColumn, anchorCellMap.startColumn)
    : Math.min(focusCellMap.startColumn, anchorCellMap.startColumn);
  const insertAfterColumn = insertAfter
    ? startColumn + focusCell.__colSpan - 1
    : startColumn - 1;
  const gridFirstChild = grid.getFirstChild();
  invariant(
    DEPRECATED_$isGridRowNode(gridFirstChild),
    'Expected firstTable child to be a row',
  );
  let firstInsertedCell: null | DEPRECATED_GridCellNode = null;
  function $createTableCellNodeForInsertTableColumn() {
    const cell = $createTableCellNode(TableCellHeaderStates.NO_STATUS).append(
      $createParagraphNode(),
    );
    if (firstInsertedCell === null) {
      firstInsertedCell = cell;
    }
    return cell;
  }
  let loopRow: DEPRECATED_GridRowNode = gridFirstChild;
  rowLoop: for (let i = 0; i < rowCount; i++) {
    if (i !== 0) {
      const currentRow = loopRow.getNextSibling();
      invariant(
        DEPRECATED_$isGridRowNode(currentRow),
        'Expected row nextSibling to be a row',
      );
      loopRow = currentRow;
    }
    const rowMap = gridMap[i];
    if (insertAfterColumn < 0) {
      $insertFirst(loopRow, $createTableCellNodeForInsertTableColumn());
      continue;
    }
    const {
      cell: currentCell,
      startColumn: currentStartColumn,
      startRow: currentStartRow,
    } = rowMap[insertAfterColumn];
    if (currentStartColumn + currentCell.__colSpan - 1 <= insertAfterColumn) {
      let insertAfterCell: DEPRECATED_GridCellNode = currentCell;
      let insertAfterCellRowStart = currentStartRow;
      let prevCellIndex = insertAfterColumn;
      while (insertAfterCellRowStart !== i && insertAfterCell.__rowSpan > 1) {
        prevCellIndex -= currentCell.__colSpan;
        if (prevCellIndex >= 0) {
          const {cell: cell_, startRow: startRow_} = rowMap[prevCellIndex];
          insertAfterCell = cell_;
          insertAfterCellRowStart = startRow_;
        } else {
          loopRow.append($createTableCellNodeForInsertTableColumn());
          continue rowLoop;
        }
      }
      insertAfterCell.insertAfter($createTableCellNodeForInsertTableColumn());
    } else {
      currentCell.setColSpan(currentCell.__colSpan + 1);
    }
  }
  if (firstInsertedCell !== null) {
    $moveSelectionToCell(firstInsertedCell);
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
    $isRangeSelection(selection) || $isGridSelection(selection),
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
  const nextRowNode: null | DEPRECATED_GridRowNode = grid.getChildAtIndex(
    focusEndRow + 1,
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
        invariant(nextRowNode !== null, 'Expected nextRowNode not to be null');
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

export function $deleteTableColumn__EXPERIMENTAL(): void {
  const selection = $getSelection();
  invariant(
    $isRangeSelection(selection) || $isGridSelection(selection),
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
  const {startColumn: anchorStartColumn} = anchorCellMap;
  const {startRow: focusStartRow, startColumn: focusStartColumn} = focusCellMap;
  const startColumn = Math.min(anchorStartColumn, focusStartColumn);
  const endColumn = Math.max(
    anchorStartColumn + anchorCell.__colSpan - 1,
    focusStartColumn + focusCell.__colSpan - 1,
  );
  const selectedColumnCount = endColumn - startColumn + 1;
  const columnCount = gridMap[0].length;
  if (columnCount === endColumn - startColumn + 1) {
    // Empty grid
    grid.selectPrevious();
    grid.remove();
    return;
  }
  const rowCount = gridMap.length;
  for (let row = 0; row < rowCount; row++) {
    for (let column = startColumn; column <= endColumn; column++) {
      const {cell, startColumn: cellStartColumn} = gridMap[row][column];
      if (cellStartColumn < startColumn) {
        if (column === startColumn) {
          const overflowLeft = startColumn - cellStartColumn;
          // Overflowing left
          cell.setColSpan(
            cell.__colSpan -
              // Possible overflow right too
              Math.min(selectedColumnCount, cell.__colSpan - overflowLeft),
          );
        }
      } else if (cellStartColumn + cell.__colSpan - 1 > endColumn) {
        if (column === endColumn) {
          // Overflowing right
          const inSelectedArea = endColumn - cellStartColumn + 1;
          cell.setColSpan(cell.__colSpan - inSelectedArea);
        }
      } else {
        cell.remove();
      }
    }
  }
  const focusRowMap = gridMap[focusStartRow];
  const nextColumn = focusRowMap[focusStartColumn + focusCell.__colSpan];
  if (nextColumn !== undefined) {
    const {cell} = nextColumn;
    $moveSelectionToCell(cell);
  } else {
    const previousRow = focusRowMap[focusStartColumn - 1];
    const {cell} = previousRow;
    $moveSelectionToCell(cell);
  }
}

function $moveSelectionToCell(cell: DEPRECATED_GridCellNode): void {
  const firstDescendant = cell.getFirstDescendant();
  if (firstDescendant == null) {
    cell.selectStart();
  } else {
    firstDescendant.getParentOrThrow().selectStart();
  }
}

function $insertFirst(parent: ElementNode, node: LexicalNode): void {
  const firstChild = parent.getFirstChild();
  if (firstChild !== null) {
    firstChild.insertBefore(node);
  } else {
    parent.append(node);
  }
}

export function $unmergeCell(): void {
  const selection = $getSelection();
  invariant(
    $isRangeSelection(selection) || $isGridSelection(selection),
    'Expected a RangeSelection or GridSelection',
  );
  const anchor = selection.anchor.getNode();
  const [cell, row, grid] = DEPRECATED_$getNodeTriplet(anchor);
  const colSpan = cell.__colSpan;
  const rowSpan = cell.__rowSpan;
  if (colSpan > 1) {
    for (let i = 1; i < colSpan; i++) {
      cell.insertAfter($createTableCellNode(TableCellHeaderStates.NO_STATUS));
    }
    cell.setColSpan(1);
  }
  if (rowSpan > 1) {
    const [map, cellMap] = DEPRECATED_$computeGridMap(grid, cell, cell);
    const {startColumn, startRow} = cellMap;
    let currentRowNode;
    for (let i = 1; i < rowSpan; i++) {
      const currentRow = startRow + i;
      const currentRowMap = map[currentRow];
      currentRowNode = (currentRowNode || row).getNextSibling();
      invariant(
        DEPRECATED_$isGridRowNode(currentRowNode),
        'Expected row next sibling to be a row',
      );
      let insertAfterCell: null | DEPRECATED_GridCellNode = null;
      for (let column = 0; column < startColumn; column++) {
        const currentCellMap = currentRowMap[column];
        const currentCell = currentCellMap.cell;
        if (currentCellMap.startRow === currentRow) {
          insertAfterCell = currentCell;
        }
        if (currentCell.__colSpan > 1) {
          column += currentCell.__colSpan - 1;
        }
      }
      if (insertAfterCell === null) {
        for (let j = 0; j < colSpan; j++) {
          $insertFirst(
            currentRowNode,
            $createTableCellNode(TableCellHeaderStates.NO_STATUS),
          );
        }
      } else {
        for (let j = 0; j < colSpan; j++) {
          insertAfterCell.insertAfter(
            $createTableCellNode(TableCellHeaderStates.NO_STATUS),
          );
        }
      }
    }
    cell.setRowSpan(1);
  }
}
