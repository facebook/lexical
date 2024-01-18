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
  DEPRECATED_$computeGridMap,
  DEPRECATED_$getGridCellNodeRect,
  DEPRECATED_$isGridCellNode,
  DEPRECATED_$isGridNode,
  DEPRECATED_$isGridRowNode,
  GridMapValueType,
  isCurrentlyReadOnlyMode,
  LexicalNode,
  NodeKey,
  PointType,
} from 'lexical';
import invariant from 'shared/invariant';

export type GridSelectionShape = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
};

export class GridSelection implements BaseSelection {
  gridKey: NodeKey;
  anchor: PointType;
  focus: PointType;
  _cachedNodes: Array<LexicalNode> | null;
  dirty: boolean;

  constructor(gridKey: NodeKey, anchor: PointType, focus: PointType) {
    this.anchor = anchor;
    this.focus = focus;
    anchor._selection = this;
    focus._selection = this;
    this._cachedNodes = null;
    this.dirty = false;
    this.gridKey = gridKey;
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
    if (!$isGridSelection(selection)) {
      return false;
    }
    return (
      this.gridKey === selection.gridKey &&
      this.anchor.is(selection.anchor) &&
      this.focus.is(selection.focus)
    );
  }

  set(gridKey: NodeKey, anchorCellKey: NodeKey, focusCellKey: NodeKey): void {
    this.dirty = true;
    this.gridKey = gridKey;
    this.anchor.key = anchorCellKey;
    this.focus.key = focusCellKey;
    this._cachedNodes = null;
  }

  clone(): GridSelection {
    return new GridSelection(this.gridKey, this.anchor, this.focus);
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
      'Expected GridSelection focus to be an ElementNode',
    );
    const selection = $normalizeSelection__EXPERIMENTAL(
      focusNode.select(0, focusNode.getChildrenSize()),
    );
    selection.insertNodes(nodes);
  }

  // TODO Deprecate this method. It's confusing when used with colspan|rowspan
  getShape(): GridSelectionShape {
    const anchorCellNode = $getNodeByKey(this.anchor.key);
    invariant(
      DEPRECATED_$isGridCellNode(anchorCellNode),
      'Expected GridSelection anchor to be (or a child of) GridCellNode',
    );
    const anchorCellNodeRect = DEPRECATED_$getGridCellNodeRect(anchorCellNode);
    invariant(
      anchorCellNodeRect !== null,
      'getCellRect: expected to find AnchorNode',
    );

    const focusCellNode = $getNodeByKey(this.focus.key);
    invariant(
      DEPRECATED_$isGridCellNode(focusCellNode),
      'Expected GridSelection focus to be (or a child of) GridCellNode',
    );
    const focusCellNodeRect = DEPRECATED_$getGridCellNodeRect(focusCellNode);
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
    const anchorCell = $findMatchingParent(
      anchorNode,
      DEPRECATED_$isGridCellNode,
    );
    // todo replace with triplet
    const focusCell = $findMatchingParent(
      focusNode,
      DEPRECATED_$isGridCellNode,
    );
    invariant(
      DEPRECATED_$isGridCellNode(anchorCell),
      'Expected GridSelection anchor to be (or a child of) GridCellNode',
    );
    invariant(
      DEPRECATED_$isGridCellNode(focusCell),
      'Expected GridSelection focus to be (or a child of) GridCellNode',
    );
    const anchorRow = anchorCell.getParent();
    invariant(
      DEPRECATED_$isGridRowNode(anchorRow),
      'Expected anchorCell to have a parent GridRowNode',
    );
    const gridNode = anchorRow.getParent();
    invariant(
      DEPRECATED_$isGridNode(gridNode),
      'Expected tableNode to have a parent GridNode',
    );

    const focusCellGrid = focusCell.getParents()[1];
    if (focusCellGrid !== gridNode) {
      if (!gridNode.isParentOf(focusCell)) {
        // focus is on higher Grid level than anchor
        const gridParent = gridNode.getParent();
        invariant(gridParent != null, 'Expected gridParent to have a parent');
        this.set(this.gridKey, gridParent.getKey(), focusCell.getKey());
      } else {
        // anchor is on higher Grid level than focus
        const focusCellParent = focusCellGrid.getParent();
        invariant(
          focusCellParent != null,
          'Expected focusCellParent to have a parent',
        );
        this.set(this.gridKey, focusCell.getKey(), focusCellParent.getKey());
      }
      return this.getNodes();
    }

    // TODO Mapping the whole Grid every time not efficient. We need to compute the entire state only
    // once (on load) and iterate on it as updates occur. However, to do this we need to have the
    // ability to store a state. Killing GridSelection and moving the logic to the plugin would make
    // this possible.
    const [map, cellAMap, cellBMap] = DEPRECATED_$computeGridMap(
      gridNode,
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
    function expandBoundary(mapValue: GridMapValueType): void {
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

    const nodes: Array<LexicalNode> = [gridNode];
    let lastRow = null;
    for (let i = minRow; i <= maxRow; i++) {
      for (let j = minColumn; j <= maxColumn; j++) {
        const {cell} = map[i][j];
        const currentRow = cell.getParent();
        invariant(
          DEPRECATED_$isGridRowNode(currentRow),
          'Expected GridCellNode parent to be a GridRowNode',
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

export function $isGridSelection(x: unknown): x is GridSelection {
  return x instanceof GridSelection;
}

export function $createGridSelection(): GridSelection {
  const anchor = $createPoint('root', 0, 'element');
  const focus = $createPoint('root', 0, 'element');
  return new GridSelection('root', anchor, focus);
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
