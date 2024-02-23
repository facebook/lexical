/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$findMatchingParent} from '@lexical/utils';
import {
  $createPoint,
  $getNodeByKey,
  $isElementNode,
  $normalizeSelection__EXPERIMENTAL,
  BaseSelection,
  isCurrentlyReadOnlyMode,
  LexicalNode,
  NodeKey,
  PointType,
} from 'lexical';
import invariant from 'shared/invariant';

import {$isTableCellNode, TableCellNode} from './LexicalTableCellNode';
import {$isTableNode} from './LexicalTableNode';
import {$isTableRowNode} from './LexicalTableRowNode';
import {$computeTableMap, $getTableCellNodeRect} from './LexicalTableUtils';

export type TableSelectionShape = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
};

export type TableMapValueType = {
  cell: TableCellNode;
  startRow: number;
  startColumn: number;
};
export type TableMapType = Array<Array<TableMapValueType>>;

export class TableSelection implements BaseSelection {
  tableKey: NodeKey;
  anchor: PointType;
  focus: PointType;
  _cachedNodes: Array<LexicalNode> | null;
  dirty: boolean;

  constructor(tableKey: NodeKey, anchor: PointType, focus: PointType) {
    this.anchor = anchor;
    this.focus = focus;
    anchor._selection = this;
    focus._selection = this;
    this._cachedNodes = null;
    this.dirty = false;
    this.tableKey = tableKey;
  }

  getStartEndPoints(): [PointType, PointType] {
    return [this.anchor, this.focus];
  }

  /**
   * Returns whether the Selection is "backwards", meaning the focus
   * logically precedes the anchor in the EditorState.
   * @returns true if the Selection is backwards, false otherwise.
   */
  isBackward(): boolean {
    return this.focus.isBefore(this.anchor);
  }

  getCachedNodes(): LexicalNode[] | null {
    return this._cachedNodes;
  }

  setCachedNodes(nodes: LexicalNode[] | null): void {
    this._cachedNodes = nodes;
  }

  is(selection: null | BaseSelection): boolean {
    if (!$isTableSelection(selection)) {
      return false;
    }
    return (
      this.tableKey === selection.tableKey &&
      this.anchor.is(selection.anchor) &&
      this.focus.is(selection.focus)
    );
  }

  set(tableKey: NodeKey, anchorCellKey: NodeKey, focusCellKey: NodeKey): void {
    this.dirty = true;
    this.tableKey = tableKey;
    this.anchor.key = anchorCellKey;
    this.focus.key = focusCellKey;
    this._cachedNodes = null;
  }

  clone(): TableSelection {
    return new TableSelection(this.tableKey, this.anchor, this.focus);
  }

  isCollapsed(): boolean {
    return false;
  }

  extract(): Array<LexicalNode> {
    return this.getNodes();
  }

  insertRawText(text: string): void {
    // Do nothing?
  }

  insertText(): void {
    // Do nothing?
  }

  insertNodes(nodes: Array<LexicalNode>) {
    const focusNode = this.focus.getNode();
    invariant(
      $isElementNode(focusNode),
      'Expected TableSelection focus to be an ElementNode',
    );
    const selection = $normalizeSelection__EXPERIMENTAL(
      focusNode.select(0, focusNode.getChildrenSize()),
    );
    selection.insertNodes(nodes);
  }

  // TODO Deprecate this method. It's confusing when used with colspan|rowspan
  getShape(): TableSelectionShape {
    const anchorCellNode = $getNodeByKey(this.anchor.key);
    invariant(
      $isTableCellNode(anchorCellNode),
      'Expected TableSelection anchor to be (or a child of) TableCellNode',
    );
    const anchorCellNodeRect = $getTableCellNodeRect(anchorCellNode);
    invariant(
      anchorCellNodeRect !== null,
      'getCellRect: expected to find AnchorNode',
    );

    const focusCellNode = $getNodeByKey(this.focus.key);
    invariant(
      $isTableCellNode(focusCellNode),
      'Expected TableSelection focus to be (or a child of) TableCellNode',
    );
    const focusCellNodeRect = $getTableCellNodeRect(focusCellNode);
    invariant(
      focusCellNodeRect !== null,
      'getCellRect: expected to find focusCellNode',
    );

    const startX = Math.min(
      anchorCellNodeRect.columnIndex,
      focusCellNodeRect.columnIndex,
    );
    const stopX = Math.max(
      anchorCellNodeRect.columnIndex,
      focusCellNodeRect.columnIndex,
    );

    const startY = Math.min(
      anchorCellNodeRect.rowIndex,
      focusCellNodeRect.rowIndex,
    );
    const stopY = Math.max(
      anchorCellNodeRect.rowIndex,
      focusCellNodeRect.rowIndex,
    );

    return {
      fromX: Math.min(startX, stopX),
      fromY: Math.min(startY, stopY),
      toX: Math.max(startX, stopX),
      toY: Math.max(startY, stopY),
    };
  }

