/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { GridSelection, LexicalEditor, NodeKey, TextFormatType } from 'lexical';
export declare type Cell = {
    elem: HTMLElement;
    highlighted: boolean;
    x: number;
    y: number;
};
export declare type Cells = Array<Array<Cell>>;
export declare type Grid = {
    cells: Cells;
    columns: number;
    rows: number;
};
export declare class TableSelection {
    currentX: number;
    currentY: number;
    listenersToRemove: Set<() => void>;
    domListeners: Set<() => void>;
    grid: Grid;
    isHighlightingCells: boolean;
    startX: number;
    startY: number;
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
    adjustFocusCellForSelection(cell: Cell, ignoreStart?: boolean): void;
    setAnchorCellForSelection(cell: Cell): void;
    formatCells(type: TextFormatType): void;
    clearText(): void;
}
