/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  GridSelection,
  LexicalEditor,
  NodeKey,
  TextFormatType,
} from 'lexical';

import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isElementNode,
  $setSelection,
  DEPRECATED_$createGridSelection,
  DEPRECATED_$isGridSelection,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import {CAN_USE_DOM} from 'shared/canUseDOM';
import invariant from 'shared/invariant';

import {$isTableCellNode} from './LexicalTableCellNode';
import {$isTableNode} from './LexicalTableNode';
import {
  $updateDOMForSelection,
  getTableGrid,
} from './LexicalTableSelectionHelpers';

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

const getDOMSelection = (targetWindow: Window | null): Selection | null =>
  CAN_USE_DOM ? (targetWindow || window).getSelection() : null;

if (CAN_USE_DOM) {
  const disableNativeSelectionUi = document.createElement('style');
  disableNativeSelectionUi.innerHTML = `
    table.disable-selection {
      -webkit-touch-callout: none;
      -webkit-user-select: none; 
      -khtml-user-select: none; 
      -moz-user-select: none; 
      -ms-user-select: none; 
      user-select: none;
    }
  
    .disable-selection span::selection{
      background-color: transparent;
    }
    .disable-selection br::selection{
      background-color: transparent;
    }
  `;

  if (document.body) {
    document.body.append(disableNativeSelectionUi);
  }
}

export class TableSelection {
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

  constructor(editor: LexicalEditor, tableNodeKey: string) {
    this.isHighlightingCells = false;
    this.anchorX = -1;
    this.anchorY = -1;
    this.focusX = -1;
    this.focusY = -1;
    this.listenersToRemove = new Set();
    this.tableNodeKey = tableNodeKey;
    this.editor = editor;
    this.grid = {
      cells: [],
      columns: 0,
      rows: 0,
    };
    this.gridSelection = null;
    this.anchorCellNodeKey = null;
    this.focusCellNodeKey = null;
    this.anchorCell = null;
    this.focusCell = null;
    this.hasHijackedSelectionStyles = false;
    this.trackTableGrid();
  }

  getGrid(): Grid {
    return this.grid;
  }

  removeListeners() {
    Array.from(this.listenersToRemove).forEach((removeListener) =>
      removeListener(),
    );
  }

  trackTableGrid() {
    const observer = new MutationObserver((records) => {
      this.editor.update(() => {
        let gridNeedsRedraw = false;

        for (let i = 0; i < records.length; i++) {
          const record = records[i];
          const target = record.target;
          const nodeName = target.nodeName;

          if (nodeName === 'TABLE' || nodeName === 'TR') {
            gridNeedsRedraw = true;
            break;
          }
        }

        if (!gridNeedsRedraw) {
          return;
        }

        const tableElement = this.editor.getElementByKey(this.tableNodeKey);

        if (!tableElement) {
          throw new Error('Expected to find TableElement in DOM');
        }

        this.grid = getTableGrid(tableElement);
      });
    });
    this.editor.update(() => {
      const tableElement = this.editor.getElementByKey(this.tableNodeKey);

      if (!tableElement) {
        throw new Error('Expected to find TableElement in DOM');
      }

      this.grid = getTableGrid(tableElement);
      observer.observe(tableElement, {
        childList: true,
        subtree: true,
      });
    });
  }

  clearHighlight() {
    this.isHighlightingCells = false;
    this.anchorX = -1;
    this.anchorY = -1;
    this.focusX = -1;
    this.focusY = -1;
    this.gridSelection = null;
    this.anchorCellNodeKey = null;
    this.focusCellNodeKey = null;
    this.anchorCell = null;
    this.focusCell = null;
    this.hasHijackedSelectionStyles = false;

    this.enableHighlightStyle();

    this.editor.update(() => {
      const tableNode = $getNodeByKey(this.tableNodeKey);

      if (!$isTableNode(tableNode)) {
        throw new Error('Expected TableNode.');
      }

      const tableElement = this.editor.getElementByKey(this.tableNodeKey);

      if (!tableElement) {
        throw new Error('Expected to find TableElement in DOM');
      }

      const grid = getTableGrid(tableElement);
      $updateDOMForSelection(grid, null);
      $setSelection(null);
      this.editor.dispatchCommand(SELECTION_CHANGE_COMMAND, undefined);
    });
  }

  enableHighlightStyle() {
    this.editor.update(() => {
      const tableElement = this.editor.getElementByKey(this.tableNodeKey);

      if (!tableElement) {
        throw new Error('Expected to find TableElement in DOM');
      }

      tableElement.classList.remove('disable-selection');
      this.hasHijackedSelectionStyles = false;
    });
  }

  disableHighlightStyle() {
    this.editor.update(() => {
      const tableElement = this.editor.getElementByKey(this.tableNodeKey);

      if (!tableElement) {
        throw new Error('Expected to find TableElement in DOM');
      }

      tableElement.classList.add('disable-selection');
      this.hasHijackedSelectionStyles = true;
    });
  }