  getNodes(): Array<LexicalNode> {
    const cachedNodes = this._cachedNodes;
    if (cachedNodes !== null) {
      return cachedNodes;
    }

    const anchorNode = this.anchor.getNode();
    const focusNode = this.focus.getNode();
    const anchorCell = $findMatchingParent(anchorNode, $isTableCellNode);
    // todo replace with triplet
    const focusCell = $findMatchingParent(focusNode, $isTableCellNode);
    invariant(
      $isTableCellNode(anchorCell),
      'Expected TableSelection anchor to be (or a child of) TableCellNode',
    );
    invariant(
      $isTableCellNode(focusCell),
      'Expected TableSelection focus to be (or a child of) TableCellNode',
    );
    const anchorRow = anchorCell.getParent();
    invariant(
      $isTableRowNode(anchorRow),
      'Expected anchorCell to have a parent TableRowNode',
    );
    const tableNode = anchorRow.getParent();
    invariant(
      $isTableNode(tableNode),
      'Expected tableNode to have a parent TableNode',
    );

    const focusCellGrid = focusCell.getParents()[1];
    if (focusCellGrid !== tableNode) {
      if (!tableNode.isParentOf(focusCell)) {
        // focus is on higher Grid level than anchor
        const gridParent = tableNode.getParent();
        invariant(gridParent != null, 'Expected gridParent to have a parent');
        this.set(this.tableKey, gridParent.getKey(), focusCell.getKey());
      } else {
        // anchor is on higher Grid level than focus
        const focusCellParent = focusCellGrid.getParent();
        invariant(
          focusCellParent != null,
          'Expected focusCellParent to have a parent',
        );
        this.set(this.tableKey, focusCell.getKey(), focusCellParent.getKey());
      }
      return this.getNodes();
    }

    // TODO Mapping the whole Grid every time not efficient. We need to compute the entire state only
    // once (on load) and iterate on it as updates occur. However, to do this we need to have the
    // ability to store a state. Killing TableSelection and moving the logic to the plugin would make
    // this possible.
    const [map, cellAMap, cellBMap] = $computeTableMap(
      tableNode,
      anchorCell,
      focusCell,
    );

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

    const nodes: Array<LexicalNode> = [tableNode];
    let lastRow = null;
    for (let i = minRow; i <= maxRow; i++) {
      for (let j = minColumn; j <= maxColumn; j++) {
        const {cell} = map[i][j];
        const currentRow = cell.getParent();
        invariant(
          $isTableRowNode(currentRow),
          'Expected TableCellNode parent to be a TableRowNode',
        );
        if (currentRow !== lastRow) {
          nodes.push(currentRow);
        }
        nodes.push(cell, ...$getChildrenRecursively(cell));
        lastRow = currentRow;
      }
    }

    if (!isCurrentlyReadOnlyMode()) {
      this._cachedNodes = nodes;
    }
    return nodes;
  }

  getTextContent(): string {
    const nodes = this.getNodes();
    let textContent = '';
    for (let i = 0; i < nodes.length; i++) {
      textContent += nodes[i].getTextContent();
    }
    return textContent;
  }
}

export function $isTableSelection(x: unknown): x is TableSelection {
  return x instanceof TableSelection;
}

export function $createTableSelection(): TableSelection {
  const anchor = $createPoint('root', 0, 'element');
  const focus = $createPoint('root', 0, 'element');
  return new TableSelection('root', anchor, focus);
}

export function $getChildrenRecursively(node: LexicalNode): Array<LexicalNode> {
  const nodes = [];
  const stack = [node];
  while (stack.length > 0) {
    const currentNode = stack.pop();
    invariant(
      currentNode !== undefined,
      "Stack.length > 0; can't be undefined",
    );
    if ($isElementNode(currentNode)) {
      stack.unshift(...currentNode.getChildren());
    }
    if (currentNode !== node) {
      nodes.push(currentNode);
    }
  }
  return nodes;
}
