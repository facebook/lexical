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
import {$Values} from 'utility-types';

export enum TableCellHeaderStates {
  NO_STATUS = 0,
  ROW = 1,
  COLUMN = 2,
  BOTH = 3,
}

/**
 * LexicalTableCellNode
 */

export declare class TableCellNode extends ElementNode {
  static getType(): string;
  static clone(node: TableCellNode): TableCellNode;
  constructor(
    headerState?: TableCellHeaderStates,
    colSpan?: number,
    width?: number | null | undefined,
    key?: NodeKey,
  );
  __headerState: TableCellHeaderStates;
  createDOM(config: EditorConfig): HTMLElement;
  updateDOM(prevNode: TableCellNode, dom: HTMLElement): boolean;
  insertNewAfter(
    selection: RangeSelection,
  ): null | ParagraphNode | TableCellNode;
  collapseAtStart(): true;
  getTag(): string;
  setHeaderState(headerState: TableCellHeaderStates): TableCellHeaderStates;
  getHeaderState(): TableCellHeaderStates;
  toggleHeaderState(headerState: TableCellHeaderStates): TableCellNode;
  hasHeader(): boolean;
  setWidth(width: number): number | null | undefined;
  getWidth(): number | null | undefined;
  toggleHeaderStyle(headerState: TableCellHeaderStates): TableCellNode;
  updateDOM(prevNode: TableCellNode): boolean;
  collapseAtStart(): true;
  canBeEmpty(): false;
}
declare function $createTableCellNode(
  headerState: TableCellHeaderStates,
  colSpan?: number,
  width?: number | null | undefined,
): TableCellNode;
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
  getCellFromCords(x: number, y: number, grid: Grid): Cell | null | undefined;
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
  constructor(key?: NodeKey, height?: number | null | undefined);
  createDOM(config: EditorConfig): HTMLElement;
  updateDOM(prevNode: TableRowNode, dom: HTMLElement): boolean;
  insertNewAfter(
    selection: RangeSelection,
  ): null | ParagraphNode | TableRowNode;
  setHeight(height: number): number | null | undefined;
  getHeight(): number | null | undefined;
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