  updateTableGridSelection(selection: GridSelection | null) {
    if (selection != null && selection.gridKey === this.tableNodeKey) {
      this.gridSelection = selection;
      this.isHighlightingCells = true;
      this.disableHighlightStyle();
      $updateDOMForSelection(this.grid, this.gridSelection);
    } else if (selection == null) {
      this.clearHighlight();
    }
  }

  setFocusCellForSelection(cell: Cell, ignoreStart = false) {
    this.editor.update(() => {
      const tableNode = $getNodeByKey(this.tableNodeKey);

      if (!$isTableNode(tableNode)) {
        throw new Error('Expected TableNode.');
      }

      const tableElement = this.editor.getElementByKey(this.tableNodeKey);

      if (!tableElement) {
        throw new Error('Expected to find TableElement in DOM');
      }

      const cellX = cell.x;
      const cellY = cell.y;
      this.focusCell = cell;

      if (this.anchorCell !== null) {
        const domSelection = getDOMSelection(this.editor._window);
        // Collapse the selection
        if (domSelection) {
          domSelection.setBaseAndExtent(
            this.anchorCell.elem,
            0,
            this.focusCell.elem,
            0,
          );
        }
      }

      if (
        !this.isHighlightingCells &&
        (this.anchorX !== cellX || this.anchorY !== cellY || ignoreStart)
      ) {
        this.isHighlightingCells = true;
        this.disableHighlightStyle();
      } else if (cellX === this.focusX && cellY === this.focusY) {
        return;
      }

      this.focusX = cellX;
      this.focusY = cellY;

      if (this.isHighlightingCells) {
        const focusTableCellNode = $getNearestNodeFromDOMNode(cell.elem);

        if (
          this.gridSelection != null &&
          this.anchorCellNodeKey != null &&
          $isTableCellNode(focusTableCellNode)
        ) {
          const focusNodeKey = focusTableCellNode.getKey();

          this.gridSelection =
            this.gridSelection.clone() || DEPRECATED_$createGridSelection();

          this.focusCellNodeKey = focusNodeKey;
          this.gridSelection.set(
            this.tableNodeKey,
            this.anchorCellNodeKey,
            this.focusCellNodeKey,
          );

          $setSelection(this.gridSelection);

          this.editor.dispatchCommand(SELECTION_CHANGE_COMMAND, undefined);

          $updateDOMForSelection(this.grid, this.gridSelection);
        }
      }
    });
  }

  setAnchorCellForSelection(cell: Cell) {
    this.isHighlightingCells = false;
    this.anchorCell = cell;
    this.anchorX = cell.x;
    this.anchorY = cell.y;

    this.editor.update(() => {
      const anchorTableCellNode = $getNearestNodeFromDOMNode(cell.elem);

      if ($isTableCellNode(anchorTableCellNode)) {
        const anchorNodeKey = anchorTableCellNode.getKey();
        this.gridSelection = DEPRECATED_$createGridSelection();
        this.anchorCellNodeKey = anchorNodeKey;
      }
    });
  }

  formatCells(type: TextFormatType) {
    this.editor.update(() => {
      const selection = $getSelection();

      if (!DEPRECATED_$isGridSelection(selection)) {
        invariant(false, 'Expected grid selection');
      }

      const formatSelection = $createRangeSelection();

      const anchor = formatSelection.anchor;
      const focus = formatSelection.focus;

      selection.getNodes().forEach((cellNode) => {
        if ($isTableCellNode(cellNode) && cellNode.getTextContentSize() !== 0) {
          anchor.set(cellNode.getKey(), 0, 'element');
          focus.set(cellNode.getKey(), cellNode.getChildrenSize(), 'element');
          formatSelection.formatText(type);
        }
      });

      $setSelection(selection);

      this.editor.dispatchCommand(SELECTION_CHANGE_COMMAND, undefined);
    });
  }

  clearText() {
    this.editor.update(() => {
      const tableNode = $getNodeByKey(this.tableNodeKey);

      if (!$isTableNode(tableNode)) {
        throw new Error('Expected TableNode.');
      }

      const selection = $getSelection();

      if (!DEPRECATED_$isGridSelection(selection)) {
        invariant(false, 'Expected grid selection');
      }

      const selectedNodes = selection.getNodes().filter($isTableCellNode);

      if (selectedNodes.length === this.grid.columns * this.grid.rows) {
        tableNode.selectPrevious();
        // Delete entire table
        tableNode.remove();
        const rootNode = $getRoot();
        rootNode.selectStart();
        return;
      }

      selectedNodes.forEach((cellNode) => {
        if ($isElementNode(cellNode)) {
          const paragraphNode = $createParagraphNode();
          const textNode = $createTextNode();
          paragraphNode.append(textNode);
          cellNode.append(paragraphNode);
          cellNode.getChildren().forEach((child) => {
            if (child !== paragraphNode) {
              child.remove();
            }
          });
        }
      });

      $updateDOMForSelection(this.grid, null);

      $setSelection(null);

      this.editor.dispatchCommand(SELECTION_CHANGE_COMMAND, undefined);
    });
  }
}
