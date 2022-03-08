/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {TableNode} from './LexicalTableNode';
import type {
  CommandListenerCriticalPriority,
  CommandListenerLowPriority,
  LexicalEditor,
  TextFormatType,
} from 'lexical';

import {$findMatchingParent} from '@lexical/helpers/nodes';
import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getNearestNodeFromDOMNode,
  $getSelection,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  $setSelection,
} from 'lexical';
import getDOMSelection from 'shared/getDOMSelection';

import {$isTableCellNode} from './LexicalTableCellNode';

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

const LowPriority: CommandListenerLowPriority = 1;
const CriticalPriority: CommandListenerCriticalPriority = 4;

const removeHighlightStyle = document.createElement('style');

removeHighlightStyle.appendChild(
  document.createTextNode('::selection{background-color: transparent}'),
);

export function getCellFromTarget(node: Node): Cell | null {
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

export function getTableGrid(tableElement: HTMLElement): Grid {
  const cells: Cells = [];
  const grid = {
    cells,
    columns: 0,
    rows: 0,
  };

  let currentNode = tableElement.firstChild;
  let x = 0;
  let y = 0;

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

  return grid;
}

export function trackTableGrid(
  tableNode: TableNode,
  tableElement: HTMLElement,
  editor: LexicalEditor,
  cb: (grid: Grid) => void,
): Grid {
  const observer = new MutationObserver((records) => {
    editor.update(() => {
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

      const grid = getTableGrid(tableElement);

      cb(grid);
    });
  });

  observer.observe(tableElement, {
    childList: true,
    subtree: true,
  });

  return getTableGrid(tableElement);
}

export function updateCells(
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

        if (!cell.elem.getAttribute('style')) {
          cell.elem.removeAttribute('style');
        }
      }
    }
  }
  return highlighted;
}

