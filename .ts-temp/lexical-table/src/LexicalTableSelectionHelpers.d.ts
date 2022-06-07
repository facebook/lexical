/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { TableNode } from './LexicalTableNode';
import type { Cell, Grid } from './LexicalTableSelection';
import type { GridSelection, LexicalEditor, LexicalNode, RangeSelection } from 'lexical';
import { TableSelection } from './LexicalTableSelection';
export declare function applyTableHandlers(tableNode: TableNode, tableElement: HTMLElement, editor: LexicalEditor): TableSelection;
export declare function attachTableSelectionToTableElement(tableElement: HTMLElement, tableSelection: TableSelection): void;
export declare function getTableSelectionFromTableElement(tableElement: HTMLElement): TableSelection;
export declare function getCellFromTarget(node: Node): Cell | null;
export declare function getTableGrid(tableElement: HTMLElement): Grid;
export declare function $updateDOMForSelection(grid: Grid, selection: GridSelection | RangeSelection | null): Array<Cell>;
export declare function $forEachGridCell(grid: Grid, cb: (cell: Cell, lexicalNode: LexicalNode, cords: {
    x: number;
    y: number;
}) => void): void;
export declare function $addHighlightStyleToTable(tableSelection: TableSelection): void;
export declare function $removeHighlightStyleToTable(tableSelection: TableSelection): void;
