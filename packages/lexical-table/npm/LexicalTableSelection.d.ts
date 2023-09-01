/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { GridSelection, LexicalEditor, NodeKey, TextFormatType } from 'lexical';
export type Cell = {
    elem: HTMLElement;
    highlighted: boolean;
    hasBackgroundColor: boolean;
    x: number;
    y: number;
};
export type Cells = Array<Array<Cell | undefined> | undefined>;
export type Grid = {
    cells: Cells;
    columns: number;
    rows: number;
};
export declare class TableSelection {
    focusX: number;
    focusY: number;
    listenersToRemove: Set<() => void>;
    grid: Grid;
    isHighlightingCells: boolean;
    anchorX: number;
    anchorY: number;
    tableNodeKey: NodeKey;
    anchorCell: Cell | null;
    focusCell: Cell | null;
    anchorCellNodeKey: NodeKey | null;
    focusCellNodeKey: NodeKey | null;
    editor: LexicalEditor;
    gridSelection: GridSelection | null;
    hasHijackedSelectionStyles: boolean;
    constructor(editor: LexicalEditor, tableNodeKey: string);
    getGrid(): Grid;
    removeListeners(): void;
    trackTableGrid(): void;
    clearHighlight(): void;
    enableHighlightStyle(): void;
    disableHighlightStyle(): void;
    updateTableGridSelection(selection: GridSelection | null): void;
    setFocusCellForSelection(cell: Cell, ignoreStart?: boolean): void;
    setAnchorCellForSelection(cell: Cell): void;
    formatCells(type: TextFormatType): void;
    clearText(): void;
}
