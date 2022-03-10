import type {
  EditorConfig,
  LexicalNode,
  NodeKey,
  ParagraphNode,
  RangeSelection,
  ElementNode,
  LexicalEditor,
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
    key?: NodeKey,
  );
  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement;
  updateDOM(prevNode: TableCellNode, dom: HTMLElement): boolean;
  insertNewAfter(
    selection: RangeSelection,
  ): null | ParagraphNode | TableCellNode;
  canInsertTab(): true;
  collapseAtStart(): true;
  getTag(): string;
  setHeaderState(headerState: TableCellHeaderState): TableCellHeaderState;
  getHeaderState(): TableCellHeaderState;
  toggleHeaderState(headerState: TableCellHeaderState): TableCellNode;
  hasHeader(): boolean;
  updateDOM(prevNode: TableCellNode): boolean;
  collapseAtStart(): true;
  canBeEmpty(): false;
}
export declare function $createTableCellNode(): TableCellNode;
export declare function $isTableCellNode(node?: LexicalNode): boolean;

/**
 * LexicalTableNode
 */

export declare class TableNode extends ElementNode {
  static getType(): string;
  static clone(node: TableNode): TableNode;
  constructor(selectionShape?: SelectionShape, grid?: Grid, key?: NodeKey);
  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement;
  updateDOM(prevNode: TableNode, dom: HTMLElement): boolean;
  insertNewAfter(selection: RangeSelection): null | ParagraphNode | TableNode;
  canInsertTab(): true;
  collapseAtStart(): true;
  setSelectionState(selectionShape?: SelectionShape): Array<Cell>;
  getSelectionState(): SelectionShape | null;
  getCordsFromCellNode(tableCellNode: TableCellNode): {x: number; y: number};
  getCellNodeFromCords(x: number, y: number): TableCellNode | null;
  getCellNodeFromCordsOrThrow(x: number, y: number): TableCellNode;
  setGrid(grid?: Grid): TableNode;
  getGrid(): Grid | null;
  canSelectBefore(): true;
}
declare function $createTableNode(): TableNode;
declare function $isTableNode(node?: LexicalNode): boolean;

/**
 * LexicalTableRowNode
 */

declare class TableRowNode extends ElementNode {
  static getType(): string;
  static clone(node: TableRowNode): TableRowNode;
  constructor(key?: NodeKey);
  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement;
  updateDOM(prevNode: TableRowNode, dom: HTMLElement): boolean;
  insertNewAfter(
    selection: RangeSelection,
  ): null | ParagraphNode | TableRowNode;
  canInsertTab(): true;
  collapseAtStart(): true;
}
declare function $createTableRowNode(): TableRowNode;
declare function $isTableRowNode(node?: LexicalNode): boolean;

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

export type SelectionShape = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
};

declare function applyTableHandlers(
  tableNode: TableNode,
  tableElement: HTMLElement,
  editor: LexicalEditor,
): TableSelection;

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
declare class TableSelection {
  currentX: number;
  currentY: number;
  listenersToRemove: Set<() => void>;
  domListeners: Set<() => void>;
  grid: Grid;
  highlightedCells: Array<Cell>;
  isHighlightingCells: boolean;
  isSelecting: boolean;
  startX: number;
  startY: number;
  nodeKey: string;
  editor: LexicalEditor;
  constructor(editor: LexicalEditor, nodeKey: string): void;
  getGrid(): Grid;
  hasHighlightedCells(): boolean;
  removeListeners(): void;
  trackTableGrid(): void;
  clearHighlight(): void;
  addCellToSelection(cell: Cell): void;
  startSelecting(cell: Cell): void;
  formatCells(type: TextFormatType): void;
  clearText(): void;
}
