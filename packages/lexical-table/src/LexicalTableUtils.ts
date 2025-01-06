/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {TableMapType, TableMapValueType} from './LexicalTableSelection';
import type {ElementNode, PointType} from 'lexical';

import {$findMatchingParent} from '@lexical/utils';
import {
  $createParagraphNode,
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  LexicalNode,
} from 'lexical';
import invariant from 'shared/invariant';

import {InsertTableCommandPayloadHeaders} from '.';
import {
  $createTableCellNode,
  $isTableCellNode,
  TableCellHeaderState,
  TableCellHeaderStates,
  TableCellNode,
} from './LexicalTableCellNode';
import {$createTableNode, $isTableNode, TableNode} from './LexicalTableNode';
import {TableDOMTable} from './LexicalTableObserver';
import {
  $createTableRowNode,
  $isTableRowNode,
  TableRowNode,
} from './LexicalTableRowNode';
import {$isTableSelection} from './LexicalTableSelection';

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
        if (iRow === 0 && includeHeaders.rows) {
          headerState |= TableCellHeaderStates.ROW;
        }
        if (iColumn === 0 && includeHeaders.columns) {
          headerState |= TableCellHeaderStates.COLUMN;
        }
      } else if (includeHeaders) {
        if (iRow === 0) {
          headerState |= TableCellHeaderStates.ROW;
        }
        if (iColumn === 0) {
          headerState |= TableCellHeaderStates.COLUMN;
        }
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
  table: TableDOMTable,
): TableCellSiblings {
  const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
  const {x, y} = tableNode.getCordsFromCellNode(tableCellNode, table);
  return {
    above: tableNode.getCellNodeFromCords(x, y - 1, table),
    below: tableNode.getCellNodeFromCords(x, y + 1, table),
    left: tableNode.getCellNodeFromCords(x - 1, y, table),
    right: tableNode.getCellNodeFromCords(x + 1, y, table),
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
  table: TableDOMTable,
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
          table,
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

const getHeaderState = (
  currentState: TableCellHeaderState,
  possibleState: TableCellHeaderState,
): TableCellHeaderState => {
  if (
    currentState === TableCellHeaderStates.BOTH ||
    currentState === possibleState
  ) {
    return possibleState;
  }
  return TableCellHeaderStates.NO_STATUS;
};

/**
 * Inserts a table row before or after the current focus cell node,
 * taking into account any spans. If successful, returns the
 * inserted table row node.
 */
export function $insertTableRow__EXPERIMENTAL(
  insertAfter = true,
): TableRowNode | null {
  const selection = $getSelection();
  invariant(
    $isRangeSelection(selection) || $isTableSelection(selection),
    'Expected a RangeSelection or TableSelection',
  );
  const anchor = selection.anchor.getNode();
  const focus = selection.focus.getNode();
  const [anchorCell] = $getNodeTriplet(anchor);
  const [focusCell, , grid] = $getNodeTriplet(focus);
  const [gridMap, focusCellMap, anchorCellMap] = $computeTableMap(
    grid,
    focusCell,
    anchorCell,
  );
  const columnCount = gridMap[0].length;
  const {startRow: anchorStartRow} = anchorCellMap;
  const {startRow: focusStartRow} = focusCellMap;
  let insertedRow: TableRowNode | null = null;
  if (insertAfter) {
    const insertAfterEndRow =
      Math.max(
        focusStartRow + focusCell.__rowSpan,
        anchorStartRow + anchorCell.__rowSpan,
      ) - 1;
    const insertAfterEndRowMap = gridMap[insertAfterEndRow];
    const newRow = $createTableRowNode();
    for (let i = 0; i < columnCount; i++) {
      const {cell, startRow} = insertAfterEndRowMap[i];
      if (startRow + cell.__rowSpan - 1 <= insertAfterEndRow) {
        const currentCell = insertAfterEndRowMap[i].cell as TableCellNode;
        const currentCellHeaderState = currentCell.__headerState;

        const headerState = getHeaderState(
          currentCellHeaderState,
          TableCellHeaderStates.COLUMN,
        );

        newRow.append(
          $createTableCellNode(headerState).append($createParagraphNode()),
        );
      } else {
        cell.setRowSpan(cell.__rowSpan + 1);
      }
    }
    const insertAfterEndRowNode = grid.getChildAtIndex(insertAfterEndRow);
    invariant(
      $isTableRowNode(insertAfterEndRowNode),
      'insertAfterEndRow is not a TableRowNode',
    );
    insertAfterEndRowNode.insertAfter(newRow);
    insertedRow = newRow;
  } else {
    const insertBeforeStartRow = Math.min(focusStartRow, anchorStartRow);
    const insertBeforeStartRowMap = gridMap[insertBeforeStartRow];
    const newRow = $createTableRowNode();
    for (let i = 0; i < columnCount; i++) {
      const {cell, startRow} = insertBeforeStartRowMap[i];
      if (startRow === insertBeforeStartRow) {
        const currentCell = insertBeforeStartRowMap[i].cell as TableCellNode;
        const currentCellHeaderState = currentCell.__headerState;

        const headerState = getHeaderState(
          currentCellHeaderState,
          TableCellHeaderStates.COLUMN,
        );

        newRow.append(
          $createTableCellNode(headerState).append($createParagraphNode()),
        );
      } else {
        cell.setRowSpan(cell.__rowSpan + 1);
      }
    }
    const insertBeforeStartRowNode = grid.getChildAtIndex(insertBeforeStartRow);
    invariant(
      $isTableRowNode(insertBeforeStartRowNode),
      'insertBeforeStartRow is not a TableRowNode',
    );
    insertBeforeStartRowNode.insertBefore(newRow);
    insertedRow = newRow;
  }
  return insertedRow;
}

export function $insertTableColumn(
  tableNode: TableNode,
  targetIndex: number,
  shouldInsertAfter = true,
  columnCount: number,
  table: TableDOMTable,
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
          table,
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

/**
 * Inserts a column before or after the current focus cell node,
 * taking into account any spans. If successful, returns the
 * first inserted cell node.
 */
export function $insertTableColumn__EXPERIMENTAL(
  insertAfter = true,
): TableCellNode | null {
  const selection = $getSelection();
  invariant(
    $isRangeSelection(selection) || $isTableSelection(selection),
    'Expected a RangeSelection or TableSelection',
  );
  const anchor = selection.anchor.getNode();
  const focus = selection.focus.getNode();
  const [anchorCell] = $getNodeTriplet(anchor);
  const [focusCell, , grid] = $getNodeTriplet(focus);
  const [gridMap, focusCellMap, anchorCellMap] = $computeTableMap(
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
    $isTableRowNode(gridFirstChild),
    'Expected firstTable child to be a row',
  );
  let firstInsertedCell: null | TableCellNode = null;
  function $createTableCellNodeForInsertTableColumn(
    headerState: TableCellHeaderState = TableCellHeaderStates.NO_STATUS,
  ) {
    const cell = $createTableCellNode(headerState).append(
      $createParagraphNode(),
    );
    if (firstInsertedCell === null) {
      firstInsertedCell = cell;
    }
    return cell;
  }
  let loopRow: TableRowNode = gridFirstChild;
  rowLoop: for (let i = 0; i < rowCount; i++) {
    if (i !== 0) {
      const currentRow = loopRow.getNextSibling();
      invariant(
        $isTableRowNode(currentRow),
        'Expected row nextSibling to be a row',
      );
      loopRow = currentRow;
    }
    const rowMap = gridMap[i];

    const currentCellHeaderState = (
      rowMap[insertAfterColumn < 0 ? 0 : insertAfterColumn]
        .cell as TableCellNode
    ).__headerState;

    const headerState = getHeaderState(
      currentCellHeaderState,
      TableCellHeaderStates.ROW,
    );

    if (insertAfterColumn < 0) {
      $insertFirst(
        loopRow,
        $createTableCellNodeForInsertTableColumn(headerState),
      );
      continue;
    }
    const {
      cell: currentCell,
      startColumn: currentStartColumn,
      startRow: currentStartRow,
    } = rowMap[insertAfterColumn];
    if (currentStartColumn + currentCell.__colSpan - 1 <= insertAfterColumn) {
      let insertAfterCell: TableCellNode = currentCell;
      let insertAfterCellRowStart = currentStartRow;
      let prevCellIndex = insertAfterColumn;
      while (insertAfterCellRowStart !== i && insertAfterCell.__rowSpan > 1) {
        prevCellIndex -= currentCell.__colSpan;
        if (prevCellIndex >= 0) {
          const {cell: cell_, startRow: startRow_} = rowMap[prevCellIndex];
          insertAfterCell = cell_;
          insertAfterCellRowStart = startRow_;
        } else {
          loopRow.append($createTableCellNodeForInsertTableColumn(headerState));
          continue rowLoop;
        }
      }
      insertAfterCell.insertAfter(
        $createTableCellNodeForInsertTableColumn(headerState),
      );
    } else {
      currentCell.setColSpan(currentCell.__colSpan + 1);
    }
  }
  if (firstInsertedCell !== null) {
    $moveSelectionToCell(firstInsertedCell);
  }
  const colWidths = grid.getColWidths();
  if (colWidths) {
    const newColWidths = [...colWidths];
    const columnIndex = insertAfterColumn < 0 ? 0 : insertAfterColumn;
    const newWidth = newColWidths[columnIndex];
    newColWidths.splice(columnIndex, 0, newWidth);
    grid.setColWidths(newColWidths);
  }
  return firstInsertedCell;
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
    $isRangeSelection(selection) || $isTableSelection(selection),
    'Expected a RangeSelection or TableSelection',
  );
  const [anchor, focus] = selection.isBackward()
    ? [selection.focus.getNode(), selection.anchor.getNode()]
    : [selection.anchor.getNode(), selection.focus.getNode()];
  const [anchorCell, , grid] = $getNodeTriplet(anchor);
  const [focusCell] = $getNodeTriplet(focus);
  const [gridMap, anchorCellMap, focusCellMap] = $computeTableMap(
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
  const selectedRowCount = anchorCell.__rowSpan;
  const nextRow = gridMap[focusEndRow + 1];
  const nextRowNode: null | TableRowNode = grid.getChildAtIndex(
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
        const overflowTop = anchorStartRow - cellStartRow;
        cell.setRowSpan(
          cell.__rowSpan -
            Math.min(selectedRowCount, cell.__rowSpan - overflowTop),
        );
      }
      // Rows overflowing bottom have to be trimmed and moved to the next row
      if (
        cellStartRow >= anchorStartRow &&
        cellStartRow + cell.__rowSpan - 1 > focusEndRow
      ) {
        cell.setRowSpan(cell.__rowSpan - (focusEndRow - cellStartRow + 1));
        invariant(nextRowNode !== null, 'Expected nextRowNode not to be null');
        let insertAfterCell: null | TableCellNode = null;
        for (let columnIndex = 0; columnIndex < column; columnIndex++) {
          const currentCellMap = nextRow[columnIndex];
          const currentCell = currentCellMap.cell;
          // Checking the cell having startRow as same as nextRow
          if (currentCellMap.startRow === row + 1) {
            insertAfterCell = currentCell;
          }
          if (currentCell.__colSpan > 1) {
            columnIndex += currentCell.__colSpan - 1;
          }
        }
        if (insertAfterCell === null) {
          $insertFirst(nextRowNode, cell);
        } else {
          insertAfterCell.insertAfter(cell);
        }
      }
    }
    const rowNode = grid.getChildAtIndex(row);
    invariant(
      $isTableRowNode(rowNode),
      'Expected TableNode childAtIndex(%s) to be RowNode',
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
    $isRangeSelection(selection) || $isTableSelection(selection),
    'Expected a RangeSelection or TableSelection',
  );
  const anchor = selection.anchor.getNode();
  const focus = selection.focus.getNode();
  const [anchorCell, , grid] = $getNodeTriplet(anchor);
  const [focusCell] = $getNodeTriplet(focus);
  const [gridMap, anchorCellMap, focusCellMap] = $computeTableMap(
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
  const nextColumn =
    anchorStartColumn > focusStartColumn
      ? focusRowMap[anchorStartColumn + anchorCell.__colSpan]
      : focusRowMap[focusStartColumn + focusCell.__colSpan];
  if (nextColumn !== undefined) {
    const {cell} = nextColumn;
    $moveSelectionToCell(cell);
  } else {
    const previousRow =
      focusStartColumn < anchorStartColumn
        ? focusRowMap[focusStartColumn - 1]
        : focusRowMap[anchorStartColumn - 1];
    const {cell} = previousRow;
    $moveSelectionToCell(cell);
  }
  const colWidths = grid.getColWidths();
  if (colWidths) {
    const newColWidths = [...colWidths];
    newColWidths.splice(startColumn, selectedColumnCount);
    grid.setColWidths(newColWidths);
  }
}

function $moveSelectionToCell(cell: TableCellNode): void {
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
    $isRangeSelection(selection) || $isTableSelection(selection),
    'Expected a RangeSelection or TableSelection',
  );
  const anchor = selection.anchor.getNode();
  const [cell, row, grid] = $getNodeTriplet(anchor);
  const colSpan = cell.__colSpan;
  const rowSpan = cell.__rowSpan;
  if (colSpan === 1 && rowSpan === 1) {
    return;
  }
  const [map, cellMap] = $computeTableMap(grid, cell, cell);
  const {startColumn, startRow} = cellMap;
  // Create a heuristic for what the style of the unmerged cells should be
  // based on whether every row or column already had that state before the
  // unmerge.
  const baseColStyle = cell.__headerState & TableCellHeaderStates.COLUMN;
  const colStyles = Array.from({length: colSpan}, (_v, i) => {
    let colStyle = baseColStyle;
    for (let rowIdx = 0; colStyle !== 0 && rowIdx < map.length; rowIdx++) {
      colStyle &= map[rowIdx][i + startColumn].cell.__headerState;
    }
    return colStyle;
  });
  const baseRowStyle = cell.__headerState & TableCellHeaderStates.ROW;
  const rowStyles = Array.from({length: rowSpan}, (_v, i) => {
    let rowStyle = baseRowStyle;
    for (let colIdx = 0; rowStyle !== 0 && colIdx < map[0].length; colIdx++) {
      rowStyle &= map[i + startRow][colIdx].cell.__headerState;
    }
    return rowStyle;
  });

  if (colSpan > 1) {
    for (let i = 1; i < colSpan; i++) {
      cell.insertAfter(
        $createTableCellNode(colStyles[i] | rowStyles[0]).append(
          $createParagraphNode(),
        ),
      );
    }
    cell.setColSpan(1);
  }

  if (rowSpan > 1) {
    let currentRowNode;
    for (let i = 1; i < rowSpan; i++) {
      const currentRow = startRow + i;
      const currentRowMap = map[currentRow];
      currentRowNode = (currentRowNode || row).getNextSibling();
      invariant(
        $isTableRowNode(currentRowNode),
        'Expected row next sibling to be a row',
      );
      let insertAfterCell: null | TableCellNode = null;
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
        for (let j = colSpan - 1; j >= 0; j--) {
          $insertFirst(
            currentRowNode,
            $createTableCellNode(colStyles[j] | rowStyles[i]).append(
              $createParagraphNode(),
            ),
          );
        }
      } else {
        for (let j = colSpan - 1; j >= 0; j--) {
          insertAfterCell.insertAfter(
            $createTableCellNode(colStyles[j] | rowStyles[i]).append(
              $createParagraphNode(),
            ),
          );
        }
      }
    }
    cell.setRowSpan(1);
  }
}

export function $computeTableMap(
  tableNode: TableNode,
  cellA: TableCellNode,
  cellB: TableCellNode,
): [TableMapType, TableMapValueType, TableMapValueType] {
  const [tableMap, cellAValue, cellBValue] = $computeTableMapSkipCellCheck(
    tableNode,
    cellA,
    cellB,
  );
  invariant(cellAValue !== null, 'Anchor not found in Table');
  invariant(cellBValue !== null, 'Focus not found in Table');
  return [tableMap, cellAValue, cellBValue];
}

export function $computeTableMapSkipCellCheck(
  tableNode: TableNode,
  cellA: null | TableCellNode,
  cellB: null | TableCellNode,
): [
  tableMap: TableMapType,
  cellAValue: TableMapValueType | null,
  cellBValue: TableMapValueType | null,
] {
  const tableMap: TableMapType = [];
  let cellAValue: null | TableMapValueType = null;
  let cellBValue: null | TableMapValueType = null;
  function getMapRow(i: number) {
    let row = tableMap[i];
    if (row === undefined) {
      tableMap[i] = row = [];
    }
    return row;
  }
  const gridChildren = tableNode.getChildren();
  for (let rowIdx = 0; rowIdx < gridChildren.length; rowIdx++) {
    const row = gridChildren[rowIdx];
    invariant(
      $isTableRowNode(row),
      'Expected TableNode children to be TableRowNode',
    );
    for (
      let cell = row.getFirstChild(), colIdx = 0;
      cell != null;
      cell = cell.getNextSibling()
    ) {
      invariant(
        $isTableCellNode(cell),
        'Expected TableRowNode children to be TableCellNode',
      );
      // Skip past any columns that were merged from a higher row
      const startMapRow = getMapRow(rowIdx);
      while (startMapRow[colIdx] !== undefined) {
        colIdx++;
      }
      const value: TableMapValueType = {
        cell,
        startColumn: colIdx,
        startRow: rowIdx,
      };
      const {__rowSpan: rowSpan, __colSpan: colSpan} = cell;
      for (let j = 0; j < rowSpan; j++) {
        if (rowIdx + j >= gridChildren.length) {
          // The table is non-rectangular with a rowSpan
          // below the last <tr> in the table.
          // We should probably handle this with a node transform
          // to ensure that tables are always rectangular but this
          // will avoid crashes such as #6584
          // Note that there are probably still latent bugs
          // regarding colSpan or general cell count mismatches.
          break;
        }
        const mapRow = getMapRow(rowIdx + j);
        for (let i = 0; i < colSpan; i++) {
          mapRow[colIdx + i] = value;
        }
      }
      if (cellA !== null && cellAValue === null && cellA.is(cell)) {
        cellAValue = value;
      }
      if (cellB !== null && cellBValue === null && cellB.is(cell)) {
        cellBValue = value;
      }
    }
  }
  return [tableMap, cellAValue, cellBValue];
}

export function $getNodeTriplet(
  source: PointType | LexicalNode | TableCellNode,
): [TableCellNode, TableRowNode, TableNode] {
  let cell: TableCellNode;
  if (source instanceof TableCellNode) {
    cell = source;
  } else if ('__type' in source) {
    const cell_ = $findMatchingParent(source, $isTableCellNode);
    invariant(
      $isTableCellNode(cell_),
      'Expected to find a parent TableCellNode',
    );
    cell = cell_;
  } else {
    const cell_ = $findMatchingParent(source.getNode(), $isTableCellNode);
    invariant(
      $isTableCellNode(cell_),
      'Expected to find a parent TableCellNode',
    );
    cell = cell_;
  }
  const row = cell.getParent();
  invariant(
    $isTableRowNode(row),
    'Expected TableCellNode to have a parent TableRowNode',
  );
  const grid = row.getParent();
  invariant(
    $isTableNode(grid),
    'Expected TableRowNode to have a parent TableNode',
  );
  return [cell, row, grid];
}

export interface TableCellRectBoundary {
  minColumn: number;
  minRow: number;
  maxColumn: number;
  maxRow: number;
}

export interface TableCellRectSpans {
  topSpan: number;
  leftSpan: number;
  rightSpan: number;
  bottomSpan: number;
}

export function $computeTableCellRectSpans(
  map: TableMapType,
  boundary: TableCellRectBoundary,
): TableCellRectSpans {
  const {minColumn, maxColumn, minRow, maxRow} = boundary;
  let topSpan = 1;
  let leftSpan = 1;
  let rightSpan = 1;
  let bottomSpan = 1;
  const topRow = map[minRow];
  const bottomRow = map[maxRow];
  for (let col = minColumn; col <= maxColumn; col++) {
    topSpan = Math.max(topSpan, topRow[col].cell.__rowSpan);
    bottomSpan = Math.max(bottomSpan, bottomRow[col].cell.__rowSpan);
  }
  for (let row = minRow; row <= maxRow; row++) {
    leftSpan = Math.max(leftSpan, map[row][minColumn].cell.__colSpan);
    rightSpan = Math.max(rightSpan, map[row][maxColumn].cell.__colSpan);
  }
  return {bottomSpan, leftSpan, rightSpan, topSpan};
}

export function $computeTableCellRectBoundary(
  map: TableMapType,
  cellAMap: TableMapValueType,
  cellBMap: TableMapValueType,
): TableCellRectBoundary {
  let minColumn = Math.min(cellAMap.startColumn, cellBMap.startColumn);
  let minRow = Math.min(cellAMap.startRow, cellBMap.startRow);
  let maxColumn = Math.max(
    cellAMap.startColumn + cellAMap.cell.__colSpan - 1,
    cellBMap.startColumn + cellBMap.cell.__colSpan - 1,
  );
  let maxRow = Math.max(
    cellAMap.startRow + cellAMap.cell.__rowSpan - 1,
    cellBMap.startRow + cellBMap.cell.__rowSpan - 1,
  );
  let exploredMinColumn = minColumn;
  let exploredMinRow = minRow;
  let exploredMaxColumn = minColumn;
  let exploredMaxRow = minRow;
  function expandBoundary(mapValue: TableMapValueType): void {
    const {
      cell,
      startColumn: cellStartColumn,
      startRow: cellStartRow,
    } = mapValue;
    minColumn = Math.min(minColumn, cellStartColumn);
    minRow = Math.min(minRow, cellStartRow);
    maxColumn = Math.max(maxColumn, cellStartColumn + cell.__colSpan - 1);
    maxRow = Math.max(maxRow, cellStartRow + cell.__rowSpan - 1);
  }
  while (
    minColumn < exploredMinColumn ||
    minRow < exploredMinRow ||
    maxColumn > exploredMaxColumn ||
    maxRow > exploredMaxRow
  ) {
    if (minColumn < exploredMinColumn) {
      // Expand on the left
      const rowDiff = exploredMaxRow - exploredMinRow;
      const previousColumn = exploredMinColumn - 1;
      for (let i = 0; i <= rowDiff; i++) {
        expandBoundary(map[exploredMinRow + i][previousColumn]);
      }
      exploredMinColumn = previousColumn;
    }
    if (minRow < exploredMinRow) {
      // Expand on top
      const columnDiff = exploredMaxColumn - exploredMinColumn;
      const previousRow = exploredMinRow - 1;
      for (let i = 0; i <= columnDiff; i++) {
        expandBoundary(map[previousRow][exploredMinColumn + i]);
      }
      exploredMinRow = previousRow;
    }
    if (maxColumn > exploredMaxColumn) {
      // Expand on the right
      const rowDiff = exploredMaxRow - exploredMinRow;
      const nextColumn = exploredMaxColumn + 1;
      for (let i = 0; i <= rowDiff; i++) {
        expandBoundary(map[exploredMinRow + i][nextColumn]);
      }
      exploredMaxColumn = nextColumn;
    }
    if (maxRow > exploredMaxRow) {
      // Expand on the bottom
      const columnDiff = exploredMaxColumn - exploredMinColumn;
      const nextRow = exploredMaxRow + 1;
      for (let i = 0; i <= columnDiff; i++) {
        expandBoundary(map[nextRow][exploredMinColumn + i]);
      }
      exploredMaxRow = nextRow;
    }
  }
  return {maxColumn, maxRow, minColumn, minRow};
}

export function $getTableCellNodeRect(tableCellNode: TableCellNode): {
  rowIndex: number;
  columnIndex: number;
  rowSpan: number;
  colSpan: number;
} | null {
  const [cellNode, , gridNode] = $getNodeTriplet(tableCellNode);
  const rows = gridNode.getChildren<TableRowNode>();
  const rowCount = rows.length;
  const columnCount = rows[0].getChildren().length;

  // Create a matrix of the same size as the table to track the position of each cell
  const cellMatrix = new Array(rowCount);
  for (let i = 0; i < rowCount; i++) {
    cellMatrix[i] = new Array(columnCount);
  }

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    const row = rows[rowIndex];
    const cells = row.getChildren<TableCellNode>();
    let columnIndex = 0;

    for (let cellIndex = 0; cellIndex < cells.length; cellIndex++) {
      // Find the next available position in the matrix, skip the position of merged cells
      while (cellMatrix[rowIndex][columnIndex]) {
        columnIndex++;
      }

      const cell = cells[cellIndex];
      const rowSpan = cell.__rowSpan || 1;
      const colSpan = cell.__colSpan || 1;

      // Put the cell into the corresponding position in the matrix
      for (let i = 0; i < rowSpan; i++) {
        for (let j = 0; j < colSpan; j++) {
          cellMatrix[rowIndex + i][columnIndex + j] = cell;
        }
      }

      // Return to the original index, row span and column span of the cell.
      if (cellNode === cell) {
        return {
          colSpan,
          columnIndex,
          rowIndex,
          rowSpan,
        };
      }

      columnIndex += colSpan;
    }
  }

  return null;
}
