/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {TableNode} from './LexicalTableNode';
import type {Cell, Cells, Grid} from './LexicalTableSelection';
import type {
  CommandListenerCriticalPriority,
  GridSelection,
  LexicalEditor,
} from 'lexical';

import {$findMatchingParent} from '@lexical/utils';
import {
  $getNearestNodeFromDOMNode,
  $getSelection,
  $isElementNode,
  $isGridSelection,
  $isParagraphNode,
  $isRangeSelection,
} from 'lexical';

import {$isTableCellNode} from './LexicalTableCellNode';
import {TableSelection} from './LexicalTableSelection';

const CriticalPriority: CommandListenerCriticalPriority = 4;

const LEXICAL_ELEMENT_KEY = '__lexicalTableSelection';

export function applyTableHandlers(
  tableNode: TableNode,
  tableElement: HTMLElement,
  editor: LexicalEditor,
): TableSelection {
  const rootElement = editor.getRootElement();

  if (rootElement === null) {
    throw new Error('No root element.');
  }

  const tableSelection = new TableSelection(editor, tableNode.getKey());

  attachTableSelectionToTableElement(tableElement, tableSelection);

  tableElement.addEventListener('dblclick', (event: MouseEvent) => {
    // $FlowFixMe: event.target is always a Node on the DOM
    const cell = getCellFromTarget(event.target);
    if (cell !== null) {
      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();
      tableSelection.setAnchorCellForSelection(cell);
      tableSelection.adjustFocusCellForSelection(cell, true);
      tableSelection.isMouseDown = false;
    }
  });

  // This is the anchor of the selection.
  tableElement.addEventListener('mousedown', (event: MouseEvent) => {
    setTimeout(() => {
      // $FlowFixMe: event.target is always a Node on the DOM
      const cell = getCellFromTarget(event.target);
      if (cell !== null) {
        tableSelection.setAnchorCellForSelection(cell);
      }
    }, 0);
  });

  // This is adjusting the focus of the selection.
  tableElement.addEventListener('mousemove', (event: MouseEvent) => {
    if (tableSelection.isMouseDown) {
      // $FlowFixMe: event.target is always a Node on the DOM
      const cell = getCellFromTarget(event.target);
      if (cell !== null) {
        const cellX = cell.x;
        const cellY = cell.y;
        if (
          tableSelection.isMouseDown &&
          (tableSelection.startX !== cellX ||
            tableSelection.startY !== cellY ||
            tableSelection.isHighlightingCells)
        ) {
          event.preventDefault();
          tableSelection.adjustFocusCellForSelection(cell);
        }
      }
    }
  });

  tableElement.addEventListener('mouseup', (event: MouseEvent) => {
    if (tableSelection.isMouseDown) {
      tableSelection.isMouseDown = false;
    }
  });

  // Select entire table at this point, when grid selection is ready.
  tableElement.addEventListener('mouseleave', (event: MouseEvent) => {
    if (tableSelection.isMouseDown) {
      return;
    }
  });

  // Clear selection when clicking outside of dom.
  const mouseDownCallback = (e) => {
    editor.update(() => {
      const selection = $getSelection();

      if (
        $isGridSelection(selection) &&
        selection.gridKey === tableSelection.tableNodeKey &&
        rootElement.contains(e.target)
      ) {
        return tableSelection.clearHighlight();
      }
    });
  };

  window.addEventListener('mousedown', mouseDownCallback);

  tableSelection.listenersToRemove.add(() =>
    window.removeEventListener('mousedown', mouseDownCallback),
  );

  tableSelection.listenersToRemove.add(
    editor.addListener(
      'command',
      (type, payload) => {
        const selection = $getSelection();

        if ($isGridSelection(selection)) {
          if (type === 'deleteCharacter' || type === 'keyBackspace') {
            const event: KeyboardEvent = payload;
            event.preventDefault();
            event.stopPropagation();

            tableSelection.clearText();
            return true;
          } else if (type === 'formatText') {
            tableSelection.formatCells(payload);
            return true;
          } else if (type === 'insertText') {
            tableSelection.clearHighlight();
            return false;
          }
        } else if ($isRangeSelection(selection)) {
          const tableCellNode = $findMatchingParent(
            selection.anchor.getNode(),
            (n) => $isTableCellNode(n),
          );

          if (!$isTableCellNode(tableCellNode)) {
            return false;
          }

          if (type === 'deleteCharacter') {
            if (
              selection.isCollapsed() &&
              selection.anchor.offset === 0 &&
              selection.anchor.getNode().getPreviousSiblings().length === 0
            ) {
              return true;
            }
          }

          if (type === 'keyTab') {
            const event: KeyboardEvent = payload;

            if (selection.isCollapsed()) {
              const currentCords = tableNode.getCordsFromCellNode(
                tableCellNode,
                tableSelection.grid,
              );
              event.preventDefault();

              selectGridNodeInDirection(
                tableSelection,
                tableNode,
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

            if (selection.isCollapsed()) {
              const currentCords = tableNode.getCordsFromCellNode(
                tableCellNode,
                tableSelection.grid,
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
                  tableSelection,
                  tableNode,
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
                  tableSelection,
                  tableNode,
                  currentCords.x,
                  currentCords.y,
                  type === 'keyArrowLeft' ? 'backward' : 'forward',
                );

                return true;
              }
            }
          }
        }

        return false;
      },
      CriticalPriority,
    ),
  );

  return tableSelection;
}

export function attachTableSelectionToTableElement(
  tableElement: HTMLElement,
  tableSelection: TableSelection,
) {
  // $FlowFixMe
  tableElement[LEXICAL_ELEMENT_KEY] = tableSelection;
}

export function getTableSelectionFromTableElement(
  tableElement: HTMLElement,
): TableSelection {
  // $FlowFixMe
  return tableElement[LEXICAL_ELEMENT_KEY];
}

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

export function $updateDOMForSelection(
  grid: Grid,
  gridSelection: GridSelection | null,
): Array<Cell> {
  const highlightedCells = [];
  const {cells} = grid;

  const selectedCellNodes = new Set(
    gridSelection ? gridSelection.getNodes() : [],
  );

  for (let y = 0; y < cells.length; y++) {
    const row = cells[y];

    for (let x = 0; x < row.length; x++) {
      const cell = row[x];
      const elemStyle = cell.elem.style;
      const lexicalNode = $getNearestNodeFromDOMNode(cell.elem);

      if (lexicalNode && selectedCellNodes.has(lexicalNode)) {
        cell.highlighted = true;
        elemStyle.setProperty('background-color', 'rgb(163, 187, 255)');
        elemStyle.setProperty('caret-color', 'transparent');
        highlightedCells.push(cell);
      } else {
        cell.highlighted = false;
        elemStyle.removeProperty('background-color');
        elemStyle.removeProperty('caret-color');

        if (!cell.elem.getAttribute('style')) {
          cell.elem.removeAttribute('style');
        }
      }
    }
  }

  return highlightedCells;
}

const selectGridNodeInDirection = (
  tableSelection: TableSelection,
  tableNode: TableNode,
  x: number,
  y: number,
  direction: 'backward' | 'forward' | 'up' | 'down',
): boolean => {
  switch (direction) {
    case 'backward':
    case 'forward': {
      const isForward = direction === 'forward';

      if (x !== (isForward ? tableSelection.grid.columns - 1 : 0)) {
        selectTableCellNode(
          tableNode.getCellNodeFromCordsOrThrow(
            x + (isForward ? 1 : -1),
            y,
            tableSelection.grid,
          ),
        );
      } else {
        if (y !== (isForward ? tableSelection.grid.rows - 1 : 0)) {
          selectTableCellNode(
            tableNode.getCellNodeFromCordsOrThrow(
              isForward ? 0 : tableSelection.grid.columns - 1,
              y + (isForward ? 1 : -1),
              tableSelection.grid,
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
          tableNode.getCellNodeFromCordsOrThrow(x, y - 1, tableSelection.grid),
        );
      } else {
        tableNode.selectPrevious();
      }
      return true;
    }

    case 'down': {
      if (y !== tableSelection.grid.rows - 1) {
        selectTableCellNode(
          tableNode.getCellNodeFromCordsOrThrow(x, y + 1, tableSelection.grid),
        );
      } else {
        tableNode.selectNext();
      }
      return true;
    }
  }

  return false;
};

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
