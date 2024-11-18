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
  $isElementNode,
  $isParagraphNode,
  $normalizeSelection__EXPERIMENTAL,
  BaseSelection,
  ElementNode,
  isCurrentlyReadOnlyMode,
  LexicalNode,
  NodeKey,
  PointType,
  TEXT_TYPE_TO_FORMAT,
  TextFormatType,
  TextNode,
} from 'lexical';
import invariant from 'shared/invariant';

import {$isTableCellNode, TableCellNode} from './LexicalTableCellNode';
import {$isTableNode, TableNode} from './LexicalTableNode';
import {$isTableRowNode, TableRowNode} from './LexicalTableRowNode';
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

function $getCellNodes(tableSelection: TableSelection): {
  anchorCell: TableCellNode;
  anchorNode: TextNode | ElementNode;
  anchorRow: TableRowNode;
  anchorTable: TableNode;
  focusCell: TableCellNode;
  focusNode: TextNode | ElementNode;
  focusRow: TableRowNode;
  focusTable: TableNode;
} {
  const [
    [anchorNode, anchorCell, anchorRow, anchorTable],
    [focusNode, focusCell, focusRow, focusTable],
  ] = (['anchor', 'focus'] as const).map(
    (k): [ElementNode | TextNode, TableCellNode, TableRowNode, TableNode] => {
      const node = tableSelection[k].getNode();
      const cellNode = $findMatchingParent(node, $isTableCellNode);
      invariant(
        $isTableCellNode(cellNode),
        'Expected TableSelection %s to be (or a child of) TableCellNode, got key %s of type %s',
        k,
        node.getKey(),
        node.getType(),
      );
      const rowNode = cellNode.getParent();
      invariant(
        $isTableRowNode(rowNode),
        'Expected TableSelection %s cell parent to be a TableRowNode',
        k,
      );
      const tableNode = rowNode.getParent();
      invariant(
        $isTableNode(tableNode),
        'Expected TableSelection %s row parent to be a TableNode',
        k,
      );
      return [node, cellNode, rowNode, tableNode];
    },
  );
  // TODO: nested tables may violate this
  invariant(
    anchorTable.is(focusTable),
    'Expected TableSelection anchor and focus to be in the same table',
  );
  return {
    anchorCell,
    anchorNode,
    anchorRow,
    anchorTable,
    focusCell,
    focusNode,
    focusRow,
    focusTable,
  };
}

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
   * {@link $createTableSelection} unfortunately makes it very easy to create
   * nonsense selections, so we have a method to see if the selection probably
   * makes sense.
   *
   * @returns true if the TableSelection is (probably) valid
   */
  isValid(): boolean {
    return (
      this.tableKey !== 'root' &&
      this.anchor.key !== 'root' &&
      this.anchor.type === 'element' &&
      this.focus.key !== 'root' &&
      this.focus.type === 'element'
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

  /**
   * Returns whether the provided TextFormatType is present on the Selection.
   * This will be true if any paragraph in table cells has the specified format.
   *
   * @param type the TextFormatType to check for.
   * @returns true if the provided format is currently toggled on on the Selection, false otherwise.
   */
  hasFormat(type: TextFormatType): boolean {
    let format = 0;

    const cellNodes = this.getNodes().filter($isTableCellNode);
    cellNodes.forEach((cellNode: TableCellNode) => {
      const paragraph = cellNode.getFirstChild();
      if ($isParagraphNode(paragraph)) {
        format |= paragraph.getTextFormat();
      }
    });

    const formatFlag = TEXT_TYPE_TO_FORMAT[type];
    return (format & formatFlag) !== 0;
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
    const {anchorCell, focusCell} = $getCellNodes(this);
    const anchorCellNodeRect = $getTableCellNodeRect(anchorCell);
    invariant(
      anchorCellNodeRect !== null,
      'getCellRect: expected to find AnchorNode',
    );
    const focusCellNodeRect = $getTableCellNodeRect(focusCell);
    invariant(
      focusCellNodeRect !== null,
      'getCellRect: expected to find focusCellNode',
    );

    const startX = Math.min(
      anchorCellNodeRect.columnIndex,
      focusCellNodeRect.columnIndex,
    );
    const stopX = Math.max(
      anchorCellNodeRect.columnIndex + anchorCellNodeRect.colSpan - 1,
      focusCellNodeRect.columnIndex + focusCellNodeRect.colSpan - 1,
    );

    const startY = Math.min(
      anchorCellNodeRect.rowIndex,
      focusCellNodeRect.rowIndex,
    );
    const stopY = Math.max(
      anchorCellNodeRect.rowIndex + anchorCellNodeRect.rowSpan - 1,
      focusCellNodeRect.rowIndex + focusCellNodeRect.rowSpan - 1,
    );

    return {
      fromX: Math.min(startX, stopX),
      fromY: Math.min(startY, stopY),
      toX: Math.max(startX, stopX),
      toY: Math.max(startY, stopY),
    };
  }

  getNodes(): Array<LexicalNode> {
    if (!this.isValid()) {
      return [];
    }
    const cachedNodes = this._cachedNodes;
    if (cachedNodes !== null) {
      return cachedNodes;
    }

    const {anchorTable: tableNode, anchorCell, focusCell} = $getCellNodes(this);

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

    // We use a Map here because merged cells in the grid would otherwise
    // show up multiple times in the nodes array
    const nodeMap: Map<NodeKey, LexicalNode> = new Map([
      [tableNode.getKey(), tableNode],
    ]);
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
          nodeMap.set(currentRow.getKey(), currentRow);
        }
        nodeMap.set(cell.getKey(), cell);
        for (const child of $getChildrenRecursively(cell)) {
          nodeMap.set(child.getKey(), child);
        }
        lastRow = currentRow;
      }
    }
    const nodes = Array.from(nodeMap.values());

    if (!isCurrentlyReadOnlyMode()) {
      this._cachedNodes = nodes;
    }
    return nodes;
  }

  getTextContent(): string {
    const nodes = this.getNodes().filter((node) => $isTableCellNode(node));
    let textContent = '';
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const row = node.__parent;
      const nextRow = (nodes[i + 1] || {}).__parent;
      textContent += node.getTextContent() + (nextRow !== row ? '\n' : '\t');
    }
    return textContent;
  }
}

export function $isTableSelection(x: unknown): x is TableSelection {
  return x instanceof TableSelection;
}

export function $createTableSelection(): TableSelection {
  // TODO this is a suboptimal design, it doesn't make sense to have
  // a table selection that isn't associated with a table. This
  // constructor should have required argumnets and in __DEV__ we
  // should check that they point to a table and are element points to
  // cell nodes of that table.
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
