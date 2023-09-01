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
declare const LEXICAL_ELEMENT_KEY = "__lexicalTableSelection";
export declare function applyTableHandlers(tableNode: TableNode, tableElement: HTMLTableElementWithWithTableSelectionState, editor: LexicalEditor, hasTabHandler: boolean): TableSelection;
export type HTMLTableElementWithWithTableSelectionState = HTMLTableElement & Record<typeof LEXICAL_ELEMENT_KEY, TableSelection>;
export declare function attachTableSelectionToTableElement(tableElement: HTMLTableElementWithWithTableSelectionState, tableSelection: TableSelection): void;
export declare function getTableSelectionFromTableElement(tableElement: HTMLTableElementWithWithTableSelectionState): TableSelection | null;
export declare function getCellFromTarget(node: Node): Cell | null;
export declare function doesTargetContainText(node: Node): boolean;
export declare function getTableGrid(tableElement: HTMLElement): Grid;
export declare function $updateDOMForSelection(editor: LexicalEditor, grid: Grid, selection: GridSelection | RangeSelection | null): void;
export declare function $forEachGridCell(grid: Grid, cb: (cell: Cell, lexicalNode: LexicalNode, cords: {
    x: number;
    y: number;
}) => void): void;
export declare function $addHighlightStyleToTable(editor: LexicalEditor, tableSelection: TableSelection): void;
export declare function $removeHighlightStyleToTable(editor: LexicalEditor, tableSelection: TableSelection): void;
export {};
