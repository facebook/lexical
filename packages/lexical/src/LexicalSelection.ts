/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from './LexicalEditor';
import type {EditorState} from './LexicalEditorState';
import type {NodeKey} from './LexicalNode';
import type {ElementNode} from './nodes/LexicalElementNode';
import type {TextFormatType} from './nodes/LexicalTextNode';

import invariant from 'shared/invariant';

import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $isDecoratorNode,
  $isElementNode,
  $isLeafNode,
  $isLineBreakNode,
  $isRootNode,
  $isTextNode,
  $setSelection,
  DecoratorNode,
  DEPRECATED_$isGridCellNode,
  DEPRECATED_$isGridNode,
  DEPRECATED_$isGridRowNode,
  DEPRECATED_GridCellNode,
  DEPRECATED_GridNode,
  DEPRECATED_GridRowNode,
  SELECTION_CHANGE_COMMAND,
  TextNode,
} from '.';
import {DOM_ELEMENT_TYPE, TEXT_TYPE_TO_FORMAT} from './LexicalConstants';
import {
  markCollapsedSelectionFormat,
  markSelectionChangeFromDOMUpdate,
} from './LexicalEvents';
import {getIsProcesssingMutations} from './LexicalMutations';
import {LexicalNode} from './LexicalNode';
import {$normalizeSelection} from './LexicalNormalization';
import {
  getActiveEditor,
  getActiveEditorState,
  isCurrentlyReadOnlyMode,
} from './LexicalUpdates';
import {
  $findMatchingParent,
  $getAdjacentNode,
  $getChildrenRecursively,
  $getCompositionKey,
  $getNearestRootOrShadowRoot,
  $getNodeByKey,
  $getRoot,
  $hasAncestor,
  $isRootOrShadowRoot,
  $isTokenOrSegmented,
  $setCompositionKey,
  $splitNode,
  doesContainGrapheme,
  getDOMSelection,
  getDOMTextNode,
  getElementByKeyOrThrow,
  getNodeFromDOM,
  getTextNodeOffset,
  isSelectionCapturedInDecoratorInput,
  isSelectionWithinEditor,
  removeDOMBlockCursorElement,
  scrollIntoViewIfNeeded,
  toggleTextFormatType,
} from './LexicalUtils';
import {$createTabNode} from './nodes/LexicalTabNode';

export type TextPointType = {
  _selection: RangeSelection | GridSelection;
  getNode: () => TextNode;
  is: (point: PointType) => boolean;
  isBefore: (point: PointType) => boolean;
  key: NodeKey;
  offset: number;
  set: (key: NodeKey, offset: number, type: 'text' | 'element') => void;
  type: 'text';
};

export type ElementPointType = {
  _selection: RangeSelection | GridSelection;
  getNode: () => ElementNode;
  is: (point: PointType) => boolean;
  isBefore: (point: PointType) => boolean;
  key: NodeKey;
  offset: number;
  set: (key: NodeKey, offset: number, type: 'text' | 'element') => void;
  type: 'element';
};

export type PointType = TextPointType | ElementPointType;

export type GridMapValueType = {
  cell: DEPRECATED_GridCellNode;
  startRow: number;
  startColumn: number;
};
export type GridMapType = Array<Array<GridMapValueType>>;

export class Point {
  key: NodeKey;
  offset: number;
  type: 'text' | 'element';
  _selection: RangeSelection | GridSelection | null;

  constructor(key: NodeKey, offset: number, type: 'text' | 'element') {
    this._selection = null;
    this.key = key;
    this.offset = offset;
    this.type = type;
  }

  is(point: PointType): boolean {
    return (
      this.key === point.key &&
      this.offset === point.offset &&
      this.type === point.type
    );
  }

  isBefore(b: PointType): boolean {
    let aNode = this.getNode();
    let bNode = b.getNode();
    const aOffset = this.offset;
    const bOffset = b.offset;

    if ($isElementNode(aNode)) {
      const aNodeDescendant = aNode.getDescendantByIndex<ElementNode>(aOffset);
      aNode = aNodeDescendant != null ? aNodeDescendant : aNode;
    }
    if ($isElementNode(bNode)) {
      const bNodeDescendant = bNode.getDescendantByIndex<ElementNode>(bOffset);
      bNode = bNodeDescendant != null ? bNodeDescendant : bNode;
    }
    if (aNode === bNode) {
      return aOffset < bOffset;
    }
    return aNode.isBefore(bNode);
  }

  getNode(): LexicalNode {
    const key = this.key;
    const node = $getNodeByKey(key);
    if (node === null) {
      invariant(false, 'Point.getNode: node not found');
    }
    return node;
  }

  set(key: NodeKey, offset: number, type: 'text' | 'element'): void {
    const selection = this._selection;
    const oldKey = this.key;
    this.key = key;
    this.offset = offset;
    this.type = type;
    if (!isCurrentlyReadOnlyMode()) {
      if ($getCompositionKey() === oldKey) {
        $setCompositionKey(key);
      }
      if (selection !== null) {
        selection._cachedNodes = null;
        selection.dirty = true;
      }
    }
  }
}

function $createPoint(
  key: NodeKey,
  offset: number,
  type: 'text' | 'element',
): PointType {
  // @ts-expect-error: intentionally cast as we use a class for perf reasons
  return new Point(key, offset, type);
}

function selectPointOnNode(point: PointType, node: LexicalNode): void {
  let key = node.__key;
  let offset = point.offset;
  let type: 'element' | 'text' = 'element';
  if ($isTextNode(node)) {
    type = 'text';
    const textContentLength = node.getTextContentSize();
    if (offset > textContentLength) {
      offset = textContentLength;
    }
  } else if (!$isElementNode(node)) {
    const nextSibling = node.getNextSibling();
    if ($isTextNode(nextSibling)) {
      key = nextSibling.__key;
      offset = 0;
      type = 'text';
    } else {
      const parentNode = node.getParent();
      if (parentNode) {
        key = parentNode.__key;
        offset = node.getIndexWithinParent() + 1;
      }
    }
  }
  point.set(key, offset, type);
}

export function $moveSelectionPointToEnd(
  point: PointType,
  node: LexicalNode,
): void {
  if ($isElementNode(node)) {
    const lastNode = node.getLastDescendant();
    if ($isElementNode(lastNode) || $isTextNode(lastNode)) {
      selectPointOnNode(point, lastNode);
    } else {
      selectPointOnNode(point, node);
    }
  } else {
    selectPointOnNode(point, node);
  }
}

function $transferStartingElementPointToTextPoint(
  start: ElementPointType,
  end: PointType,
  format: number,
  style: string,
): void {
  const element = start.getNode();
  const placementNode = element.getChildAtIndex(start.offset);
  const textNode = $createTextNode();
  const target = $isRootNode(element)
    ? $createParagraphNode().append(textNode)
    : textNode;
  textNode.setFormat(format);
  textNode.setStyle(style);
  if (placementNode === null) {
    element.append(target);
  } else {
    placementNode.insertBefore(target);
    // Fix the end point offset if it refers to the same element as start,
    // as we've now inserted another element before it. Note that we only
    // do it if selection is not collapsed as otherwise it'll transfer
    // both focus and anchor to the text node below
    if (
      end.type === 'element' &&
      end.key === start.key &&
      end.offset !== start.offset
    ) {
      end.set(end.key, end.offset + 1, 'element');
    }
  }
  // Transfer the element point to a text point.
  if (start.is(end)) {
    end.set(textNode.__key, 0, 'text');
  }
  start.set(textNode.__key, 0, 'text');
}

function $setPointValues(
  point: PointType,
  key: NodeKey,
  offset: number,
  type: 'text' | 'element',
): void {
  point.key = key;
  point.offset = offset;
  point.type = type;
}

export interface BaseSelection {
  clone(): BaseSelection;
  dirty: boolean;
  extract(): Array<LexicalNode>;
  getNodes(): Array<LexicalNode>;
  getTextContent(): string;
  insertRawText(text: string): void;
  is(selection: null | RangeSelection | NodeSelection | GridSelection): boolean;
}

export class NodeSelection implements BaseSelection {
  _nodes: Set<NodeKey>;
  dirty: boolean;
  _cachedNodes: null | Array<LexicalNode>;

  constructor(objects: Set<NodeKey>) {
    this.dirty = false;
    this._nodes = objects;
    this._cachedNodes = null;
  }

  is(
    selection: null | RangeSelection | NodeSelection | GridSelection,
  ): boolean {
    if (!$isNodeSelection(selection)) {
      return false;
    }
    const a: Set<NodeKey> = this._nodes;
    const b: Set<NodeKey> = selection._nodes;
    return a.size === b.size && Array.from(a).every((key) => b.has(key));
  }

  add(key: NodeKey): void {
    this.dirty = true;
    this._nodes.add(key);
    this._cachedNodes = null;
  }

  delete(key: NodeKey): void {
    this.dirty = true;
    this._nodes.delete(key);
    this._cachedNodes = null;
  }

  clear(): void {
    this.dirty = true;
    this._nodes.clear();
    this._cachedNodes = null;
  }

  has(key: NodeKey): boolean {
    return this._nodes.has(key);
  }

