/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  GridSelection,
  LexicalEditor,
  NodeKey,
  TextFormatType,
} from 'lexical';

import {
  $createGridSelection,
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $getSelection,
  $isElementNode,
  $isGridSelection,
  $setSelection,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import getDOMSelection from 'shared/getDOMSelection';
import invariant from 'shared/invariant';

import {$isTableCellNode} from './LexicalTableCellNode';
import {$isTableNode} from './LexicalTableNode';
import {
  $updateDOMForSelection,
  getTableGrid,
} from './LexicalTableSelectionHelpers';

export type Cell = {
  elem: HTMLElement,
  highlighted: boolean,
  x: number,
  y: number,
};

export type Cells = Array<Array<Cell>>;

export type Grid = {
  cells: Cells,
  columns: number,
  rows: number,
};

let removeHighlightStyle;

function createSelectionStyleReset() {
  removeHighlightStyle = document.createElement('style');
  removeHighlightStyle.appendChild(
    document.createTextNode('::selection{background-color: transparent}'),
  );
}

function removeSelectionStyleReset() {
  const parent = removeHighlightStyle
    ? removeHighlightStyle.parentNode
    : undefined;
  if (parent != null) {
    parent.removeChild(removeHighlightStyle);
  }
}

export class TableSelection {
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

  constructor(editor: LexicalEditor, tableNodeKey: string) {
    this.isHighlightingCells = false;
    this.startX = -1;
    this.startY = -1;
    this.currentX = -1;
    this.currentY = -1;
    this.listenersToRemove = new Set();
    this.tableNodeKey = tableNodeKey;
    this.editor = editor;
    this.grid = {cells: [], columns: 0, rows: 0};
    this.gridSelection = null;
    this.anchorCellNodeKey = null;
    this.focusCellNodeKey = null;
    this.anchorCell = null;
    this.focusCell = null;

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

      this.isHighlightingCells = false;
      this.startX = -1;
      this.startY = -1;
      this.currentX = -1;
      this.currentY = -1;
      this.gridSelection = null;
      this.anchorCellNodeKey = null;
      this.focusCellNodeKey = null;
      this.anchorCell = null;
      this.focusCell = null;

      $updateDOMForSelection(grid, null);
      $setSelection(null);
      this.editor.dispatchCommand(SELECTION_CHANGE_COMMAND);

      removeSelectionStyleReset();
    });
  }

  adjustFocusCellForSelection(cell: Cell, ignoreStart?: boolean = false) {
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

      const domSelection = getDOMSelection();

      if (this.anchorCell !== null) {
        // Collapse the selection
        domSelection.setBaseAndExtent(this.anchorCell.elem, 0, cell.elem, 0);
      }

      if (
        !this.isHighlightingCells &&
        (this.startX !== cellX || this.startY !== cellY || ignoreStart)
      ) {
        this.isHighlightingCells = true;
        if (document.body) {
          if (removeHighlightStyle === undefined) {
            createSelectionStyleReset();
          }
          document.body.appendChild(removeHighlightStyle);
        }
      } else if (cellX === this.currentX && cellY === this.currentY) {
        return;
      }
      this.currentX = cellX;
      this.currentY = cellY;

      if (this.isHighlightingCells) {
        const focusTableCellNode = $getNearestNodeFromDOMNode(cell.elem);

        if (
          this.gridSelection != null &&
          this.anchorCellNodeKey != null &&
          $isTableCellNode(focusTableCellNode)
        ) {
          const focusNodeKey = focusTableCellNode.getKey();
          this.gridSelection = $createGridSelection();
          this.focusCellNodeKey = focusNodeKey;

          this.gridSelection.set(
            this.tableNodeKey,
            // $FlowFixMe This is not null, as you can see in the statement above.
            this.anchorCellNodeKey,
            this.focusCellNodeKey,
          );

          $setSelection(this.gridSelection);
          this.editor.dispatchCommand(SELECTION_CHANGE_COMMAND);
          $updateDOMForSelection(this.grid, this.gridSelection);
        }
      }
    });
  }

  setAnchorCellForSelection(cell: Cell) {
    this.editor.update(() => {
      this.anchorCell = cell;
      this.startX = cell.x;
      this.startY = cell.y;

      const domSelection = getDOMSelection();
      domSelection.setBaseAndExtent(cell.elem, 0, cell.elem, 0);

      const anchorTableCellNode = $getNearestNodeFromDOMNode(cell.elem);

      if ($isTableCellNode(anchorTableCellNode)) {
        const anchorNodeKey = anchorTableCellNode.getKey();
        this.gridSelection = $createGridSelection();
        this.anchorCellNodeKey = anchorNodeKey;
      }
    });
  }

  formatCells(type: TextFormatType) {
    this.editor.update(() => {
      const selection = $getSelection();
      if (!$isGridSelection(selection)) {
        invariant(false, 'Expected grid selection');
      }

      // This is to make Flow play ball.
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
      this.editor.dispatchCommand(SELECTION_CHANGE_COMMAND);
    });
  }

  clearText() {
    this.editor.update(() => {
      const tableNode = $getNodeByKey(this.tableNodeKey);
      if (!$isTableNode(tableNode)) {
        throw new Error('Expected TableNode.');
      }

      const selection = $getSelection();

      if (!$isGridSelection(selection)) {
        invariant(false, 'Expected grid selection');
      }

      const selectedNodes = selection.getNodes().filter($isTableCellNode);

      if (selectedNodes.length === this.grid.columns * this.grid.rows) {
        tableNode.selectPrevious();
        // Delete entire table
        tableNode.remove();
        this.clearHighlight();
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
      this.editor.dispatchCommand(SELECTION_CHANGE_COMMAND);
    });
  }
}
