/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  OutlineEditor,
  EditorConfig,
  OutlineNode,
  NodeKey,
  TextFormatType,
  CommandListenerLowPriority,
} from 'outline';

import {addClassNamesToElement} from 'outline/elements';
import {
  ElementNode,
  $getNearestNodeFromDOMNode,
  $isElementNode,
  createSelection,
  $getSelection,
  $setSelection,
} from 'outline';

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

const LowPriority: CommandListenerLowPriority = 1;

const removeHighlightStyle = document.createElement('style');
removeHighlightStyle.appendChild(
  document.createTextNode('::selection{background-color: transparent}'),
);

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

function trackTableChanges(tableElement: HTMLElement): Grid {
  const cells: Cells = [];
  const grid = {
    rows: 0,
    columns: 0,
    cells,
  };
  const observer = new MutationObserver((records) => {
    let currentNode = tableElement.firstChild;
    let x = 0;
    let y = 0;

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
    cells.length = 0;

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
          elemStyle.setProperty('caret-color', 'transparent');
        }
        highlighted.push(cell);
      } else if (cell.highlighted) {
        cell.highlighted = false;
        elemStyle.removeProperty('background-color');
        elemStyle.removeProperty('caret-color');
      }
    }
  }
  return highlighted;
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
  let currentX = -1;
  let currentY = -1;
  let highlightedCells = [];

  tableElement.addEventListener('mousemove', (event: MouseEvent) => {
    if (isSelected) {
      // $FlowFixMe: event.target is always a Node on the DOM
      const cell = getCellFromTarget(event.target);
      if (cell !== null) {
        const cellX = cell.x;
        const cellY = cell.y;
        if (!isHighlightingCells && (startX !== cellX || startY !== cellY)) {
          const windowSelection = window.getSelection();
          // Collapse the selection
          windowSelection.setBaseAndExtent(
            windowSelection.anchorNode,
            0,
            windowSelection.anchorNode,
            0,
          );
          isHighlightingCells = true;
          if (document.body) {
            document.body.appendChild(removeHighlightStyle);
          }
          if (deleteCharacterListener === null) {
            deleteCharacterListener = editor.addListener(
              'command',
              (type, payload) => {
                if (type === 'deleteCharacter') {
                  if (highlightedCells.length === grid.columns * grid.rows) {
                    tableNode.selectPrevious();
                    // Delete entire table
                    tableNode.remove();
                    clearHighlight();
                    return true;
                  }
                  highlightedCells.forEach(({elem}) => {
                    const cellNode = $getNearestNodeFromDOMNode(elem);
                    if ($isElementNode(cellNode)) {
                      cellNode.clear();
                    }
                  });
                  return true;
                } else if (type === 'formatText') {
                  formatCells(payload);
                  return true;
                }
                return false;
              },
              LowPriority,
            );
          }
        } else if (cellX === currentX && cellY === currentY) {
          return;
        }
        currentX = cellX;
        currentY = cellY;

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

  const clearHighlight = () => {
    isHighlightingCells = false;
    isSelected = false;
    startX = -1;
    startY = -1;
    currentX = -1;
    currentY = -1;
    updateCells(-1, -1, -1, -1, grid.cells);
    highlightedCells = [];
    if (deleteCharacterListener !== null) {
      deleteCharacterListener();
      deleteCharacterListener = null;
    }
    const parent = removeHighlightStyle.parentNode;
    if (parent != null) {
      parent.removeChild(removeHighlightStyle);
    }
  };

  tableElement.addEventListener('mouseleave', (event: MouseEvent) => {
    if (isSelected) {
      return;
    }
  });

  const formatCells = (type: TextFormatType) => {
    let selection = $getSelection();
    if (selection === null) {
      selection = createSelection();
    }
    // This is to make Flow play ball.
    const formatSelection = selection;
    const anchor = formatSelection.anchor;
    const focus = formatSelection.focus;
    highlightedCells.forEach((highlightedCell) => {
      const cellNode = $getNearestNodeFromDOMNode(highlightedCell.elem);
      if ($isElementNode(cellNode)) {
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
  };

  let deleteCharacterListener = null;

  tableElement.addEventListener('mousedown', (event: MouseEvent) => {
    if (isSelected) {
      if (isHighlightingCells) {
        clearHighlight();
      }
      return;
    }
    setTimeout(() => {
      if (isHighlightingCells) {
        clearHighlight();
      }
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
          },
          {
            capture: true,
            once: true,
          },
        );
      }
    }, 0);
  });
}

export class TableNode extends ElementNode {
  static getType(): 'table' {
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

    addClassNamesToElement(element, config.theme.table);

    applyCellSelection(this, element, editor);

    return element;
  }

  updateDOM(): boolean {
    return false;
  }

  canExtractContents(): false {
    return false;
  }

  canBeEmpty(): false {
    return false;
  }
}

export function $createTableNode(): TableNode {
  return new TableNode();
}

export function $isTableNode(node: ?OutlineNode): boolean %checks {
  return node instanceof TableNode;
}
