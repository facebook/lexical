/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalEditor, TextFormatType} from 'lexical';

import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $setSelection,
} from 'lexical';
import getDOMSelection from 'shared/getDOMSelection';

import {$isTableNode} from './LexicalTableNode';
import {getTableGrid} from './LexicalTableSelectionHelpers';

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

export type SelectionShape = {
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
};

const removeHighlightStyle = document.createElement('style');

removeHighlightStyle.appendChild(
  document.createTextNode('::selection{background-color: transparent}'),
);

export class TableSelection {
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

  constructor(editor: LexicalEditor, nodeKey: string) {
    this.isSelecting = false;
    this.isHighlightingCells = false;
    this.startX = -1;
    this.startY = -1;
    this.currentX = -1;
    this.currentY = -1;
    this.highlightedCells = [];
    this.listenersToRemove = new Set();
    this.nodeKey = nodeKey;
    this.editor = editor;
    this.grid = {cells: [], columns: 0, rows: 0};

    this.trackTableGrid();
  }

  getGrid(): Grid {
    return this.grid;
  }

  hasHighlightedCells(): boolean {
    return this.highlightedCells.length > 0;
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

        const tableElement = this.editor.getElementByKey(this.nodeKey);
        if (!tableElement) {
          throw new Error('Expected to find TableElement in DOM');
        }
        this.grid = getTableGrid(tableElement);
      });
    });

    this.editor.update(() => {
      const tableElement = this.editor.getElementByKey(this.nodeKey);
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
      const tableNode = $getNodeByKey(this.nodeKey);
      if (!$isTableNode(tableNode)) {
        throw new Error('Expected TableNode.');
      }

      const tableElement = this.editor.getElementByKey(this.nodeKey);
      if (!tableElement) {
        throw new Error('Expected to find TableElement in DOM');
      }

      const grid = getTableGrid(tableElement);

      this.isHighlightingCells = false;
      this.isSelecting = false;
      this.startX = -1;
      this.startY = -1;
      this.currentX = -1;
      this.currentY = -1;

      tableNode.setSelectionState(null, grid);

      this.highlightedCells = [];

      const parent = removeHighlightStyle.parentNode;
      if (parent != null) {
        parent.removeChild(removeHighlightStyle);
      }
    });
  }

  addCellToSelection(cell: Cell) {
    this.editor.update(() => {
      const tableNode = $getNodeByKey(this.nodeKey);
      if (!$isTableNode(tableNode)) {
        throw new Error('Expected TableNode.');
      }

      const tableElement = this.editor.getElementByKey(this.nodeKey);
      if (!tableElement) {
        throw new Error('Expected to find TableElement in DOM');
      }

      const cellX = cell.x;
      const cellY = cell.y;
      if (
        !this.isHighlightingCells &&
        (this.startX !== cellX || this.startY !== cellY)
      ) {
        const domSelection = getDOMSelection();
        const anchorNode = domSelection.anchorNode;
        if (anchorNode !== null) {
          // Collapse the selection
          domSelection.setBaseAndExtent(anchorNode, 0, anchorNode, 0);
        }
        this.isHighlightingCells = true;
        if (document.body) {
          document.body.appendChild(removeHighlightStyle);
        }
      } else if (cellX === this.currentX && cellY === this.currentY) {
        return;
      }
      this.currentX = cellX;
      this.currentY = cellY;

      if (this.isHighlightingCells) {
        const fromX = Math.min(this.startX, this.currentX);
        const toX = Math.max(this.startX, this.currentX);
        const fromY = Math.min(this.startY, this.currentY);
        const toY = Math.max(this.startY, this.currentY);

        this.highlightedCells = tableNode.setSelectionState(
          {
            fromX,
            fromY,
            toX,
            toY,
          },
          this.grid,
        );
      }
    });
  }

  startSelecting(cell: Cell) {
    this.isSelecting = true;
    this.startX = cell.x;
    this.startY = cell.y;

    document.addEventListener(
      'mouseup',
      () => {
        this.isSelecting = false;
      },
      {
        capture: true,
        once: true,
      },
    );
  }

  formatCells(type: TextFormatType) {
    this.editor.update(() => {
      let selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        selection = $createRangeSelection();
      }
      // This is to make Flow play ball.
      const formatSelection = selection;
      const anchor = formatSelection.anchor;
      const focus = formatSelection.focus;
      this.highlightedCells.forEach((highlightedCell) => {
        const cellNode = $getNearestNodeFromDOMNode(highlightedCell.elem);
        if ($isElementNode(cellNode) && cellNode.getTextContentSize() !== 0) {
          anchor.set(cellNode.getKey(), 0, 'element');
          focus.set(cellNode.getKey(), cellNode.getChildrenSize(), 'element');
          formatSelection.formatText(type);
        }
      });
      // Collapse selection
      selection.anchor.set(
        selection.anchor.key,
        selection.anchor.offset,
        selection.anchor.type,
      );
      selection.focus.set(
        selection.anchor.key,
        selection.anchor.offset,
        selection.anchor.type,
      );
      $setSelection(selection);
    });
  }

  clearText() {
    this.editor.update(() => {
      const tableNode = $getNodeByKey(this.nodeKey);
      if (!$isTableNode(tableNode)) {
        throw new Error('Expected TableNode.');
      }

      if (this.highlightedCells.length === this.grid.columns * this.grid.rows) {
        tableNode.selectPrevious();
        // Delete entire table
        tableNode.remove();
        this.clearHighlight();
        return;
      }
      this.highlightedCells.forEach(({elem}) => {
        const cellNode = $getNearestNodeFromDOMNode(elem);

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
      tableNode.setSelectionState(null, this.grid);
      $setSelection(null);
    });
  }
}
