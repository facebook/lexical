/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import type {
  EditorConfig,
  LexicalNode,
  NodeKey,
  ParagraphNode,
  RangeSelection,
  ElementNode,
  LexicalEditor,
  TextFormatType,
  LexicalCommand,
} from 'lexical';
import {TableSelection} from './src/TableSelection';

export enum TableCellHeaderState {
  NO_STATUS = 0,
  ROW = 1,
  COLUMN = 2,
  BOTH = 3,
}

/**
 * LexicalTableCellNode
 */

export const TableCellHeaderStates = {
  NO_STATUS: 0,
  ROW: 1,
  COLUMN: 2,
  BOTH: 3,
};

export type TableCellHeaderState = $Values<typeof TableCellHeaderStates>;

export declare class TableCellNode extends ElementNode {
  static getType(): string;
  static clone(node: TableCellNode): TableCellNode;
  constructor(
    headerState?: TableCellHeaderState,
    colSpan?: number,
    width?: ?number,
    key?: NodeKey,
  );
  __headerState: TableCellHeaderState;
  createDOM(config: EditorConfig): HTMLElement;
  updateDOM(prevNode: TableCellNode, dom: HTMLElement): boolean;
  insertNewAfter(
    selection: RangeSelection,
  ): null | ParagraphNode | TableCellNode;
  collapseAtStart(): true;
  getTag(): string;
  setHeaderState(headerState: TableCellHeaderState): TableCellHeaderState;
  getHeaderState(): TableCellHeaderState;
  toggleHeaderState(headerState: TableCellHeaderState): TableCellNode;
  hasHeader(): boolean;
  setWidth(width: number): ?number;
  getWidth(): ?number;
  toggleHeaderStyle(headerState: TableCellHeaderState): TableCellNode;
  updateDOM(prevNode: TableCellNode): boolean;
  collapseAtStart(): true;
  canBeEmpty(): false;
}
export declare function $createTableCellNode(): TableCellNode;
export declare function $isTableCellNode(
  node?: LexicalNode,
): node is TableCellNode;

/**
 * LexicalTableNode
 */

export declare class TableNode extends ElementNode {
  static getType(): string;
  static clone(node: TableNode): TableNode;
  constructor(grid?: Grid, key?: NodeKey);
  createDOM(config: EditorConfig): HTMLElement;
  updateDOM(prevNode: TableNode, dom: HTMLElement): boolean;
  insertNewAfter(selection: RangeSelection): null | ParagraphNode | TableNode;
  collapseAtStart(): true;
  getCordsFromCellNode(tableCellNode: TableCellNode): {x: number; y: number};
  getCellFromCords(x: number, y: number, grid: Grid): ?Cell;
  getCellFromCordsOrThrow(x: number, y: number, grid: Grid): Cell;
  getCellNodeFromCords(x: number, y: number): TableCellNode | null;
  getCellNodeFromCordsOrThrow(x: number, y: number): TableCellNode;
  setGrid(grid?: Grid): TableNode;
  getGrid(): Grid | null;
  canSelectBefore(): true;
}
declare function $createTableNode(): TableNode;
declare function $isTableNode(node?: LexicalNode): node is TableNode;

/**
 * LexicalTableRowNode
 */

declare class TableRowNode extends ElementNode {
  static getType(): string;
  static clone(node: TableRowNode): TableRowNode;
  constructor(key?: NodeKey, height?: ?number);
  createDOM(config: EditorConfig): HTMLElement;
  updateDOM(prevNode: TableRowNode, dom: HTMLElement): boolean;
  insertNewAfter(
    selection: RangeSelection,
  ): null | ParagraphNode | TableRowNode;
  setHeight(height: number): ?number;
  getHeight(): ?number;
  collapseAtStart(): true;
}
declare function $createTableRowNode(): TableRowNode;
declare function $isTableRowNode(node?: LexicalNode): node is TableRowNode;

/**
 * LexicalTableSelectionHelpers
 */

export type Cell = {
  elem: HTMLElement;
  highlighted: boolean;
  x: number;
  y: number;
};

export type Cells = Array<Array<Cell>>;

export type Grid = {
  cells: Cells;
  columns: number;
  rows: number;
};

declare function applyTableHandlers(
  tableNode: TableNode,
  tableElement: HTMLElement,
  editor: LexicalEditor,
): TableSelection;

declare function $getElementGridForTableNode(
  editor: LexicalEditor,
  tableNode: TableNode,
): Grid;

declare function getTableSelectionFromTableElement(
  tableElement: HTMLElement,
): TableSelection;

declare function getCellFromTarget(node: Node): Cell | null;

/**
 * LexicalTableUtils
 */

declare function $createTableNodeWithDimensions(
  rowCount: number,
  columnCount: number,
  includeHeaders?: boolean,
): TableNode;

declare function $getTableCellNodeFromLexicalNode(
  startingNode: LexicalNode,
): TableCellNode | null;

declare function $getTableRowNodeFromTableCellNodeOrThrow(
  startingNode: LexicalNode,
): TableRowNode;

declare function $getTableNodeFromLexicalNodeOrThrow(
  startingNode: LexicalNode,
): TableNode;

declare function $getTableRowIndexFromTableCellNode(
  tableCellNode: TableCellNode,
): number;

declare function $getTableColumnIndexFromTableCellNode(
  tableCellNode: TableCellNode,
): number;

declare function $removeTableRowAtIndex(
  tableNode: TableNode,
  indexToDelete: number,
): TableNode;

declare function $insertTableRow(
  tableNode: TableNode,
  targetIndex: number,
  shouldInsertAfter: boolean,
  rowCount: number,
  grid: Grid,
): TableNode;

declare function $insertTableColumn(
  tableNode: TableNode,
  targetIndex: number,
  shouldInsertAfter: boolean,
  columnCount: number,
): TableNode;

declare function $deleteTableColumn(
  tableNode: TableNode,
  targetIndex: number,
): TableNode;

/**
 * LexicalTableSelection.js
 */
export declare class TableSelection {
  currentX: number;
  currentY: number;
  listenersToRemove: Set<() => void>;
  domListeners: Set<() => void>;
  grid: Grid;
  isHighlightingCells: boolean;
  isMouseDown: boolean;
  startX: number;
  startY: number;
  nodeKey: string;
  editor: LexicalEditor;
  constructor(editor: LexicalEditor, nodeKey: string);
  getGrid(): Grid;
  removeListeners(): void;
  trackTableGrid(): void;
  clearHighlight(): void;
  adjustFocusCellForSelection(cell: Cell): void;
  setAnchorCellForSelection(cell: Cell): void;
  formatCells(type: TextFormatType): void;
  clearText(): void;
}

export var INSERT_TABLE_COMMAND: LexicalCommand<{
  rows: string;
  columns: string;
}>;
