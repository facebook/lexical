/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor, EditorConfig, OutlineNode, NodeKey} from 'outline';

import {ElementNode, getNearestNodeFromDOMNode, isElementNode} from 'outline';

type Cell = {
  elem: HTMLElement,
  highlighted: boolean,
  x: number,
  y: number,
};
type Cells = Array<Array<Cell>>;
type Grid = {
  rows: number,
  columns: number,
  cells: Cells,
};

function getCellFromTarget(node: Node): Cell | null {
  let currentNode = node;
  while (currentNode != null) {
    const nodeName = currentNode.nodeName;
    if (nodeName === 'TD' || nodeName === 'TH') {
      // $FlowFixMe: internal field
      const cell = currentNode._cell;
      if (cell === undefined) {
        return null;
      }
      return cell;
    }
    currentNode = currentNode.parentNode;
  }
  return null;
}

function updateCells(
  fromX: number,
  toX: number,
  fromY: number,
  toY: number,
  cells: Cells,
): Array<Cell> {
  const highlighted = [];
  for (let y = 0; y < cells.length; y++) {
    const row = cells[y];
    for (let x = 0; x < row.length; x++) {
      const cell = row[x];
      const elemStyle = cell.elem.style;
      if (x >= fromX && x <= toX && y >= fromY && y <= toY) {
        if (!cell.highlighted) {
          cell.highlighted = true;
          elemStyle.setProperty('background-color', 'rgb(163, 187, 255)');
        }
        highlighted.push(cell);
      } else if (cell.highlighted) {
        cell.highlighted = false;
        elemStyle.removeProperty('background-color');
      }
    }
  }
  return highlighted;
}

function trackTableChanges(tableElement: HTMLElement): Grid {
  const cells: Cells = [];
  const grid = {
    rows: 0,
    columns: 0,
    cells,
  };
  const observer = new MutationObserver((records) => {
    cells.length = 0;
    let currentNode = tableElement.firstChild;
    let x = 0;
    let y = 0;
    while (currentNode != null) {
      const nodeMame = currentNode.nodeName;
      if (nodeMame === 'TD' || nodeMame === 'TH') {
        // $FlowFixMe: TD is always an HTMLElement
        const elem: HTMLElement = currentNode;
        const cell = {
          elem,
          highlighted: false,
          x,
          y,
        };
        // $FlowFixMe: internal field
        currentNode._cell = cell;
        if (cells[y] === undefined) {
          cells[y] = [];
        }
        cells[y][x] = cell;
      } else {
        const child = currentNode.firstChild;
        if (child != null) {
          currentNode = child;
          continue;
        }
      }
      const sibling = currentNode.nextSibling;
      if (sibling != null) {
        x++;
        currentNode = sibling;
        continue;
      }
      const parent = currentNode.parentNode;
      if (parent != null) {
        const parentSibling = parent.nextSibling;
        if (parentSibling == null) {
          break;
        }
        y++;
        x = 0;
        currentNode = parentSibling;
      }
    }
    grid.columns = x + 1;
    grid.rows = y + 1;
  });

  observer.observe(tableElement, {
    childList: true,
    subtree: true,
  });

  return grid;
}

function applyCellSelection(
  tableNode: TableNode,
  tableElement: HTMLElement,
  editor: OutlineEditor,
): void {
  const grid = trackTableChanges(tableElement);
  const rootElement = editor.getRootElement();
  if (rootElement === null) {
    return;
  }
  let isSelected = false;
  let isHighlightingCells = false;
  let startX = -1;
  let startY = -1;
  let highlightedCells = [];

  tableElement.addEventListener('mousemove', (event: MouseEvent) => {
    if (isSelected) {
      // $FlowFixMe: event.target is always a Node on the DOM
      const cell = getCellFromTarget(event.target);
      if (cell !== null) {
        const currentX = cell.x;
        const currentY = cell.y;
        if (
          !isHighlightingCells &&
          (startX !== currentX || startY !== currentY)
        ) {
          const selection = window.getSelection();
          selection.removeAllRanges();
          isHighlightingCells = true;
        }
        if (isHighlightingCells) {
          const fromX = Math.min(startX, currentX);
          const toX = Math.max(startX, currentX);
          const fromY = Math.min(startY, currentY);
          const toY = Math.max(startY, currentY);
          highlightedCells = updateCells(fromX, toX, fromY, toY, grid.cells);
        }
      }
    }
  });

  rootElement.addEventListener(
    'keydown',
    (event: KeyboardEvent) => {
      if (isHighlightingCells) {
        // Backspace or delete
        const keyCode = event.keyCode;
        if (keyCode === 8 || keyCode === 46) {
          event.preventDefault();
          event.stopPropagation();
          editor.update(() => {
            if (highlightedCells.length === grid.columns * grid.rows) {
              tableNode.selectPrevious();
              // Delete entire table
              tableNode.remove();
              return;
            }
            highlightedCells.forEach((cell) => {
              const cellNode = getNearestNodeFromDOMNode(cell.elem);
              if (isElementNode(cellNode)) {
                cellNode.clear();
              }
            });
            clearHighlight();
          });
        }
      }
    },
    true,
  );

  const clearHighlight = () => {
    isHighlightingCells = false;
    isSelected = false;
    startX = -1;
    startY = -1;
    updateCells(-1, -1, -1, -1, grid.cells);
    highlightedCells = [];
  };

  tableElement.addEventListener('mousedown', (event: MouseEvent) => {
    // $FlowFixMe: event.target is always a Node on the DOM
    const cell = getCellFromTarget(event.target);
    if (cell !== null) {
      isSelected = true;
      startX = cell.x;
      startY = cell.y;
      document.addEventListener(
        'mouseup',
        () => {
          isSelected = false;
          document.addEventListener('mousedown', clearHighlight, {
            capture: true,
            once: true,
          });
        },
        {
          capture: true,
          once: true,
        },
      );
    }
  });
}

export class TableNode extends ElementNode {
  static getType(): string {
    return 'table';
  }

  static clone(node: TableNode): TableNode {
    return new TableNode(node.__key);
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  createDOM<EditorContext>(
    config: EditorConfig<EditorContext>,
    editor: OutlineEditor,
  ): HTMLElement {
    const element = document.createElement('table');

    if (config.theme.table != null) {
      element.classList.add(config.theme.table);
    }
    applyCellSelection(this, element, editor);

    return element;
  }

  updateDOM(): boolean {
    return false;
  }

  canBeEmpty(): false {
    return false;
  }
}

export function createTableNode(): TableNode {
  return new TableNode();
}

export function isTableNode(node: OutlineNode): boolean {
  return node instanceof TableNode;
}