export function $applyTableHandlers(
  tableNode: TableNode,
  tableElement: HTMLElement,
  editor: LexicalEditor,
): () => void {
  const rootElement = editor.getRootElement();

  if (rootElement === null) {
    throw new Error('No root element.');
  }

  let grid = trackTableGrid(tableNode, tableElement, editor, (g) => {
    grid = g;
  });

  let isSelected = false;
  let isHighlightingCells = false;
  let startX = -1;
  let startY = -1;
  let currentX = -1;
  let currentY = -1;
  let highlightedCells = [];
  const editorListeners = new Set();
  let deleteCharacterListener = null;

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
          const domSelection = getDOMSelection();
          const anchorNode = domSelection.anchorNode;
          if (anchorNode !== null) {
            // Collapse the selection
            domSelection.setBaseAndExtent(anchorNode, 0, anchorNode, 0);
          }
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
                  tableNode.setSelectionState(null, grid);
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

            editorListeners.add(deleteCharacterListener);
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
            highlightedCells = tableNode.setSelectionState(
              {
                fromX,
                fromY,
                toX,
                toY,
              },
              grid,
            );
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
        tableNode.setSelectionState(null, grid);
      });

      highlightedCells = [];
      if (deleteCharacterListener !== null) {
        deleteCharacterListener();
        deleteCharacterListener = null;
        editorListeners.delete(deleteCharacterListener);
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
  };

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
    if (
      highlightedCells.length > 0 &&
      !tableElement.contains(e.target) &&
      rootElement.contains(e.target)
    ) {
      editor.update(() => {
        tableNode.setSelectionState(null, grid);
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

        if (x !== (isForward ? grid.columns - 1 : 0)) {
          selectTableCellNode(
            tableNode.getCellNodeFromCordsOrThrow(
              x + (isForward ? 1 : -1),
              y,
              grid,
            ),
          );
        } else {
          if (y !== (isForward ? grid.rows - 1 : 0)) {
            selectTableCellNode(
              tableNode.getCellNodeFromCordsOrThrow(
                isForward ? 0 : grid.columns - 1,
                y + (isForward ? 1 : -1),
                grid,
              ),
            );
          } else if (!isForward) {
            tableNode.selectPrevious();
          } else {
            tableNode.selectNext();
          }
        }
        return true;
      }

      case 'up': {
        if (y !== 0) {
          selectTableCellNode(
            tableNode.getCellNodeFromCordsOrThrow(x, y - 1, grid),
          );
        } else {
          tableNode.selectPrevious();
        }
        return true;
      }

      case 'down': {
        if (y !== grid.rows - 1) {
          selectTableCellNode(
            tableNode.getCellNodeFromCordsOrThrow(x, y + 1, grid),
          );
        } else {
          tableNode.selectNext();
        }
        return true;
      }
    }

    return false;
  };

  const genericCommandListener = editor.addListener(
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
          selection.anchor.offset === 0 &&
          selection.anchor.getNode().getPreviousSiblings().length === 0
        ) {
          return true;
        }
      }

      if (type === 'keyTab') {
        const event: KeyboardEvent = payload;

        if (selection.isCollapsed() && highlightedCells.length === 0) {
          const currentCords = tableNode.getCordsFromCellNode(
            tableCellNode,
            grid,
          );
          event.preventDefault();

          selectGridNodeInDirection(
            currentCords.x,
            currentCords.y,
            !event.shiftKey && type === 'keyTab' ? 'forward' : 'backward',
          );

          return true;
        }
      }

      if (
        type === 'keyArrowDown' ||
        type === 'keyArrowUp' ||
        type === 'keyArrowLeft' ||
        type === 'keyArrowRight'
      ) {
        const event: KeyboardEvent = payload;

        if (selection.isCollapsed() && highlightedCells.length === 0) {
          const currentCords = tableNode.getCordsFromCellNode(
            tableCellNode,
            grid,
          );
          const elementParentNode = $findMatchingParent(
            selection.anchor.getNode(),
            (n) => $isElementNode(n),
          );

          if (elementParentNode == null) {
            throw new Error('Expected BlockNode Parent');
          }

          const firstChild = tableCellNode.getFirstChild();
          const lastChild = tableCellNode.getLastChild();

          const isSelectionInFirstBlock =
            (firstChild && elementParentNode.isParentOf(firstChild)) ||
            elementParentNode === firstChild;

          const isSelectionInLastBlock =
            (lastChild && elementParentNode.isParentOf(lastChild)) ||
            elementParentNode === lastChild;

          if (
            (type === 'keyArrowUp' && isSelectionInFirstBlock) ||
            (type === 'keyArrowDown' && isSelectionInLastBlock)
          ) {
            event.preventDefault();
            event.stopImmediatePropagation();
            event.stopPropagation();

            selectGridNodeInDirection(
              currentCords.x,
              currentCords.y,
              type === 'keyArrowUp' ? 'up' : 'down',
            );

            return true;
          }

          if (
            (type === 'keyArrowLeft' && selection.anchor.offset === 0) ||
            (type === 'keyArrowRight' &&
              selection.anchor.offset ===
                selection.anchor.getNode().getTextContentSize())
          ) {
            event.preventDefault();
            event.stopImmediatePropagation();
            event.stopPropagation();

            selectGridNodeInDirection(
              currentCords.x,
              currentCords.y,
              type === 'keyArrowLeft' ? 'backward' : 'forward',
            );

            return true;
          }
        }
      }

      return false;
    },
    CriticalPriority,
  );

  editorListeners.add(genericCommandListener);

  return () =>
    Array.from(editorListeners).forEach((removeListener) =>
      removeListener ? removeListener() : null,
    );
}

function selectTableCellNode(tableCell) {
  const possibleParagraph = tableCell
    .getChildren()
    .find((n) => $isParagraphNode(n));

  if ($isParagraphNode(possibleParagraph)) {
    possibleParagraph.selectEnd();
  } else {
    tableCell.selectEnd();
  }
}