  clone(): NodeSelection {
    return new NodeSelection(new Set(this._nodes));
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

  insertNodes(nodes: Array<LexicalNode>, selectStart?: boolean): boolean {
    const selectedNodes = this.getNodes();
    const selectedNodesLength = selectedNodes.length;
    const lastSelectedNode = selectedNodes[selectedNodesLength - 1];
    let selectionAtEnd: RangeSelection;
    // Insert nodes
    if ($isTextNode(lastSelectedNode)) {
      selectionAtEnd = lastSelectedNode.select();
    } else {
      const index = lastSelectedNode.getIndexWithinParent() + 1;
      selectionAtEnd = lastSelectedNode.getParentOrThrow().select(index, index);
    }
    selectionAtEnd.insertNodes(nodes, selectStart);
    // Remove selected nodes
    for (let i = 0; i < selectedNodesLength; i++) {
      selectedNodes[i].remove();
    }

    return true;
  }

  getNodes(): Array<LexicalNode> {
    const cachedNodes = this._cachedNodes;
    if (cachedNodes !== null) {
      return cachedNodes;
    }
    const objects = this._nodes;
    const nodes = [];
    for (const object of objects) {
      const node = $getNodeByKey(object);
      if (node !== null) {
        nodes.push(node);
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

export function $isRangeSelection(x: unknown): x is RangeSelection {
  return x instanceof RangeSelection;
}

export type GridSelectionShape = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
};

export function DEPRECATED_$getGridCellNodeRect(
  GridCellNode: DEPRECATED_GridCellNode,
): {
  rowIndex: number;
  columnIndex: number;
  rowSpan: number;
  colSpan: number;
} | null {
  const [CellNode, , GridNode] = DEPRECATED_$getNodeTriplet(GridCellNode);
  const rows = GridNode.getChildren();
  const rowCount = rows.length;
  const columnCount = rows[0].getChildren().length;

  // Create a matrix of the same size as the table to track the position of each cell
  const cellMatrix = new Array(rowCount);
  for (let i = 0; i < rowCount; i++) {
    cellMatrix[i] = new Array(columnCount);
  }

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    const row = rows[rowIndex];
    const cells = row.getChildren();
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
      if (CellNode === cell) {
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

export class GridSelection implements BaseSelection {
  gridKey: NodeKey;
  anchor: PointType;
  focus: PointType;
  dirty: boolean;
  _cachedNodes: Array<LexicalNode> | null;

  constructor(gridKey: NodeKey, anchor: PointType, focus: PointType) {
    this.gridKey = gridKey;
    this.anchor = anchor;
    this.focus = focus;
    this.dirty = false;
    this._cachedNodes = null;
    anchor._selection = this;
    focus._selection = this;
  }

  is(
    selection: null | RangeSelection | NodeSelection | GridSelection,
  ): boolean {
    if (!DEPRECATED_$isGridSelection(selection)) {
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

  isBackward(): boolean {
    return this.focus.isBefore(this.anchor);
  }

  getCharacterOffsets(): [number, number] {
    return getCharacterOffsets(this);
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

  insertNodes(nodes: Array<LexicalNode>, selectStart?: boolean): boolean {
    const focusNode = this.focus.getNode();
    const selection = $normalizeSelection(
      focusNode.select(0, focusNode.getChildrenSize()),
    );
    return selection.insertNodes(nodes, selectStart);
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

export function DEPRECATED_$isGridSelection(x: unknown): x is GridSelection {
  return x instanceof GridSelection;
}

export class RangeSelection implements BaseSelection {
  anchor: PointType;
  focus: PointType;
  dirty: boolean;
  format: number;
  style: string;
  _cachedNodes: null | Array<LexicalNode>;

  constructor(
    anchor: PointType,
    focus: PointType,
    format: number,
    style: string,
  ) {
    this.anchor = anchor;
    this.focus = focus;
    this.dirty = false;
    this.format = format;
    this.style = style;
    this._cachedNodes = null;
    anchor._selection = this;
    focus._selection = this;
  }

  /**
   * Used to check if the provided selections is equal to this one by value,
   * inluding anchor, focus, format, and style properties.
   * @param selection - the Selection to compare this one to.
   * @returns true if the Selections are equal, false otherwise.
   */
  is(
    selection: null | RangeSelection | NodeSelection | GridSelection,
  ): boolean {
    if (!$isRangeSelection(selection)) {
      return false;
    }
    return (
      this.anchor.is(selection.anchor) &&
      this.focus.is(selection.focus) &&
      this.format === selection.format &&
      this.style === selection.style
    );
  }

  /**
   * Returns whether the Selection is "backwards", meaning the focus
   * logically precedes the anchor in the EditorState.
   * @returns true if the Selection is backwards, false otherwise.
   */
  isBackward(): boolean {
    return this.focus.isBefore(this.anchor);
  }

  /**
   * Returns whether the Selection is "collapsed", meaning the anchor and focus are
   * the same node and have the same offset.
   *
   * @returns true if the Selection is collapsed, false otherwise.
   */
  isCollapsed(): boolean {
    return this.anchor.is(this.focus);
  }

  /**
   * Gets all the nodes in the Selection. Uses caching to make it generally suitable
   * for use in hot paths.
   *
   * @returns an Array containing all the nodes in the Selection
   */
  getNodes(): Array<LexicalNode> {
    const cachedNodes = this._cachedNodes;
    if (cachedNodes !== null) {
      return cachedNodes;
    }
    const anchor = this.anchor;
    const focus = this.focus;
    const isBefore = anchor.isBefore(focus);
    const firstPoint = isBefore ? anchor : focus;
    const lastPoint = isBefore ? focus : anchor;
    let firstNode = firstPoint.getNode();
    let lastNode = lastPoint.getNode();
    const startOffset = firstPoint.offset;
    const endOffset = lastPoint.offset;

    if ($isElementNode(firstNode)) {
      const firstNodeDescendant =
        firstNode.getDescendantByIndex<ElementNode>(startOffset);
      firstNode = firstNodeDescendant != null ? firstNodeDescendant : firstNode;
    }
    if ($isElementNode(lastNode)) {
      let lastNodeDescendant =
        lastNode.getDescendantByIndex<ElementNode>(endOffset);
      // We don't want to over-select, as node selection infers the child before
      // the last descendant, not including that descendant.
      if (
        lastNodeDescendant !== null &&
        lastNodeDescendant !== firstNode &&
        lastNode.getChildAtIndex(endOffset) === lastNodeDescendant
      ) {
        lastNodeDescendant = lastNodeDescendant.getPreviousSibling();
      }
      lastNode = lastNodeDescendant != null ? lastNodeDescendant : lastNode;
    }

    let nodes: Array<LexicalNode>;

    if (firstNode.is(lastNode)) {
      if ($isElementNode(firstNode) && firstNode.getChildrenSize() > 0) {
        nodes = [];
      } else {
        nodes = [firstNode];
      }
    } else {
      nodes = firstNode.getNodesBetween(lastNode);
    }
    if (!isCurrentlyReadOnlyMode()) {
      this._cachedNodes = nodes;
    }
    return nodes;
  }

  /**
   * Sets this Selection to be of type "text" at the provided anchor and focus values.
   *
   * @param anchorNode - the anchor node to set on the Selection
   * @param anchorOffset - the offset to set on the Selection
   * @param focusNode - the focus node to set on the Selection
   * @param focusOffset - the focus offset to set on the Selection
   */
  setTextNodeRange(
    anchorNode: TextNode,
    anchorOffset: number,
    focusNode: TextNode,
    focusOffset: number,
  ): void {
    $setPointValues(this.anchor, anchorNode.__key, anchorOffset, 'text');
    $setPointValues(this.focus, focusNode.__key, focusOffset, 'text');
    this._cachedNodes = null;
    this.dirty = true;
  }

  /**
   * Gets the (plain) text content of all the nodes in the selection.
   *
   * @returns a string representing the text content of all the nodes in the Selection
   */
  getTextContent(): string {
    const nodes = this.getNodes();
    if (nodes.length === 0) {
      return '';
    }
    const firstNode = nodes[0];
    const lastNode = nodes[nodes.length - 1];
    const anchor = this.anchor;
    const focus = this.focus;
    const isBefore = anchor.isBefore(focus);
    const [anchorOffset, focusOffset] = getCharacterOffsets(this);
    let textContent = '';
    let prevWasElement = true;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if ($isElementNode(node) && !node.isInline()) {
        if (!prevWasElement) {
          textContent += '\n';
        }
        if (node.isEmpty()) {
          prevWasElement = false;
        } else {
          prevWasElement = true;
        }
      } else {
        prevWasElement = false;
        if ($isTextNode(node)) {
          let text = node.getTextContent();
          if (node === firstNode) {
            if (node === lastNode) {
              if (
                anchor.type !== 'element' ||
                focus.type !== 'element' ||
                focus.offset === anchor.offset
              ) {
                text =
                  anchorOffset < focusOffset
                    ? text.slice(anchorOffset, focusOffset)
                    : text.slice(focusOffset, anchorOffset);
              }
            } else {
              text = isBefore
                ? text.slice(anchorOffset)
                : text.slice(focusOffset);
            }
          } else if (node === lastNode) {
            text = isBefore
              ? text.slice(0, focusOffset)
              : text.slice(0, anchorOffset);
          }
          textContent += text;
        } else if (
          ($isDecoratorNode(node) || $isLineBreakNode(node)) &&
          (node !== lastNode || !this.isCollapsed())
        ) {
          textContent += node.getTextContent();
        }
      }
    }
    return textContent;
  }

  /**
   * Attempts to map a DOM selection range onto this Lexical Selection,
   * setting the anchor, focus, and type accordingly
   *
   * @param range a DOM Selection range conforming to the StaticRange interface.
   */
  applyDOMRange(range: StaticRange): void {
    const editor = getActiveEditor();
    const currentEditorState = editor.getEditorState();
    const lastSelection = currentEditorState._selection;
    const resolvedSelectionPoints = internalResolveSelectionPoints(
      range.startContainer,
      range.startOffset,
      range.endContainer,
      range.endOffset,
      editor,
      lastSelection,
    );
    if (resolvedSelectionPoints === null) {
      return;
    }
    const [anchorPoint, focusPoint] = resolvedSelectionPoints;
    $setPointValues(
      this.anchor,
      anchorPoint.key,
      anchorPoint.offset,
      anchorPoint.type,
    );
    $setPointValues(
      this.focus,
      focusPoint.key,
      focusPoint.offset,
      focusPoint.type,
    );
    this._cachedNodes = null;
  }

  /**
   * Creates a new RangeSelection, copying over all the property values from this one.
   *
   * @returns a new RangeSelection with the same property values as this one.
   */
  clone(): RangeSelection {
    const anchor = this.anchor;
    const focus = this.focus;
    const selection = new RangeSelection(
      $createPoint(anchor.key, anchor.offset, anchor.type),
      $createPoint(focus.key, focus.offset, focus.type),
      this.format,
      this.style,
    );
    return selection;
  }

  /**
   * Toggles the provided format on all the TextNodes in the Selection.
   *
   * @param format a string TextFormatType to toggle on the TextNodes in the selection
   */
  toggleFormat(format: TextFormatType): void {
    this.format = toggleTextFormatType(this.format, format, null);
    this.dirty = true;
  }

  /**
   * Sets the value of the style property on the Selection
   *
   * @param style - the style to set at the value of the style property.
   */
  setStyle(style: string): void {
    this.style = style;
    this.dirty = true;
  }

  /**
   * Returns whether the provided TextFormatType is present on the Selection. This will be true if any node in the Selection
   * has the specified format.
   *
   * @param type the TextFormatType to check for.
   * @returns true if the provided format is currently toggled on on the Selection, false otherwise.
   */
  hasFormat(type: TextFormatType): boolean {
    const formatFlag = TEXT_TYPE_TO_FORMAT[type];
    return (this.format & formatFlag) !== 0;
  }

  /**
   * Attempts to insert the provided text into the EditorState at the current Selection.
   * converts tabs, newlines, and carriage returns into LexicalNodes.
   *
   * @param text the text to insert into the Selection
   */
  insertRawText(text: string): void {
    const parts = text.split(/(\r?\n|\t)/);
    const nodes = [];
    const length = parts.length;
    for (let i = 0; i < length; i++) {
      const part = parts[i];
      if (part === '\n' || part === '\r\n') {
        nodes.push($createLineBreakNode());
      } else if (part === '\t') {
        nodes.push($createTabNode());
      } else {
        nodes.push($createTextNode(part));
      }
    }
    this.insertNodes(nodes);
  }

  /**
   * Attempts to insert the provided text into the EditorState at the current Selection as a new
   * Lexical TextNode, according to a series of insertion heuristics based on the selection type and position.
   *
   * @param text the text to insert into the Selection
   */
  insertText(text: string): void {
    const anchor = this.anchor;
    const focus = this.focus;
    const isBefore = this.isCollapsed() || anchor.isBefore(focus);
    const format = this.format;
    const style = this.style;
    if (isBefore && anchor.type === 'element') {
      $transferStartingElementPointToTextPoint(anchor, focus, format, style);
    } else if (!isBefore && focus.type === 'element') {
      $transferStartingElementPointToTextPoint(focus, anchor, format, style);
    }
    const selectedNodes = this.getNodes();
    const selectedNodesLength = selectedNodes.length;
    const firstPoint = isBefore ? anchor : focus;
    const endPoint = isBefore ? focus : anchor;
    const startOffset = firstPoint.offset;
    const endOffset = endPoint.offset;
    let firstNode: TextNode = selectedNodes[0] as TextNode;

    if (!$isTextNode(firstNode)) {
      invariant(false, 'insertText: first node is not a text node');
    }
    const firstNodeText = firstNode.getTextContent();
    const firstNodeTextLength = firstNodeText.length;
    const firstNodeParent = firstNode.getParentOrThrow();
    const lastIndex = selectedNodesLength - 1;
    let lastNode = selectedNodes[lastIndex];

    if (
      this.isCollapsed() &&
      startOffset === firstNodeTextLength &&
      (firstNode.isSegmented() ||
        firstNode.isToken() ||
        !firstNode.canInsertTextAfter() ||
        (!firstNodeParent.canInsertTextAfter() &&
          firstNode.getNextSibling() === null))
    ) {
      let nextSibling = firstNode.getNextSibling<TextNode>();
      if (
        !$isTextNode(nextSibling) ||
        !nextSibling.canInsertTextBefore() ||
        $isTokenOrSegmented(nextSibling)
      ) {
        nextSibling = $createTextNode();
        nextSibling.setFormat(format);
        if (!firstNodeParent.canInsertTextAfter()) {
          firstNodeParent.insertAfter(nextSibling);
        } else {
          firstNode.insertAfter(nextSibling);
        }
      }
      nextSibling.select(0, 0);
      firstNode = nextSibling;
      if (text !== '') {
        this.insertText(text);
        return;
      }
    } else if (
      this.isCollapsed() &&
      startOffset === 0 &&
      (firstNode.isSegmented() ||
        firstNode.isToken() ||
        !firstNode.canInsertTextBefore() ||
        (!firstNodeParent.canInsertTextBefore() &&
          firstNode.getPreviousSibling() === null))
    ) {
      let prevSibling = firstNode.getPreviousSibling<TextNode>();
      if (!$isTextNode(prevSibling) || $isTokenOrSegmented(prevSibling)) {
        prevSibling = $createTextNode();
        prevSibling.setFormat(format);
        if (!firstNodeParent.canInsertTextBefore()) {
          firstNodeParent.insertBefore(prevSibling);
        } else {
          firstNode.insertBefore(prevSibling);
        }
      }
      prevSibling.select();
      firstNode = prevSibling;
      if (text !== '') {
        this.insertText(text);
        return;
      }
    } else if (firstNode.isSegmented() && startOffset !== firstNodeTextLength) {
      const textNode = $createTextNode(firstNode.getTextContent());
      textNode.setFormat(format);
      firstNode.replace(textNode);
      firstNode = textNode;
    } else if (!this.isCollapsed() && text !== '') {
      // When the firstNode or lastNode parents are elements that
      // do not allow text to be inserted before or after, we first
      // clear the content. Then we normalize selection, then insert
      // the new content.
      const lastNodeParent = lastNode.getParent();

      if (
        !firstNodeParent.canInsertTextBefore() ||
        !firstNodeParent.canInsertTextAfter() ||
        ($isElementNode(lastNodeParent) &&
          (!lastNodeParent.canInsertTextBefore() ||
            !lastNodeParent.canInsertTextAfter()))
      ) {
        this.insertText('');
        normalizeSelectionPointsForBoundaries(this.anchor, this.focus, null);
        this.insertText(text);
        return;
      }
    }

    if (selectedNodesLength === 1) {
      if (firstNode.isToken()) {
        const textNode = $createTextNode(text);
        textNode.select();
        firstNode.replace(textNode);
        return;
      }
      const firstNodeFormat = firstNode.getFormat();
      const firstNodeStyle = firstNode.getStyle();

      if (
        startOffset === endOffset &&
        (firstNodeFormat !== format || firstNodeStyle !== style)
      ) {
        if (firstNode.getTextContent() === '') {
          firstNode.setFormat(format);
          firstNode.setStyle(style);
        } else {
          const textNode = $createTextNode(text);
          textNode.setFormat(format);
          textNode.setStyle(style);
          textNode.select();
          if (startOffset === 0) {
            firstNode.insertBefore(textNode, false);
          } else {
            const [targetNode] = firstNode.splitText(startOffset);
            targetNode.insertAfter(textNode, false);
          }
          // When composing, we need to adjust the anchor offset so that
          // we correctly replace that right range.
          if (textNode.isComposing() && this.anchor.type === 'text') {
            this.anchor.offset -= text.length;
          }
          return;
        }
      }
      const delCount = endOffset - startOffset;

      firstNode = firstNode.spliceText(startOffset, delCount, text, true);
      if (firstNode.getTextContent() === '') {
        firstNode.remove();
      } else if (this.anchor.type === 'text') {
        if (firstNode.isComposing()) {
          // When composing, we need to adjust the anchor offset so that
          // we correctly replace that right range.
          this.anchor.offset -= text.length;
        } else {
          this.format = firstNodeFormat;
          this.style = firstNodeStyle;
        }
      }
    } else {
      const markedNodeKeysForKeep = new Set([
        ...firstNode.getParentKeys(),
        ...lastNode.getParentKeys(),
      ]);

      // We have to get the parent elements before the next section,
      // as in that section we might mutate the lastNode.
      const firstElement = $isElementNode(firstNode)
        ? firstNode
        : firstNode.getParentOrThrow();
      let lastElement = $isElementNode(lastNode)
        ? lastNode
        : lastNode.getParentOrThrow();
      let lastElementChild = lastNode;

      // If the last element is inline, we should instead look at getting
      // the nodes of its parent, rather than itself. This behavior will
      // then better match how text node insertions work. We will need to
      // also update the last element's child accordingly as we do this.
      if (!firstElement.is(lastElement) && lastElement.isInline()) {
        // Keep traversing till we have a non-inline element parent.
        do {
          lastElementChild = lastElement;
          lastElement = lastElement.getParentOrThrow();
        } while (lastElement.isInline());
      }

      // Handle mutations to the last node.
      if (
        (endPoint.type === 'text' &&
          (endOffset !== 0 || lastNode.getTextContent() === '')) ||
        (endPoint.type === 'element' &&
          lastNode.getIndexWithinParent() < endOffset)
      ) {
        if (
          $isTextNode(lastNode) &&
          !lastNode.isToken() &&
          endOffset !== lastNode.getTextContentSize()
        ) {
          if (lastNode.isSegmented()) {
            const textNode = $createTextNode(lastNode.getTextContent());
            lastNode.replace(textNode);
            lastNode = textNode;
          }
          // root node selections only select whole nodes, so no text splice is necessary
          if (!$isRootNode(endPoint.getNode())) {
            lastNode = (lastNode as TextNode).spliceText(0, endOffset, '');
          }
          markedNodeKeysForKeep.add(lastNode.__key);
        } else {
          const lastNodeParent = lastNode.getParentOrThrow();
          if (
            !lastNodeParent.canBeEmpty() &&
            lastNodeParent.getChildrenSize() === 1
          ) {
            lastNodeParent.remove();
          } else {
            lastNode.remove();
          }
        }
      } else {
        markedNodeKeysForKeep.add(lastNode.__key);
      }

      // Either move the remaining nodes of the last parent to after
      // the first child, or remove them entirely. If the last parent
      // is the same as the first parent, this logic also works.
      const lastNodeChildren = lastElement.getChildren();
      const selectedNodesSet = new Set(selectedNodes);
      const firstAndLastElementsAreEqual = firstElement.is(lastElement);

      // We choose a target to insert all nodes after. In the case of having
      // and inline starting parent element with a starting node that has no
      // siblings, we should insert after the starting parent element, otherwise
      // we will incorrectly merge into the starting parent element.
      // TODO: should we keep on traversing parents if we're inside another
      // nested inline element?
      const insertionTarget =
        firstElement.isInline() && firstNode.getNextSibling() === null
          ? firstElement
          : firstNode;

      for (let i = lastNodeChildren.length - 1; i >= 0; i--) {
        const lastNodeChild = lastNodeChildren[i];

        if (
          lastNodeChild.is(firstNode) ||
          ($isElementNode(lastNodeChild) && lastNodeChild.isParentOf(firstNode))
        ) {
          break;
        }

        if (lastNodeChild.isAttached()) {
          if (
            !selectedNodesSet.has(lastNodeChild) ||
            lastNodeChild.is(lastElementChild)
          ) {
            if (!firstAndLastElementsAreEqual) {
              insertionTarget.insertAfter(lastNodeChild, false);
            }
          } else {
            lastNodeChild.remove();
          }
        }
      }

      if (!firstAndLastElementsAreEqual) {
        // Check if we have already moved out all the nodes of the
        // last parent, and if so, traverse the parent tree and mark
        // them all as being able to deleted too.
        let parent: ElementNode | null = lastElement;
        let lastRemovedParent = null;

        while (parent !== null) {
          const children = parent.getChildren();
          const childrenLength = children.length;
          if (
            childrenLength === 0 ||
            children[childrenLength - 1].is(lastRemovedParent)
          ) {
            markedNodeKeysForKeep.delete(parent.__key);
            lastRemovedParent = parent;
          }
          parent = parent.getParent();
        }
      }

      // Ensure we do splicing after moving of nodes, as splicing
      // can have side-effects (in the case of hashtags).
      if (!firstNode.isToken()) {
        firstNode = firstNode.spliceText(
          startOffset,
          firstNodeTextLength - startOffset,
          text,
          true,
        );
        if (firstNode.getTextContent() === '') {
          firstNode.remove();
        } else if (firstNode.isComposing() && this.anchor.type === 'text') {
          // When composing, we need to adjust the anchor offset so that
          // we correctly replace that right range.
          this.anchor.offset -= text.length;
        }
      } else if (startOffset === firstNodeTextLength) {
        firstNode.select();
      } else {
        const textNode = $createTextNode(text);
        textNode.select();
        firstNode.replace(textNode);
      }

      // Remove all selected nodes that haven't already been removed.
      for (let i = 1; i < selectedNodesLength; i++) {
        const selectedNode = selectedNodes[i];
        const key = selectedNode.__key;
        if (!markedNodeKeysForKeep.has(key)) {
          selectedNode.remove();
        }
      }
    }
  }

  /**
   * Removes the text in the Selection, adjusting the EditorState accordingly.
   */
  removeText(): void {
    this.insertText('');
  }

  /**
   * Applies the provided format to the TextNodes in the Selection, splitting or
   * merging nodes as necessary.
   *
   * @param formatType the format type to apply to the nodes in the Selection.
   */
  formatText(formatType: TextFormatType): void {
    if (this.isCollapsed()) {
      this.toggleFormat(formatType);
      // When changing format, we should stop composition
      $setCompositionKey(null);
      return;
    }

    const selectedNodes = this.getNodes();
    const selectedTextNodes: Array<TextNode> = [];
    for (const selectedNode of selectedNodes) {
      if ($isTextNode(selectedNode)) {
        selectedTextNodes.push(selectedNode);
      }
    }

    const selectedTextNodesLength = selectedTextNodes.length;
    if (selectedTextNodesLength === 0) {
      this.toggleFormat(formatType);
      // When changing format, we should stop composition
      $setCompositionKey(null);
      return;
    }

    const anchor = this.anchor;
    const focus = this.focus;
    const isBackward = this.isBackward();
    const startPoint = isBackward ? focus : anchor;
    const endPoint = isBackward ? anchor : focus;

    let firstIndex = 0;
    let firstNode = selectedTextNodes[0];
    let startOffset = startPoint.type === 'element' ? 0 : startPoint.offset;

    // In case selection started at the end of text node use next text node
    if (
      startPoint.type === 'text' &&
      startOffset === firstNode.getTextContentSize()
    ) {
      firstIndex = 1;
      firstNode = selectedTextNodes[1];
      startOffset = 0;
    }

    if (firstNode == null) {
      return;
    }

    const firstNextFormat = firstNode.getFormatFlags(formatType, null);

    const lastIndex = selectedTextNodesLength - 1;
    let lastNode = selectedTextNodes[lastIndex];
    const endOffset =
      endPoint.type === 'text'
        ? endPoint.offset
        : lastNode.getTextContentSize();

    // Single node selected
    if (firstNode.is(lastNode)) {
      // No actual text is selected, so do nothing.
      if (startOffset === endOffset) {
        return;
      }
      // The entire node is selected, so just format it
      if (startOffset === 0 && endOffset === firstNode.getTextContentSize()) {
        firstNode.setFormat(firstNextFormat);
      } else {
        // Node is partially selected, so split it into two nodes
        // add style the selected one.
        const splitNodes = firstNode.splitText(startOffset, endOffset);
        const replacement = startOffset === 0 ? splitNodes[0] : splitNodes[1];
        replacement.setFormat(firstNextFormat);

        // Update selection only if starts/ends on text node
        if (startPoint.type === 'text') {
          startPoint.set(replacement.__key, 0, 'text');
        }
        if (endPoint.type === 'text') {
          endPoint.set(replacement.__key, endOffset - startOffset, 'text');
        }
      }

      this.format = firstNextFormat;

      return;
    }
    // Multiple nodes selected
    // The entire first node isn't selected, so split it
    if (startOffset !== 0) {
      [, firstNode as TextNode] = firstNode.splitText(startOffset);
      startOffset = 0;
    }
    firstNode.setFormat(firstNextFormat);

    const lastNextFormat = lastNode.getFormatFlags(formatType, firstNextFormat);
    // If the offset is 0, it means no actual characters are selected,
    // so we skip formatting the last node altogether.
    if (endOffset > 0) {
      if (endOffset !== lastNode.getTextContentSize()) {
        [lastNode as TextNode] = lastNode.splitText(endOffset);
      }
      lastNode.setFormat(lastNextFormat);
    }

    // Process all text nodes in between
    for (let i = firstIndex + 1; i < lastIndex; i++) {
      const textNode = selectedTextNodes[i];
      if (!textNode.isToken()) {
        const nextFormat = textNode.getFormatFlags(formatType, lastNextFormat);
        textNode.setFormat(nextFormat);
      }
    }

    // Update selection only if starts/ends on text node
    if (startPoint.type === 'text') {
      startPoint.set(firstNode.__key, startOffset, 'text');
    }
    if (endPoint.type === 'text') {
      endPoint.set(lastNode.__key, endOffset, 'text');
    }

    this.format = firstNextFormat | lastNextFormat;
  }

  /**
   * Attempts to "intelligently" insert an arbitrary list of Lexical nodes into the EditorState at the
   * current Selection according to a set of heuristics that determine how surrounding nodes
   * should be changed, replaced, or moved to accomodate the incoming ones.
   *
   * @param nodes - the nodes to insert
   * @param selectStart - whether or not to select the start after the insertion.
   * @returns true if the nodes were inserted successfully, false otherwise.
   */
  insertNodes(nodes: Array<LexicalNode>, selectStart?: boolean): boolean {
    // If there is a range selected remove the text in it
    if (!this.isCollapsed()) {
      const selectionEnd = this.isBackward() ? this.anchor : this.focus;

      const nextSibling = selectionEnd.getNode().getNextSibling();
      const nextSiblingKey = nextSibling ? nextSibling.getKey() : null;

      const prevSibling = selectionEnd.getNode().getPreviousSibling();
      const prevSiblingKey = prevSibling ? prevSibling.getKey() : null;

      this.removeText();

      // If the selection has been moved to an adjacent inline element, create
      // a temporary text node that we can insert the nodes after.
      if (this.isCollapsed() && this.focus.type === 'element') {
        let textNode;

        if (this.focus.key === nextSiblingKey && this.focus.offset === 0) {
          textNode = $createTextNode();
          this.focus.getNode().insertBefore(textNode);
        } else if (
          this.focus.key === prevSiblingKey &&
          this.focus.offset === this.focus.getNode().getChildrenSize()
        ) {
          textNode = $createTextNode();
          this.focus.getNode().insertAfter(textNode);
        }

        if (textNode) {
          this.focus.set(textNode.__key, 0, 'text');
          this.anchor.set(textNode.__key, 0, 'text');
        }
      }
    }
    const anchor = this.anchor;
    const anchorOffset = anchor.offset;
    const anchorNode = anchor.getNode();
    let target: ElementNode | TextNode | DecoratorNode<unknown> | LexicalNode =
      anchorNode;

    if (anchor.type === 'element') {
      const element = anchor.getNode();
      const placementNode = element.getChildAtIndex<ElementNode>(
        anchorOffset - 1,
      );
      if (placementNode === null) {
        target = element;
      } else {
        target = placementNode;
      }
    }
    const siblings = [];

    // Get all remaining text node siblings in this element so we can
    // append them after the last node we're inserting.
    const nextSiblings = anchorNode.getNextSiblings();
    const topLevelElement = $isRootOrShadowRoot(anchorNode)
      ? null
      : anchorNode.getTopLevelElementOrThrow();

    if ($isTextNode(anchorNode)) {
      const textContent = anchorNode.getTextContent();
      const textContentLength = textContent.length;
      if (anchorOffset === 0 && textContentLength !== 0) {
        const prevSibling = anchorNode.getPreviousSibling();
        if (prevSibling !== null) {
          target = prevSibling;
        } else {
          target = anchorNode.getParentOrThrow();
        }
        siblings.push(anchorNode);
      } else if (anchorOffset === textContentLength) {
        target = anchorNode;
      } else if (anchorNode.isToken()) {
        // Do nothing if we're inside a token node
        return false;
      } else {
        // If we started with a range selected grab the danglingText after the
        // end of the selection and put it on our siblings array so we can
        // append it after the last node we're inserting
        let danglingText;
        [target, danglingText] = anchorNode.splitText(anchorOffset);
        siblings.push(danglingText);
      }
    }
    const startingNode = target;

    siblings.push(...nextSiblings);

    const firstNode = nodes[0];
    let didReplaceOrMerge = false;
    let lastNode = null;

    // Time to insert the nodes!
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (
        !$isRootOrShadowRoot(target) &&
        !$isDecoratorNode(target) &&
        $isElementNode(node) &&
        !node.isInline()
      ) {
        // -----
        // Heuristics for the replacement or merging of elements
        // -----

        // If we have an incoming element node as the first node, then we'll need
        // see if we can merge any descendant leaf nodes into our existing target.
        // We can do this by finding the first descendant in our node and then we can
        // pluck it and its parent (siblings included) out and insert them directly
        // into our target. We only do this for the first node, as we are only
        // interested in merging with the anchor, which is our target.
        //
        // If we apply either the replacement or merging heuristics, we need to be
        // careful that we're not trying to insert a non-element node into a root node,
        // so we check if the target's parent after this logic is the root node and if
        // so we trigger an invariant to ensure this problem is caught in development
        // and fixed accordingly.

        if (node.is(firstNode)) {
          if (
            $isElementNode(target) &&
            target.isEmpty() &&
            target.canReplaceWith(node)
          ) {
            target.replace(node);
            target = node;
            didReplaceOrMerge = true;
            continue;
          }
          // We may have a node tree where there are many levels, for example with
          // lists and tables. So let's find the first descendant to try and merge
          // with. So if we have the target:
          //
          // Paragraph (1)
          //   Text (2)
          //
          // and we are trying to insert:
          //
          // ListNode (3)
          //   ListItemNode (4)
          //     Text (5)
          //   ListItemNode (6)
          //
          // The result would be:
          //
          // Paragraph (1)
          //   Text (2)
          //   Text (5)
          //

          const firstDescendant = node.getFirstDescendant();
          if ($isLeafNode(firstDescendant)) {
            let element = firstDescendant.getParentOrThrow();
            while (element.isInline()) {
              element = element.getParentOrThrow();
            }
            const children = element.getChildren();
            const childrenLength = children.length;
            if ($isElementNode(target)) {
              let firstChild = target.getFirstChild();
              for (let s = 0; s < childrenLength; s++) {
                const child = children[s];
                if (firstChild === null) {
                  target.append(child);
                } else {
                  firstChild.insertAfter(child);
                }
                firstChild = child;
              }
            } else {
              for (let s = childrenLength - 1; s >= 0; s--) {
                target.insertAfter(children[s]);
              }
              target = target.getParentOrThrow();
            }
            lastNode = children[childrenLength - 1];
            element.remove();
            didReplaceOrMerge = true;
            if (element.is(node)) {
              continue;
            }
          }
        }
        if ($isTextNode(target)) {
          if (topLevelElement === null) {
            invariant(false, 'insertNode: topLevelElement is root node');
          }
          target = topLevelElement;
        }
      } else if (
        didReplaceOrMerge &&
        !$isElementNode(node) &&
        !$isDecoratorNode(node) &&
        $isRootOrShadowRoot(target.getParent<ElementNode>())
      ) {
        invariant(
          false,
          'insertNodes: cannot insert a non-element into a root node',
        );
      }
      didReplaceOrMerge = false;
      if ($isElementNode(target) && !target.isInline()) {
        lastNode = node;
        if ($isDecoratorNode(node) && !node.isInline()) {
          if (nodes.length === 1 && target.canBeEmpty() && target.isEmpty()) {
            target = target.insertBefore(node, false);
          } else {
            target = target.insertAfter(node, false);
          }
        } else if (!$isElementNode(node)) {
          const firstChild = target.getFirstChild();
          if (firstChild !== null) {
            firstChild.insertBefore(node);
          } else {
            target.append(node);
          }
          target = node;
        } else {
          if (!node.canBeEmpty() && node.isEmpty()) {
            continue;
          }
          if ($isRootNode(target)) {
            const placementNode = target.getChildAtIndex(anchorOffset);
            if (placementNode !== null) {
              placementNode.insertBefore(node);
            } else {
              target.append(node);
            }
            target = node;
          } else if (node.isInline()) {
            target.append(node);
            target = node;
          } else {
            target = target.insertAfter(node, false);
          }
        }
      } else if (
        !$isElementNode(node) ||
        ($isElementNode(node) && node.isInline()) ||
        ($isDecoratorNode(target) && !target.isInline())
      ) {
        lastNode = node;
        // when pasting top level node in the middle of paragraph
        // we need to split paragraph instead of placing it inline
        if (
          $isRangeSelection(this) &&
          $isDecoratorNode(node) &&
          ($isElementNode(target) || $isTextNode(target)) &&
          !node.isInline()
        ) {
          let splitNode: ElementNode;
          let splitOffset: number;

          if ($isTextNode(target)) {
            splitNode = target.getParentOrThrow();
            const [textNode] = target.splitText(anchorOffset);
            splitOffset = textNode.getIndexWithinParent() + 1;
          } else {
            splitNode = target;
            splitOffset = anchorOffset;
          }
          const [, rightTree] = $splitNode(splitNode, splitOffset);
          target = rightTree.insertBefore(node);
        } else {
          target = target.insertAfter(node, false);
        }
      } else {
        const nextTarget: ElementNode = target.getParentOrThrow();
        // if we're inserting an Element after a LineBreak, we want to move the target to the parent
        // and remove the LineBreak so we don't have empty space.
        if ($isLineBreakNode(target)) {
          target.remove();
        }
        target = nextTarget;
        // Re-try again with the target being the parent
        i--;
        continue;
      }
    }

    if (selectStart) {
      // Handle moving selection to start for all nodes
      if ($isTextNode(startingNode)) {
        startingNode.select();
      } else {
        const prevSibling = target.getPreviousSibling();
        if ($isTextNode(prevSibling)) {
          prevSibling.select();
        } else {
          const index = target.getIndexWithinParent();
          target.getParentOrThrow().select(index, index);
        }
      }
    }

    if ($isElementNode(target)) {
      // If the last node to be inserted was a text node,
      // then we should attempt to move selection to that.
      const lastChild = $isTextNode(lastNode)
        ? lastNode
        : $isElementNode(lastNode) && lastNode.isInline()
        ? lastNode.getLastDescendant()
        : target.getLastDescendant();
      if (!selectStart) {
        // Handle moving selection to end for elements
        if (lastChild === null) {
          target.select();
        } else if ($isTextNode(lastChild)) {
          if (lastChild.getTextContent() === '') {
            lastChild.selectPrevious();
          } else {
            lastChild.select();
          }
        } else {
          lastChild.selectNext();
        }
      }
      if (siblings.length !== 0) {
        const originalTarget = target;
        for (let i = siblings.length - 1; i >= 0; i--) {
          const sibling = siblings[i];
          const prevParent = sibling.getParentOrThrow();
          if (
            $isElementNode(target) &&
            !$isBlockElementNode(sibling) &&
            !(
              $isDecoratorNode(sibling) &&
              // Note: We are only looking for decorators that are inline and not isolated.
              (!sibling.isInline() || sibling.isIsolated())
            )
          ) {
            if (originalTarget === target) {
              target.append(sibling);
            } else {
              target.insertBefore(sibling);
            }
            target = sibling;
          } else if (!$isElementNode(target) && !$isBlockElementNode(sibling)) {
            target.insertBefore(sibling);
            target = sibling;
          } else {
            if ($isElementNode(sibling) && !sibling.canInsertAfter(target)) {
              // @ts-ignore The clone method does exist on the constructor.
              const prevParentClone = prevParent.constructor.clone(prevParent);
              if (!$isElementNode(prevParentClone)) {
                invariant(
                  false,
                  'insertNodes: cloned parent clone is not an element',
                );
              }
              prevParentClone.append(sibling);
              target.insertAfter(prevParentClone);
            } else {
              target.insertAfter(sibling);
            }
          }
          // Check if the prev parent is empty, as it might need
          // removing.
          if (prevParent.isEmpty() && !prevParent.canBeEmpty()) {
            prevParent.remove();
          }
        }
      }
    } else if (!selectStart) {
      // Handle moving selection to end for other nodes
      if ($isTextNode(target)) {
        target.select();
      } else {
        const element = target.getParentOrThrow();
        const index = target.getIndexWithinParent() + 1;
        element.select(index, index);
      }
    }
    return true;
  }

  /**
   * Inserts a new ParagraphNode into the EditorState at the current Selection
   */
  insertParagraph(): void {
    if (!this.isCollapsed()) {
      this.removeText();
    }
    const anchor = this.anchor;
    const anchorOffset = anchor.offset;
    let currentElement;
    let nodesToMove = [];
    let siblingsToMove: Array<LexicalNode> = [];
    if (anchor.type === 'text') {
      const anchorNode = anchor.getNode();
      nodesToMove = anchorNode.getNextSiblings().reverse();
      currentElement = anchorNode.getParentOrThrow();
      const isInline = currentElement.isInline();
      const textContentLength = isInline
        ? currentElement.getTextContentSize()
        : anchorNode.getTextContentSize();
      if (anchorOffset === 0) {
        nodesToMove.push(anchorNode);
      } else {
        if (isInline) {
          // For inline nodes, we want to move all the siblings to the new paragraph
          // if selection is at the end, we just move the siblings. Otherwise, we also
          // split the text node and add that and it's siblings below.
          siblingsToMove = currentElement.getNextSiblings();
        }
        if (anchorOffset !== textContentLength) {
          if (!isInline || anchorOffset !== anchorNode.getTextContentSize()) {
            const [, splitNode] = anchorNode.splitText(anchorOffset);
            nodesToMove.push(splitNode);
          }
        }
      }
    } else {
      currentElement = anchor.getNode();
      if ($isRootOrShadowRoot(currentElement)) {
        const paragraph = $createParagraphNode();
        const child = currentElement.getChildAtIndex(anchorOffset);
        paragraph.select();
        if (child !== null) {
          child.insertBefore(paragraph, false);
        } else {
          currentElement.append(paragraph);
        }
        return;
      }
      nodesToMove = currentElement.getChildren().slice(anchorOffset).reverse();
    }
    const nodesToMoveLength = nodesToMove.length;
    if (
      anchorOffset === 0 &&
      nodesToMoveLength > 0 &&
      currentElement.isInline()
    ) {
      const parent = currentElement.getParentOrThrow();
      const newElement = parent.insertNewAfter(this, false);
      if ($isElementNode(newElement)) {
        const children = parent.getChildren();
        for (let i = 0; i < children.length; i++) {
          newElement.append(children[i]);
        }
      }
      return;
    }
    const newElement = currentElement.insertNewAfter(this, false);
    if (newElement === null) {
      // Handle as a line break insertion
      this.insertLineBreak();
    } else if ($isElementNode(newElement)) {
      // If we're at the beginning of the current element, move the new element to be before the current element
      const currentElementFirstChild = currentElement.getFirstChild();
      const isBeginning =
        anchorOffset === 0 &&
        (currentElement.is(anchor.getNode()) ||
          (currentElementFirstChild &&
            currentElementFirstChild.is(anchor.getNode())));
      if (isBeginning && nodesToMoveLength > 0) {
        currentElement.insertBefore(newElement);
        return;
      }
      let firstChild = null;
      const siblingsToMoveLength = siblingsToMove.length;
      const parent = newElement.getParentOrThrow();
      // For inline elements, we append the siblings to the parent.
      if (siblingsToMoveLength > 0) {
        for (let i = 0; i < siblingsToMoveLength; i++) {
          const siblingToMove = siblingsToMove[i];
          parent.append(siblingToMove);
        }
      }
      if (nodesToMoveLength !== 0) {
        for (let i = 0; i < nodesToMoveLength; i++) {
          const nodeToMove = nodesToMove[i];
          if (firstChild === null) {
            newElement.append(nodeToMove);
          } else {
            firstChild.insertBefore(nodeToMove);
          }
          firstChild = nodeToMove;
        }
      }
      if (!newElement.canBeEmpty() && newElement.getChildrenSize() === 0) {
        newElement.selectPrevious();
        newElement.remove();
      } else {
        newElement.selectStart();
      }
    }
  }

  /**
   * Inserts a logical linebreak, which may be a new LineBreakNode or a new ParagraphNode, into the EditorState at the
   * current Selection.
   *
   * @param selectStart whether or not to select the start of the insertion range after the operation completes.
   */
  insertLineBreak(selectStart?: boolean): void {
    const lineBreakNode = $createLineBreakNode();
    const anchor = this.anchor;
    if (anchor.type === 'element') {
      const element = anchor.getNode();
      if ($isRootNode(element)) {
        this.insertParagraph();
      }
    }
    if (selectStart) {
      this.insertNodes([lineBreakNode], true);
    } else {
      if (this.insertNodes([lineBreakNode])) {
        lineBreakNode.selectNext(0, 0);
      }
    }
  }

  /**
   * Returns the character-based offsets of the Selection, accounting for non-text Points
   * by using the children size or text content.
   *
   * @returns the character offsets for the Selection
   */
  getCharacterOffsets(): [number, number] {
    return getCharacterOffsets(this);
  }

  /**
   * Extracts the nodes in the Selection, splitting nodes where necessary
   * to get offset-level precision.
   *
   * @returns The nodes in the Selection
   */
  extract(): Array<LexicalNode> {
    const selectedNodes = this.getNodes();
    const selectedNodesLength = selectedNodes.length;
    const lastIndex = selectedNodesLength - 1;
    const anchor = this.anchor;
    const focus = this.focus;
    let firstNode = selectedNodes[0];
    let lastNode = selectedNodes[lastIndex];
    const [anchorOffset, focusOffset] = getCharacterOffsets(this);

    if (selectedNodesLength === 0) {
      return [];
    } else if (selectedNodesLength === 1) {
      if ($isTextNode(firstNode) && !this.isCollapsed()) {
        const startOffset =
          anchorOffset > focusOffset ? focusOffset : anchorOffset;
        const endOffset =
          anchorOffset > focusOffset ? anchorOffset : focusOffset;
        const splitNodes = firstNode.splitText(startOffset, endOffset);
        const node = startOffset === 0 ? splitNodes[0] : splitNodes[1];
        return node != null ? [node] : [];
      }
      return [firstNode];
    }
    const isBefore = anchor.isBefore(focus);

    if ($isTextNode(firstNode)) {
      const startOffset = isBefore ? anchorOffset : focusOffset;
      if (startOffset === firstNode.getTextContentSize()) {
        selectedNodes.shift();
      } else if (startOffset !== 0) {
        [, firstNode] = firstNode.splitText(startOffset);
        selectedNodes[0] = firstNode;
      }
    }
    if ($isTextNode(lastNode)) {
      const lastNodeText = lastNode.getTextContent();
      const lastNodeTextLength = lastNodeText.length;
      const endOffset = isBefore ? focusOffset : anchorOffset;
      if (endOffset === 0) {
        selectedNodes.pop();
      } else if (endOffset !== lastNodeTextLength) {
        [lastNode] = lastNode.splitText(endOffset);
        selectedNodes[lastIndex] = lastNode;
      }
    }
    return selectedNodes;
  }

  /**
   * Modifies the Selection according to the parameters and a set of heuristics that account for
   * various node types. Can be used to safely move or extend selection by one logical "unit" without
   * dealing explicitly with all the possible node types.
   *
   * @param alter the type of modification to perform
   * @param isBackward whether or not selection is backwards
   * @param granularity the granularity at which to apply the modification
   */
  modify(
    alter: 'move' | 'extend',
    isBackward: boolean,
    granularity: 'character' | 'word' | 'lineboundary',
  ): void {
    const focus = this.focus;
    const anchor = this.anchor;
    const collapse = alter === 'move';

    // Handle the selection movement around decorators.
    const possibleNode = $getAdjacentNode(focus, isBackward);
    if ($isDecoratorNode(possibleNode) && !possibleNode.isIsolated()) {
      // Make it possible to move selection from range selection to
      // node selection on the node.
      if (collapse && possibleNode.isKeyboardSelectable()) {
        const nodeSelection = $createNodeSelection();
        nodeSelection.add(possibleNode.__key);
        $setSelection(nodeSelection);
        return;
      }
      const sibling = isBackward
        ? possibleNode.getPreviousSibling()
        : possibleNode.getNextSibling();

      if (!$isTextNode(sibling)) {
        const parent = possibleNode.getParentOrThrow();
        let offset;
        let elementKey;

        if ($isElementNode(sibling)) {
          elementKey = sibling.__key;
          offset = isBackward ? sibling.getChildrenSize() : 0;
        } else {
          offset = possibleNode.getIndexWithinParent();
          elementKey = parent.__key;
          if (!isBackward) {
            offset++;
          }
        }
        focus.set(elementKey, offset, 'element');
        if (collapse) {
          anchor.set(elementKey, offset, 'element');
        }
        return;
      } else {
        const siblingKey = sibling.__key;
        const offset = isBackward ? sibling.getTextContent().length : 0;
        focus.set(siblingKey, offset, 'text');
        if (collapse) {
          anchor.set(siblingKey, offset, 'text');
        }
        return;
      }
    }
    const editor = getActiveEditor();
    const domSelection = getDOMSelection(editor._window);

    if (!domSelection) {
      return;
    }
    const blockCursorElement = editor._blockCursorElement;
    const rootElement = editor._rootElement;
    // Remove the block cursor element if it exists. This will ensure selection
    // works as intended. If we leave it in the DOM all sorts of strange bugs
    // occur. :/
    if (
      rootElement !== null &&
      blockCursorElement !== null &&
      $isElementNode(possibleNode) &&
      !possibleNode.isInline() &&
      !possibleNode.canBeEmpty()
    ) {
      removeDOMBlockCursorElement(blockCursorElement, editor, rootElement);
    }
    // We use the DOM selection.modify API here to "tell" us what the selection
    // will be. We then use it to update the Lexical selection accordingly. This
    // is much more reliable than waiting for a beforeinput and using the ranges
    // from getTargetRanges(), and is also better than trying to do it ourselves
    // using Intl.Segmenter or other workarounds that struggle with word segments
    // and line segments (especially with word wrapping and non-Roman languages).
    moveNativeSelection(
      domSelection,
      alter,
      isBackward ? 'backward' : 'forward',
      granularity,
    );
    // Guard against no ranges
    if (domSelection.rangeCount > 0) {
      const range = domSelection.getRangeAt(0);
      // Apply the DOM selection to our Lexical selection.
      const anchorNode = this.anchor.getNode();
      const root = $isRootNode(anchorNode)
        ? anchorNode
        : $getNearestRootOrShadowRoot(anchorNode);
      this.applyDOMRange(range);
      this.dirty = true;
      if (!collapse) {
        // Validate selection; make sure that the new extended selection respects shadow roots
        const nodes = this.getNodes();
        const validNodes = [];
        let shrinkSelection = false;
        for (let i = 0; i < nodes.length; i++) {
          const nextNode = nodes[i];
          if ($hasAncestor(nextNode, root)) {
            validNodes.push(nextNode);
          } else {
            shrinkSelection = true;
          }
        }
        if (shrinkSelection && validNodes.length > 0) {
          // validNodes length check is a safeguard against an invalid selection; as getNodes()
          // will return an empty array in this case
          if (isBackward) {
            const firstValidNode = validNodes[0];
            if ($isElementNode(firstValidNode)) {
              firstValidNode.selectStart();
            } else {
              firstValidNode.getParentOrThrow().selectStart();
            }
          } else {
            const lastValidNode = validNodes[validNodes.length - 1];
            if ($isElementNode(lastValidNode)) {
              lastValidNode.selectEnd();
            } else {
              lastValidNode.getParentOrThrow().selectEnd();
            }
          }
        }

        // Because a range works on start and end, we might need to flip
        // the anchor and focus points to match what the DOM has, not what
        // the range has specifically.
        if (
          domSelection.anchorNode !== range.startContainer ||
          domSelection.anchorOffset !== range.startOffset
        ) {
          $swapPoints(this);
        }
      }
    }
  }

  /**
   * Performs one logical character deletion operation on the EditorState based on the current Selection.
   * Handles different node types.
   *
   * @param isBackward whether or not the selection is backwards.
   */
  deleteCharacter(isBackward: boolean): void {
    const wasCollapsed = this.isCollapsed();
    if (this.isCollapsed()) {
      const anchor = this.anchor;
      const focus = this.focus;
      let anchorNode: TextNode | ElementNode | null = anchor.getNode();
      if (
        !isBackward &&
        // Delete forward handle case
        ((anchor.type === 'element' &&
          $isElementNode(anchorNode) &&
          anchor.offset === anchorNode.getChildrenSize()) ||
          (anchor.type === 'text' &&
            anchor.offset === anchorNode.getTextContentSize()))
      ) {
        const parent = anchorNode.getParent();
        const nextSibling =
          anchorNode.getNextSibling() ||
          (parent === null ? null : parent.getNextSibling());

        if ($isElementNode(nextSibling) && nextSibling.isShadowRoot()) {
          return;
        }
      }
      // Handle the deletion around decorators.
      const possibleNode = $getAdjacentNode(focus, isBackward);
      if ($isDecoratorNode(possibleNode) && !possibleNode.isIsolated()) {
        // Make it possible to move selection from range selection to
        // node selection on the node.
        if (
          possibleNode.isKeyboardSelectable() &&
          $isElementNode(anchorNode) &&
          anchorNode.getChildrenSize() === 0
        ) {
          anchorNode.remove();
          const nodeSelection = $createNodeSelection();
          nodeSelection.add(possibleNode.__key);
          $setSelection(nodeSelection);
        } else {
          possibleNode.remove();
          const editor = getActiveEditor();
          editor.dispatchCommand(SELECTION_CHANGE_COMMAND, undefined);
        }
        return;
      } else if (
        !isBackward &&
        $isElementNode(possibleNode) &&
        $isElementNode(anchorNode) &&
        anchorNode.isEmpty()
      ) {
        anchorNode.remove();
        possibleNode.selectStart();
        return;
      }
      this.modify('extend', isBackward, 'character');

      if (!this.isCollapsed()) {
        const focusNode = focus.type === 'text' ? focus.getNode() : null;
        anchorNode = anchor.type === 'text' ? anchor.getNode() : null;

        if (focusNode !== null && focusNode.isSegmented()) {
          const offset = focus.offset;
          const textContentSize = focusNode.getTextContentSize();
          if (
            focusNode.is(anchorNode) ||
            (isBackward && offset !== textContentSize) ||
            (!isBackward && offset !== 0)
          ) {
            $removeSegment(focusNode, isBackward, offset);
            return;
          }
        } else if (anchorNode !== null && anchorNode.isSegmented()) {
          const offset = anchor.offset;
          const textContentSize = anchorNode.getTextContentSize();
          if (
            anchorNode.is(focusNode) ||
            (isBackward && offset !== 0) ||
            (!isBackward && offset !== textContentSize)
          ) {
            $removeSegment(anchorNode, isBackward, offset);
            return;
          }
        }
        $updateCaretSelectionForUnicodeCharacter(this, isBackward);
      } else if (isBackward && anchor.offset === 0) {
        // Special handling around rich text nodes
        const element =
          anchor.type === 'element'
            ? anchor.getNode()
            : anchor.getNode().getParentOrThrow();
        if (element.collapseAtStart(this)) {
          return;
        }
      }
    }
    this.removeText();
    if (
      isBackward &&
      !wasCollapsed &&
      this.isCollapsed() &&
      this.anchor.type === 'element' &&
      this.anchor.offset === 0
    ) {
      const anchorNode = this.anchor.getNode();
      if (
        anchorNode.isEmpty() &&
        $isRootNode(anchorNode.getParent()) &&
        anchorNode.getIndexWithinParent() === 0
      ) {
        anchorNode.collapseAtStart(this);
      }
    }
  }

  /**
   * Performs one logical line deletion operation on the EditorState based on the current Selection.
   * Handles different node types.
   *
   * @param isBackward whether or not the selection is backwards.
   */
  deleteLine(isBackward: boolean): void {
    if (this.isCollapsed()) {
      if (this.anchor.type === 'text') {
        this.modify('extend', isBackward, 'lineboundary');
      }

      // If selection is extended to cover text edge then extend it one character more
      // to delete its parent element. Otherwise text content will be deleted but empty
      // parent node will remain
      const endPoint = isBackward ? this.focus : this.anchor;
      if (endPoint.offset === 0) {
        this.modify('extend', isBackward, 'character');
      }
    }
    this.removeText();
  }

  /**
   * Performs one logical word deletion operation on the EditorState based on the current Selection.
   * Handles different node types.
   *
   * @param isBackward whether or not the selection is backwards.
   */
  deleteWord(isBackward: boolean): void {
    if (this.isCollapsed()) {
      this.modify('extend', isBackward, 'word');
    }
    this.removeText();
  }
}

export function $isNodeSelection(x: unknown): x is NodeSelection {
  return x instanceof NodeSelection;
}

function getCharacterOffset(point: PointType): number {
  const offset = point.offset;
  if (point.type === 'text') {
    return offset;
  }

  const parent = point.getNode();
  return offset === parent.getChildrenSize()
    ? parent.getTextContent().length
    : 0;
}

function getCharacterOffsets(
  selection: RangeSelection | GridSelection,
): [number, number] {
  const anchor = selection.anchor;
  const focus = selection.focus;
  if (
    anchor.type === 'element' &&
    focus.type === 'element' &&
    anchor.key === focus.key &&
    anchor.offset === focus.offset
  ) {
    return [0, 0];
  }
  return [getCharacterOffset(anchor), getCharacterOffset(focus)];
}

function $swapPoints(selection: RangeSelection): void {
  const focus = selection.focus;
  const anchor = selection.anchor;
  const anchorKey = anchor.key;
  const anchorOffset = anchor.offset;
  const anchorType = anchor.type;

  $setPointValues(anchor, focus.key, focus.offset, focus.type);
  $setPointValues(focus, anchorKey, anchorOffset, anchorType);
  selection._cachedNodes = null;
}

function moveNativeSelection(
  domSelection: Selection,
  alter: 'move' | 'extend',
  direction: 'backward' | 'forward' | 'left' | 'right',
  granularity: 'character' | 'word' | 'lineboundary',
): void {
  // Selection.modify() method applies a change to the current selection or cursor position,
  // but is still non-standard in some browsers.
  domSelection.modify(alter, direction, granularity);
}

function $updateCaretSelectionForUnicodeCharacter(
  selection: RangeSelection,
  isBackward: boolean,
): void {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = anchor.getNode();
  const focusNode = focus.getNode();

  if (
    anchorNode === focusNode &&
    anchor.type === 'text' &&
    focus.type === 'text'
  ) {
    // Handling of multibyte characters
    const anchorOffset = anchor.offset;
    const focusOffset = focus.offset;
    const isBefore = anchorOffset < focusOffset;
    const startOffset = isBefore ? anchorOffset : focusOffset;
    const endOffset = isBefore ? focusOffset : anchorOffset;
    const characterOffset = endOffset - 1;

    if (startOffset !== characterOffset) {
      const text = anchorNode.getTextContent().slice(startOffset, endOffset);
      if (!doesContainGrapheme(text)) {
        if (isBackward) {
          focus.offset = characterOffset;
        } else {
          anchor.offset = characterOffset;
        }
      }
    }
  } else {
    // TODO Handling of multibyte characters
  }
}

function $removeSegment(
  node: TextNode,
  isBackward: boolean,
  offset: number,
): void {
  const textNode = node;
  const textContent = textNode.getTextContent();
  const split = textContent.split(/(?=\s)/g);
  const splitLength = split.length;
  let segmentOffset = 0;
  let restoreOffset: number | undefined = 0;

  for (let i = 0; i < splitLength; i++) {
    const text = split[i];
    const isLast = i === splitLength - 1;
    restoreOffset = segmentOffset;
    segmentOffset += text.length;

    if (
      (isBackward && segmentOffset === offset) ||
      segmentOffset > offset ||
      isLast
    ) {
      split.splice(i, 1);
      if (isLast) {
        restoreOffset = undefined;
      }
      break;
    }
  }
  const nextTextContent = split.join('').trim();

  if (nextTextContent === '') {
    textNode.remove();
  } else {
    textNode.setTextContent(nextTextContent);
    textNode.select(restoreOffset, restoreOffset);
  }
}

function shouldResolveAncestor(
  resolvedElement: ElementNode,
  resolvedOffset: number,
  lastPoint: null | PointType,
): boolean {
  const parent = resolvedElement.getParent();
  return (
    lastPoint === null ||
    parent === null ||
    !parent.canBeEmpty() ||
    parent !== lastPoint.getNode()
  );
}

function internalResolveSelectionPoint(
  dom: Node,
  offset: number,
  lastPoint: null | PointType,
  editor: LexicalEditor,
): null | PointType {
  let resolvedOffset = offset;
  let resolvedNode: TextNode | LexicalNode | null;
  // If we have selection on an element, we will
  // need to figure out (using the offset) what text
  // node should be selected.

  if (dom.nodeType === DOM_ELEMENT_TYPE) {
    // Resolve element to a ElementNode, or TextNode, or null
    let moveSelectionToEnd = false;
    // Given we're moving selection to another node, selection is
    // definitely dirty.
    // We use the anchor to find which child node to select
    const childNodes = dom.childNodes;
    const childNodesLength = childNodes.length;
    // If the anchor is the same as length, then this means we
    // need to select the very last text node.
    if (resolvedOffset === childNodesLength) {
      moveSelectionToEnd = true;
      resolvedOffset = childNodesLength - 1;
    }
    let childDOM = childNodes[resolvedOffset];
    let hasBlockCursor = false;
    if (childDOM === editor._blockCursorElement) {
      childDOM = childNodes[resolvedOffset + 1];
      hasBlockCursor = true;
    } else if (editor._blockCursorElement !== null) {
      resolvedOffset--;
    }
    resolvedNode = getNodeFromDOM(childDOM);

    if ($isTextNode(resolvedNode)) {
      resolvedOffset = getTextNodeOffset(resolvedNode, moveSelectionToEnd);
    } else {
      let resolvedElement = getNodeFromDOM(dom);
      // Ensure resolvedElement is actually a element.
      if (resolvedElement === null) {
        return null;
      }
      if ($isElementNode(resolvedElement)) {
        let child = resolvedElement.getChildAtIndex(resolvedOffset);
        if (
          $isElementNode(child) &&
          shouldResolveAncestor(child, resolvedOffset, lastPoint)
        ) {
          const descendant = moveSelectionToEnd
            ? child.getLastDescendant()
            : child.getFirstDescendant();
          if (descendant === null) {
            resolvedElement = child;
            resolvedOffset = 0;
          } else {
            child = descendant;
            resolvedElement = $isElementNode(child)
              ? child
              : child.getParentOrThrow();
          }
        }
        if ($isTextNode(child)) {
          resolvedNode = child;
          resolvedElement = null;
          resolvedOffset = getTextNodeOffset(child, moveSelectionToEnd);
        } else if (
          child !== resolvedElement &&
          moveSelectionToEnd &&
          !hasBlockCursor
        ) {
          resolvedOffset++;
        }
      } else {
        const index = resolvedElement.getIndexWithinParent();
        // When selecting decorators, there can be some selection issues when using resolvedOffset,
        // and instead we should be checking if we're using the offset
        if (
          offset === 0 &&
          $isDecoratorNode(resolvedElement) &&
          getNodeFromDOM(dom) === resolvedElement
        ) {
          resolvedOffset = index;
        } else {
          resolvedOffset = index + 1;
        }
        resolvedElement = resolvedElement.getParentOrThrow();
      }
      if ($isElementNode(resolvedElement)) {
        return $createPoint(resolvedElement.__key, resolvedOffset, 'element');
      }
    }
  } else {
    // TextNode or null
    resolvedNode = getNodeFromDOM(dom);
  }
  if (!$isTextNode(resolvedNode)) {
    return null;
  }
  return $createPoint(resolvedNode.__key, resolvedOffset, 'text');
}

function resolveSelectionPointOnBoundary(
  point: TextPointType,
  isBackward: boolean,
  isCollapsed: boolean,
): void {
  const offset = point.offset;
  const node = point.getNode();

  if (offset === 0) {
    const prevSibling = node.getPreviousSibling();
    const parent = node.getParent();

    if (!isBackward) {
      if (
        $isElementNode(prevSibling) &&
        !isCollapsed &&
        prevSibling.isInline()
      ) {
        point.key = prevSibling.__key;
        point.offset = prevSibling.getChildrenSize();
        // @ts-expect-error: intentional
        point.type = 'element';
      } else if ($isTextNode(prevSibling)) {
        point.key = prevSibling.__key;
        point.offset = prevSibling.getTextContent().length;
      }
    } else if (
      (isCollapsed || !isBackward) &&
      prevSibling === null &&
      $isElementNode(parent) &&
      parent.isInline()
    ) {
      const parentSibling = parent.getPreviousSibling();
      if ($isTextNode(parentSibling)) {
        point.key = parentSibling.__key;
        point.offset = parentSibling.getTextContent().length;
      }
    }
  } else if (offset === node.getTextContent().length) {
    const nextSibling = node.getNextSibling();
    const parent = node.getParent();

    if (isBackward && $isElementNode(nextSibling) && nextSibling.isInline()) {
      point.key = nextSibling.__key;
      point.offset = 0;
      // @ts-expect-error: intentional
      point.type = 'element';
    } else if (
      (isCollapsed || isBackward) &&
      nextSibling === null &&
      $isElementNode(parent) &&
      parent.isInline() &&
      !parent.canInsertTextAfter()
    ) {
      const parentSibling = parent.getNextSibling();
      if ($isTextNode(parentSibling)) {
        point.key = parentSibling.__key;
        point.offset = 0;
      }
    }
  }
}

function normalizeSelectionPointsForBoundaries(
  anchor: PointType,
  focus: PointType,
  lastSelection: null | RangeSelection | NodeSelection | GridSelection,
): void {
  if (anchor.type === 'text' && focus.type === 'text') {
    const isBackward = anchor.isBefore(focus);
    const isCollapsed = anchor.is(focus);

    // Attempt to normalize the offset to the previous sibling if we're at the
    // start of a text node and the sibling is a text node or inline element.
    resolveSelectionPointOnBoundary(anchor, isBackward, isCollapsed);
    resolveSelectionPointOnBoundary(focus, !isBackward, isCollapsed);

    if (isCollapsed) {
      focus.key = anchor.key;
      focus.offset = anchor.offset;
      focus.type = anchor.type;
    }
    const editor = getActiveEditor();

    if (
      editor.isComposing() &&
      editor._compositionKey !== anchor.key &&
      $isRangeSelection(lastSelection)
    ) {
      const lastAnchor = lastSelection.anchor;
      const lastFocus = lastSelection.focus;
      $setPointValues(
        anchor,
        lastAnchor.key,
        lastAnchor.offset,
        lastAnchor.type,
      );
      $setPointValues(focus, lastFocus.key, lastFocus.offset, lastFocus.type);
    }
  }
}

function internalResolveSelectionPoints(
  anchorDOM: null | Node,
  anchorOffset: number,
  focusDOM: null | Node,
  focusOffset: number,
  editor: LexicalEditor,
  lastSelection: null | RangeSelection | NodeSelection | GridSelection,
): null | [PointType, PointType] {
  if (
    anchorDOM === null ||
    focusDOM === null ||
    !isSelectionWithinEditor(editor, anchorDOM, focusDOM)
  ) {
    return null;
  }
  const resolvedAnchorPoint = internalResolveSelectionPoint(
    anchorDOM,
    anchorOffset,
    $isRangeSelection(lastSelection) ? lastSelection.anchor : null,
    editor,
  );
  if (resolvedAnchorPoint === null) {
    return null;
  }
  const resolvedFocusPoint = internalResolveSelectionPoint(
    focusDOM,
    focusOffset,
    $isRangeSelection(lastSelection) ? lastSelection.focus : null,
    editor,
  );
  if (resolvedFocusPoint === null) {
    return null;
  }
  if (
    resolvedAnchorPoint.type === 'element' &&
    resolvedFocusPoint.type === 'element'
  ) {
    const anchorNode = getNodeFromDOM(anchorDOM);
    const focusNode = getNodeFromDOM(focusDOM);
    // Ensure if we're selecting the content of a decorator that we
    // return null for this point, as it's not in the controlled scope
    // of Lexical.
    if ($isDecoratorNode(anchorNode) && $isDecoratorNode(focusNode)) {
      return null;
    }
  }

  // Handle normalization of selection when it is at the boundaries.
  normalizeSelectionPointsForBoundaries(
    resolvedAnchorPoint,
    resolvedFocusPoint,
    lastSelection,
  );

  return [resolvedAnchorPoint, resolvedFocusPoint];
}

export function $isBlockElementNode(
  node: LexicalNode | null | undefined,
): node is ElementNode {
  return $isElementNode(node) && !node.isInline();
}

// This is used to make a selection when the existing
// selection is null, i.e. forcing selection on the editor
// when it current exists outside the editor.

export function internalMakeRangeSelection(
  anchorKey: NodeKey,
  anchorOffset: number,
  focusKey: NodeKey,
  focusOffset: number,
  anchorType: 'text' | 'element',
  focusType: 'text' | 'element',
): RangeSelection {
  const editorState = getActiveEditorState();
  const selection = new RangeSelection(
    $createPoint(anchorKey, anchorOffset, anchorType),
    $createPoint(focusKey, focusOffset, focusType),
    0,
    '',
  );
  selection.dirty = true;
  editorState._selection = selection;
  return selection;
}

export function $createRangeSelection(): RangeSelection {
  const anchor = $createPoint('root', 0, 'element');
  const focus = $createPoint('root', 0, 'element');
  return new RangeSelection(anchor, focus, 0, '');
}

export function $createNodeSelection(): NodeSelection {
  return new NodeSelection(new Set());
}

export function DEPRECATED_$createGridSelection(): GridSelection {
  const anchor = $createPoint('root', 0, 'element');
  const focus = $createPoint('root', 0, 'element');
  return new GridSelection('root', anchor, focus);
}

export function internalCreateSelection(
  editor: LexicalEditor,
): null | RangeSelection | NodeSelection | GridSelection {
  const currentEditorState = editor.getEditorState();
  const lastSelection = currentEditorState._selection;
  const domSelection = getDOMSelection(editor._window);

  if (
    $isNodeSelection(lastSelection) ||
    DEPRECATED_$isGridSelection(lastSelection)
  ) {
    return lastSelection.clone();
  }

  return internalCreateRangeSelection(lastSelection, domSelection, editor);
}

export function internalCreateRangeSelection(
  lastSelection: null | RangeSelection | NodeSelection | GridSelection,
  domSelection: Selection | null,
  editor: LexicalEditor,
): null | RangeSelection {
  const windowObj = editor._window;
  if (windowObj === null) {
    return null;
  }
  // When we create a selection, we try to use the previous
  // selection where possible, unless an actual user selection
  // change has occurred. When we do need to create a new selection
  // we validate we can have text nodes for both anchor and focus
  // nodes. If that holds true, we then return that selection
  // as a mutable object that we use for the editor state for this
  // update cycle. If a selection gets changed, and requires a
  // update to native DOM selection, it gets marked as "dirty".
  // If the selection changes, but matches with the existing
  // DOM selection, then we only need to sync it. Otherwise,
  // we generally bail out of doing an update to selection during
  // reconciliation unless there are dirty nodes that need
  // reconciling.

  const windowEvent = windowObj.event;
  const eventType = windowEvent ? windowEvent.type : undefined;
  const isSelectionChange = eventType === 'selectionchange';
  const useDOMSelection =
    !getIsProcesssingMutations() &&
    (isSelectionChange ||
      eventType === 'beforeinput' ||
      eventType === 'compositionstart' ||
      eventType === 'compositionend' ||
      (eventType === 'click' &&
        windowEvent &&
        (windowEvent as InputEvent).detail === 3) ||
      eventType === 'drop' ||
      eventType === undefined);
  let anchorDOM, focusDOM, anchorOffset, focusOffset;

  if (!$isRangeSelection(lastSelection) || useDOMSelection) {
    if (domSelection === null) {
      return null;
    }
    anchorDOM = domSelection.anchorNode;
    focusDOM = domSelection.focusNode;
    anchorOffset = domSelection.anchorOffset;
    focusOffset = domSelection.focusOffset;
    if (
      isSelectionChange &&
      $isRangeSelection(lastSelection) &&
      !isSelectionWithinEditor(editor, anchorDOM, focusDOM)
    ) {
      return lastSelection.clone();
    }
  } else {
    return lastSelection.clone();
  }
  // Let's resolve the text nodes from the offsets and DOM nodes we have from
  // native selection.
  const resolvedSelectionPoints = internalResolveSelectionPoints(
    anchorDOM,
    anchorOffset,
    focusDOM,
    focusOffset,
    editor,
    lastSelection,
  );
  if (resolvedSelectionPoints === null) {
    return null;
  }
  const [resolvedAnchorPoint, resolvedFocusPoint] = resolvedSelectionPoints;
  return new RangeSelection(
    resolvedAnchorPoint,
    resolvedFocusPoint,
    !$isRangeSelection(lastSelection) ? 0 : lastSelection.format,
    !$isRangeSelection(lastSelection) ? '' : lastSelection.style,
  );
}

export function $getSelection():
  | null
  | RangeSelection
  | NodeSelection
  | GridSelection {
  const editorState = getActiveEditorState();
  return editorState._selection;
}

export function $getPreviousSelection():
  | null
  | RangeSelection
  | NodeSelection
  | GridSelection {
  const editor = getActiveEditor();
  return editor._editorState._selection;
}

export function $updateElementSelectionOnCreateDeleteNode(
  selection: RangeSelection,
  parentNode: LexicalNode,
  nodeOffset: number,
  times = 1,
): void {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = anchor.getNode();
  const focusNode = focus.getNode();
  if (!parentNode.is(anchorNode) && !parentNode.is(focusNode)) {
    return;
  }
  const parentKey = parentNode.__key;
  // Single node. We shift selection but never redimension it
  if (selection.isCollapsed()) {
    const selectionOffset = anchor.offset;
    if (
      (nodeOffset <= selectionOffset && times > 0) ||
      (nodeOffset < selectionOffset && times < 0)
    ) {
      const newSelectionOffset = Math.max(0, selectionOffset + times);
      anchor.set(parentKey, newSelectionOffset, 'element');
      focus.set(parentKey, newSelectionOffset, 'element');
      // The new selection might point to text nodes, try to resolve them
      $updateSelectionResolveTextNodes(selection);
    }
  } else {
    // Multiple nodes selected. We shift or redimension selection
    const isBackward = selection.isBackward();
    const firstPoint = isBackward ? focus : anchor;
    const firstPointNode = firstPoint.getNode();
    const lastPoint = isBackward ? anchor : focus;
    const lastPointNode = lastPoint.getNode();
    if (parentNode.is(firstPointNode)) {
      const firstPointOffset = firstPoint.offset;
      if (
        (nodeOffset <= firstPointOffset && times > 0) ||
        (nodeOffset < firstPointOffset && times < 0)
      ) {
        firstPoint.set(
          parentKey,
          Math.max(0, firstPointOffset + times),
          'element',
        );
      }
    }
    if (parentNode.is(lastPointNode)) {
      const lastPointOffset = lastPoint.offset;
      if (
        (nodeOffset <= lastPointOffset && times > 0) ||
        (nodeOffset < lastPointOffset && times < 0)
      ) {
        lastPoint.set(
          parentKey,
          Math.max(0, lastPointOffset + times),
          'element',
        );
      }
    }
  }
  // The new selection might point to text nodes, try to resolve them
  $updateSelectionResolveTextNodes(selection);
}

function $updateSelectionResolveTextNodes(selection: RangeSelection): void {
  const anchor = selection.anchor;
  const anchorOffset = anchor.offset;
  const focus = selection.focus;
  const focusOffset = focus.offset;
  const anchorNode = anchor.getNode();
  const focusNode = focus.getNode();
  if (selection.isCollapsed()) {
    if (!$isElementNode(anchorNode)) {
      return;
    }
    const childSize = anchorNode.getChildrenSize();
    const anchorOffsetAtEnd = anchorOffset >= childSize;
    const child = anchorOffsetAtEnd
      ? anchorNode.getChildAtIndex(childSize - 1)
      : anchorNode.getChildAtIndex(anchorOffset);
    if ($isTextNode(child)) {
      let newOffset = 0;
      if (anchorOffsetAtEnd) {
        newOffset = child.getTextContentSize();
      }
      anchor.set(child.__key, newOffset, 'text');
      focus.set(child.__key, newOffset, 'text');
    }
    return;
  }
  if ($isElementNode(anchorNode)) {
    const childSize = anchorNode.getChildrenSize();
    const anchorOffsetAtEnd = anchorOffset >= childSize;
    const child = anchorOffsetAtEnd
      ? anchorNode.getChildAtIndex(childSize - 1)
      : anchorNode.getChildAtIndex(anchorOffset);
    if ($isTextNode(child)) {
      let newOffset = 0;
      if (anchorOffsetAtEnd) {
        newOffset = child.getTextContentSize();
      }
      anchor.set(child.__key, newOffset, 'text');
    }
  }
  if ($isElementNode(focusNode)) {
    const childSize = focusNode.getChildrenSize();
    const focusOffsetAtEnd = focusOffset >= childSize;
    const child = focusOffsetAtEnd
      ? focusNode.getChildAtIndex(childSize - 1)
      : focusNode.getChildAtIndex(focusOffset);
    if ($isTextNode(child)) {
      let newOffset = 0;
      if (focusOffsetAtEnd) {
        newOffset = child.getTextContentSize();
      }
      focus.set(child.__key, newOffset, 'text');
    }
  }
}

export function applySelectionTransforms(
  nextEditorState: EditorState,
  editor: LexicalEditor,
): void {
  const prevEditorState = editor.getEditorState();
  const prevSelection = prevEditorState._selection;
  const nextSelection = nextEditorState._selection;
  if ($isRangeSelection(nextSelection)) {
    const anchor = nextSelection.anchor;
    const focus = nextSelection.focus;
    let anchorNode;

    if (anchor.type === 'text') {
      anchorNode = anchor.getNode();
      anchorNode.selectionTransform(prevSelection, nextSelection);
    }
    if (focus.type === 'text') {
      const focusNode = focus.getNode();
      if (anchorNode !== focusNode) {
        focusNode.selectionTransform(prevSelection, nextSelection);
      }
    }
  }
}

export function moveSelectionPointToSibling(
  point: PointType,
  node: LexicalNode,
  parent: ElementNode,
  prevSibling: LexicalNode | null,
  nextSibling: LexicalNode | null,
): void {
  let siblingKey = null;
  let offset = 0;
  let type: 'text' | 'element' | null = null;
  if (prevSibling !== null) {
    siblingKey = prevSibling.__key;
    if ($isTextNode(prevSibling)) {
      offset = prevSibling.getTextContentSize();
      type = 'text';
    } else if ($isElementNode(prevSibling)) {
      offset = prevSibling.getChildrenSize();
      type = 'element';
    }
  } else {
    if (nextSibling !== null) {
      siblingKey = nextSibling.__key;
      if ($isTextNode(nextSibling)) {
        type = 'text';
      } else if ($isElementNode(nextSibling)) {
        type = 'element';
      }
    }
  }
  if (siblingKey !== null && type !== null) {
    point.set(siblingKey, offset, type);
  } else {
    offset = node.getIndexWithinParent();
    if (offset === -1) {
      // Move selection to end of parent
      offset = parent.getChildrenSize();
    }
    point.set(parent.__key, offset, 'element');
  }
}

export function adjustPointOffsetForMergedSibling(
  point: PointType,
  isBefore: boolean,
  key: NodeKey,
  target: TextNode,
  textLength: number,
): void {
  if (point.type === 'text') {
    point.key = key;
    if (!isBefore) {
      point.offset += textLength;
    }
  } else if (point.offset > target.getIndexWithinParent()) {
    point.offset -= 1;
  }
}

export function updateDOMSelection(
  prevSelection: RangeSelection | NodeSelection | GridSelection | null,
  nextSelection: RangeSelection | NodeSelection | GridSelection | null,
  editor: LexicalEditor,
  domSelection: Selection,
  tags: Set<string>,
  rootElement: HTMLElement,
  nodeCount: number,
): void {
  const anchorDOMNode = domSelection.anchorNode;
  const focusDOMNode = domSelection.focusNode;
  const anchorOffset = domSelection.anchorOffset;
  const focusOffset = domSelection.focusOffset;
  const activeElement = document.activeElement;

  // TODO: make this not hard-coded, and add another config option
  // that makes this configurable.
  if (
    (tags.has('collaboration') && activeElement !== rootElement) ||
    (activeElement !== null &&
      isSelectionCapturedInDecoratorInput(activeElement))
  ) {
    return;
  }

  if (!$isRangeSelection(nextSelection)) {
    // We don't remove selection if the prevSelection is null because
    // of editor.setRootElement(). If this occurs on init when the
    // editor is already focused, then this can cause the editor to
    // lose focus.
    if (
      prevSelection !== null &&
      isSelectionWithinEditor(editor, anchorDOMNode, focusDOMNode)
    ) {
      domSelection.removeAllRanges();
    }

    return;
  }

  const anchor = nextSelection.anchor;
  const focus = nextSelection.focus;
  const anchorKey = anchor.key;
  const focusKey = focus.key;
  const anchorDOM = getElementByKeyOrThrow(editor, anchorKey);
  const focusDOM = getElementByKeyOrThrow(editor, focusKey);
  const nextAnchorOffset = anchor.offset;
  const nextFocusOffset = focus.offset;
  const nextFormat = nextSelection.format;
  const nextStyle = nextSelection.style;
  const isCollapsed = nextSelection.isCollapsed();
  let nextAnchorNode: HTMLElement | Text | null = anchorDOM;
  let nextFocusNode: HTMLElement | Text | null = focusDOM;
  let anchorFormatOrStyleChanged = false;

  if (anchor.type === 'text') {
    nextAnchorNode = getDOMTextNode(anchorDOM);
    const anchorNode = anchor.getNode();
    anchorFormatOrStyleChanged =
      anchorNode.getFormat() !== nextFormat ||
      anchorNode.getStyle() !== nextStyle;
  } else if (
    $isRangeSelection(prevSelection) &&
    prevSelection.anchor.type === 'text'
  ) {
    anchorFormatOrStyleChanged = true;
  }

  if (focus.type === 'text') {
    nextFocusNode = getDOMTextNode(focusDOM);
  }

  // If we can't get an underlying text node for selection, then
  // we should avoid setting selection to something incorrect.
  if (nextAnchorNode === null || nextFocusNode === null) {
    return;
  }

  if (
    isCollapsed &&
    (prevSelection === null ||
      anchorFormatOrStyleChanged ||
      ($isRangeSelection(prevSelection) &&
        (prevSelection.format !== nextFormat ||
          prevSelection.style !== nextStyle)))
  ) {
    markCollapsedSelectionFormat(
      nextFormat,
      nextStyle,
      nextAnchorOffset,
      anchorKey,
      performance.now(),
    );
  }

  // Diff against the native DOM selection to ensure we don't do
  // an unnecessary selection update. We also skip this check if
  // we're moving selection to within an element, as this can
  // sometimes be problematic around scrolling.
  if (
    anchorOffset === nextAnchorOffset &&
    focusOffset === nextFocusOffset &&
    anchorDOMNode === nextAnchorNode &&
    focusDOMNode === nextFocusNode && // Badly interpreted range selection when collapsed - #1482
    !(domSelection.type === 'Range' && isCollapsed)
  ) {
    // If the root element does not have focus, ensure it has focus
    if (activeElement === null || !rootElement.contains(activeElement)) {
      rootElement.focus({
        preventScroll: true,
      });
    }
    if (anchor.type !== 'element') {
      return;
    }
  }

  // Apply the updated selection to the DOM. Note: this will trigger
  // a "selectionchange" event, although it will be asynchronous.
  try {
    domSelection.setBaseAndExtent(
      nextAnchorNode,
      nextAnchorOffset,
      nextFocusNode,
      nextFocusOffset,
    );
  } catch (error) {
    // If we encounter an error, continue. This can sometimes
    // occur with FF and there's no good reason as to why it
    // should happen.
  }
  if (
    !tags.has('skip-scroll-into-view') &&
    nextSelection.isCollapsed() &&
    rootElement !== null &&
    rootElement === document.activeElement
  ) {
    const selectionTarget: null | Range | HTMLElement | Text =
      nextSelection instanceof RangeSelection &&
      nextSelection.anchor.type === 'element'
        ? (nextAnchorNode.childNodes[nextAnchorOffset] as HTMLElement | Text) ||
          null
        : domSelection.rangeCount > 0
        ? domSelection.getRangeAt(0)
        : null;
    if (selectionTarget !== null) {
      let selectionRect: DOMRect;
      if (selectionTarget instanceof Text) {
        const range = document.createRange();
        range.selectNode(selectionTarget);
        selectionRect = range.getBoundingClientRect();
      } else {
        selectionRect = selectionTarget.getBoundingClientRect();
      }
      scrollIntoViewIfNeeded(editor, selectionRect, rootElement);
    }
  }

  markSelectionChangeFromDOMUpdate();
}

export function $insertNodes(
  nodes: Array<LexicalNode>,
  selectStart?: boolean,
): boolean {
  let selection = $getSelection() || $getPreviousSelection();

  if (selection === null) {
    selection = $getRoot().selectEnd();
  }
  return selection.insertNodes(nodes, selectStart);
}

export function $getTextContent(): string {
  const selection = $getSelection();
  if (selection === null) {
    return '';
  }
  return selection.getTextContent();
}

export function DEPRECATED_$computeGridMap(
  grid: DEPRECATED_GridNode,
  cellA: DEPRECATED_GridCellNode,
  cellB: DEPRECATED_GridCellNode,
): [GridMapType, GridMapValueType, GridMapValueType] {
  const tableMap: GridMapType = [];
  let cellAValue: null | GridMapValueType = null;
  let cellBValue: null | GridMapValueType = null;
  function write(
    startRow: number,
    startColumn: number,
    cell: DEPRECATED_GridCellNode,
  ) {
    const value = {
      cell,
      startColumn,
      startRow,
    };
    const rowSpan = cell.__rowSpan;
    const colSpan = cell.__colSpan;
    for (let i = 0; i < rowSpan; i++) {
      if (tableMap[startRow + i] === undefined) {
        tableMap[startRow + i] = [];
      }
      for (let j = 0; j < colSpan; j++) {
        tableMap[startRow + i][startColumn + j] = value;
      }
    }
    if (cellA.is(cell)) {
      cellAValue = value;
    }
    if (cellB.is(cell)) {
      cellBValue = value;
    }
  }
  function isEmpty(row: number, column: number) {
    return tableMap[row] === undefined || tableMap[row][column] === undefined;
  }

  const gridChildren = grid.getChildren();
  for (let i = 0; i < gridChildren.length; i++) {
    const row = gridChildren[i];
    invariant(
      DEPRECATED_$isGridRowNode(row),
      'Expected GridNode children to be GridRowNode',
    );
    const rowChildren = row.getChildren();
    let j = 0;
    for (const cell of rowChildren) {
      invariant(
        DEPRECATED_$isGridCellNode(cell),
        'Expected GridRowNode children to be GridCellNode',
      );
      while (!isEmpty(i, j)) {
        j++;
      }
      write(i, j, cell);
      j += cell.__colSpan;
    }
  }
  invariant(cellAValue !== null, 'Anchor not found in Grid');
  invariant(cellBValue !== null, 'Focus not found in Grid');
  return [tableMap, cellAValue, cellBValue];
}

export function DEPRECATED_$getNodeTriplet(
  source: PointType | LexicalNode | DEPRECATED_GridCellNode,
): [DEPRECATED_GridCellNode, DEPRECATED_GridRowNode, DEPRECATED_GridNode] {
  let cell: DEPRECATED_GridCellNode;
  if (source instanceof DEPRECATED_GridCellNode) {
    cell = source;
  } else if (source instanceof LexicalNode) {
    const cell_ = $findMatchingParent(source, DEPRECATED_$isGridCellNode);
    invariant(
      DEPRECATED_$isGridCellNode(cell_),
      'Expected to find a parent GridCellNode',
    );
    cell = cell_;
  } else {
    const cell_ = $findMatchingParent(
      source.getNode(),
      DEPRECATED_$isGridCellNode,
    );
    invariant(
      DEPRECATED_$isGridCellNode(cell_),
      'Expected to find a parent GridCellNode',
    );
    cell = cell_;
  }
  const row = cell.getParent();
  invariant(
    DEPRECATED_$isGridRowNode(row),
    'Expected GridCellNode to have a parent GridRowNode',
  );
  const grid = row.getParent();
  invariant(
    DEPRECATED_$isGridNode(grid),
    'Expected GridRowNode to have a parent GridNode',
  );
  return [cell, row, grid];
}
