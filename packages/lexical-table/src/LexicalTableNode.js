/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {TableCellNode} from './LexicalTableCellNode';
import type {
  CommandListenerCriticalPriority,
  CommandListenerLowPriority,
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  TextFormatType,
} from 'lexical';

import {addClassNamesToElement} from '@lexical/helpers/elements';
import {$findMatchingParent} from '@lexical/helpers/nodes';
import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getNearestNodeFromDOMNode,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $setSelection,
  ElementNode,
} from 'lexical';
import invariant from 'shared/invariant';

import {$isTableCellNode} from './LexicalTableCellNode';

type Cell = {
  elem: HTMLElement,
  highlighted: boolean,
  x: number,
  y: number,
};

type Cells = Array<Array<Cell>>;

type Grid = {
  cells: Cells,
  columns: number,
  rows: number,
};

type SelectionShape = {
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
};

const LowPriority: CommandListenerLowPriority = 1;
const CriticalPriority: CommandListenerCriticalPriority = 4;

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

export function trackTableGrid(
  tableNode: TableNode,
  tableElement: HTMLElement,
  editor: LexicalEditor,
): Grid {
  const cells: Cells = [];
  const grid = {
    cells,
    columns: 0,
    rows: 0,
  };
  const observer = new MutationObserver((records) => {
    editor.update(() => {
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

      tableNode.setGrid(grid);
    });
  });

  observer.observe(tableElement, {
    childList: true,
    subtree: true,
  });

  tableNode.setGrid(grid);

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

function applyCustomTableHandlers(
  tableNode: TableNode,
  tableElement: HTMLElement,
  editor: LexicalEditor,
): void {
  const rootElement = editor.getRootElement();
  if (rootElement === null) {
    return;
  }

  trackTableGrid(tableNode, tableElement, editor);

  const grid = tableNode.getGrid();

  let isSelected = false;
  let isHighlightingCells = false;
  let startX = -1;
  let startY = -1;
  let currentX = -1;
  let currentY = -1;
  let highlightedCells = [];

  if (grid == null) {
    throw new Error('Table grid not found.');
  }

  tableElement.addEventListener('mousemove', (event: MouseEvent) => {
    if (isSelected) {
      // $FlowFixMe: event.target is always a Node on the DOM
      const cell = getCellFromTarget(event.target);
      if (cell !== null) {
        const cellX = cell.x;
        const cellY = cell.y;
        if (!isHighlightingCells && (startX !== cellX || startY !== cellY)) {
          event.preventDefault();
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

                      const paragraphNode = $createParagraphNode();
                      const textNode = $createTextNode();
                      paragraphNode.append(textNode);
                      cellNode.append(paragraphNode);
                    }
                  });
                  tableNode.setSelectionState(null);
                  $setSelection(null);
                  return true;
                } else if (type === 'formatText') {
                  formatCells(payload);
                  return true;
                } else if (type === 'insertText') {
                  clearHighlight();
                  return false;
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

          editor.update(() => {
            highlightedCells = tableNode.setSelectionState({
              fromX,
              fromY,
              toX,
              toY,
            });
          });
        }
      }
    }
  });

  const clearHighlight = () => {
    editor.update(() => {
      isHighlightingCells = false;
      isSelected = false;
      startX = -1;
      startY = -1;
      currentX = -1;
      currentY = -1;

      editor.update(() => {
        tableNode.setSelectionState(null);
      });

      highlightedCells = [];
      if (deleteCharacterListener !== null) {
        deleteCharacterListener();
        deleteCharacterListener = null;
      }
      const parent = removeHighlightStyle.parentNode;
      if (parent != null) {
        parent.removeChild(removeHighlightStyle);
      }
    });
  };

  tableElement.addEventListener('mouseleave', (event: MouseEvent) => {
    if (isSelected) {
      return;
    }
  });

  const formatCells = (type: TextFormatType) => {
    let selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      selection = $createRangeSelection();
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

  window.addEventListener('click', (e) => {
    if (highlightedCells.length > 0 && !tableElement.contains(e.target)) {
      editor.update(() => {
        tableNode.setSelectionState(null);
      });
    }
  });

  const selectGridNodeInDirection = (
    x: number,
    y: number,
    direction: 'backward' | 'forward' | 'up' | 'down',
  ): boolean => {
    switch (direction) {
      case 'backward':
      case 'forward': {
        const isForward = direction === 'forward';

        if (y !== (isForward ? grid.columns - 1 : 0)) {
          tableNode.getCellNodeFromCords(x, y + (isForward ? 1 : -1)).select();
        } else {
          if (x !== (isForward ? grid.rows - 1 : 0)) {
            tableNode
              .getCellNodeFromCords(
                x + (isForward ? 1 : -1),
                isForward ? 0 : grid.columns - 1,
              )
              .select();
          } else if (!isForward) {
            tableNode.selectPrevious();
          } else {
            tableNode.selectNext();
          }
        }
        return true;
      }

      case 'up': {
        if (x !== 0) {
          tableNode.getCellNodeFromCords(x - 1, y).select();
        } else {
          tableNode.selectPrevious();
        }
        return true;
      }

      case 'down': {
        if (x !== grid.rows - 1) {
          tableNode.getCellNodeFromCords(x + 1, y).select();
        } else {
          tableNode.selectNext();
        }
        return true;
      }
    }

    return false;
  };

  editor.addListener(
    'command',
    (type, payload) => {
      const selection = $getSelection();

      if (!$isRangeSelection(selection)) {
        return false;
      }

      const tableCellNode = $findMatchingParent(
        selection.anchor.getNode(),
        (n) => $isTableCellNode(n),
      );

      if (!$isTableCellNode(tableCellNode)) {
        return false;
      }

      if (type === 'deleteCharacter') {
        if (
          highlightedCells.length === 0 &&
          selection.isCollapsed() &&
          selection.anchor.offset === 0
        ) {
          return true;
        }
      }

      if (type === 'indentContent' || type === 'outdentContent') {
        if (selection.isCollapsed() && highlightedCells.length === 0) {
          const currentCords = tableNode.getCordsFromCellNode(tableCellNode);

          selectGridNodeInDirection(
            currentCords.x,
            currentCords.y,
            type === 'indentContent' ? 'forward' : 'backward',
          );

          return true;
        }
      }

      if (type === 'keyArrowDown' || type === 'keyArrowUp') {
        const event: KeyboardEvent = payload;

        if (selection.isCollapsed() && highlightedCells.length === 0) {
          const currentCords = tableNode.getCordsFromCellNode(tableCellNode);
          const elementParentNode = $findMatchingParent(
            selection.anchor.getNode(),
            (n) => $isElementNode(n),
          );

          if (
            (type === 'keyArrowUp' &&
              elementParentNode === tableCellNode.getFirstChild()) ||
            (type === 'keyArrowDown' &&
              elementParentNode === tableCellNode.getLastChild())
          ) {
            event.preventDefault();
            event.stopImmediatePropagation();

            selectGridNodeInDirection(
              currentCords.x,
              currentCords.y,
              type === 'keyArrowUp' ? 'up' : 'down',
            );

            return true;
          }
        }
      }

      return false;
    },
    CriticalPriority,
  );
}

export class TableNode extends ElementNode {
  __selectionShape: ?SelectionShape;
  __grid: ?Grid;

  static getType(): 'table' {
    return 'table';
  }

  static clone(
    node: TableNode,
    selectionShape: ?SelectionShape,
    grid: ?Grid,
  ): TableNode {
    return new TableNode(node.__key, node.__selectionShape, node.__grid);
  }

  constructor(
    key?: NodeKey,
    selectionShape: ?SelectionShape,
    grid: ?Grid,
  ): void {
    super(key);

    this.__selectionShape = selectionShape;
    this.__grid = grid;
  }

  createDOM<EditorContext>(
    config: EditorConfig<EditorContext>,
    editor: LexicalEditor,
  ): HTMLElement {
    const element = document.createElement('table');

    addClassNamesToElement(element, config.theme.table);

    applyCustomTableHandlers(this, element, editor);

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

  setSelectionState(selectionShape: ?SelectionShape): Array<Cell> {
    const self = this.getWritable();

    self.__selectionShape = selectionShape;

    if (this.__grid == null) return [];

    if (!selectionShape) {
      return updateCells(-1, -1, -1, -1, this.__grid.cells);
    }

    return updateCells(
      selectionShape.fromX,
      selectionShape.toX,
      selectionShape.fromY,
      selectionShape.toY,
      this.__grid.cells,
    );
  }

  getSelectionState(): ?SelectionShape {
    return this.__selectionShape;
  }

  getCordsFromCellNode(tableCellNode: TableCellNode): {x: number, y: number} {
    invariant(this.__grid, 'Grid not found.');

    const {rows, cells} = this.__grid;

    for (let x = 0; x < rows; x++) {
      const row = cells[x];
      if (row == null) {
        throw new Error(`Row not found at x:${x}`);
      }

      const y = row.findIndex(({elem}) => {
        const cellNode = $getNearestNodeFromDOMNode(elem);
        return cellNode === tableCellNode;
      });

      if (y !== -1) {
        return {x, y};
      }
    }

    throw new Error('Cell not found in table.');
  }

  getCellNodeFromCords(x: number, y: number): TableCellNode {
    invariant(this.__grid, 'Grid not found.');

    const {cells} = this.__grid;

    const row = cells[x];

    if (row == null) {
      throw new Error(`Table row x:"${x}" not found.`);
    }

    const cell = row[y];

    if (cell == null) {
      throw new Error(`Table cell y:"${y}" in row x:"${x}" not found.`);
    }

    const node = $getNearestNodeFromDOMNode(cell.elem);

    if ($isTableCellNode(node)) {
      return node;
    }

    throw new Error('Node at cords not TableCellNode.');
  }

  setGrid(grid: ?Grid): void {
    const self = this.getWritable();
    self.__grid = grid;
  }

  getGrid(): ?Grid {
    return this.__grid;
  }

  canSelectBefore(): true {
    return true;
  }
}

export function $createTableNode(): TableNode {
  return new TableNode();
}

export function $isTableNode(node: ?LexicalNode): boolean %checks {
  return node instanceof TableNode;
}
