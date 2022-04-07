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
  DELETE_CHARACTER_COMMAND,
  FORMAT_TEXT_COMMAND,
  INSERT_TEXT_COMMAND,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_TAB_COMMAND,
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

  let isMouseDown = false;

  tableElement.addEventListener('dblclick', (event: MouseEvent) => {
    // $FlowFixMe: event.target is always a Node on the DOM
    const cell = getCellFromTarget(event.target);
    if (cell !== null) {
      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();
      tableSelection.setAnchorCellForSelection(cell);
      tableSelection.adjustFocusCellForSelection(cell, true);
      isMouseDown = false;
    }
  });

  // This is the anchor of the selection.
  tableElement.addEventListener('mousedown', (event: MouseEvent) => {
    setTimeout(() => {
      if (event.button !== 0) {
        return;
      }

      // $FlowFixMe: event.target is always a Node on the DOM
      const cell = getCellFromTarget(event.target);
      if (cell !== null) {
        isMouseDown = true;
        tableSelection.setAnchorCellForSelection(cell);

        document.addEventListener(
          'mouseup',
          () => {
            isMouseDown = false;
          },
          {
            capture: true,
            once: true,
          },
        );
      }
    }, 0);
  });

  // This is adjusting the focus of the selection.
  tableElement.addEventListener('mousemove', (event: MouseEvent) => {
    if (isMouseDown) {
      // $FlowFixMe: event.target is always a Node on the DOM
      const cell = getCellFromTarget(event.target);
      if (cell !== null) {
        const cellX = cell.x;
        const cellY = cell.y;
        if (
          isMouseDown &&
          (tableSelection.startX !== cellX ||
            tableSelection.startY !== cellY ||
            tableSelection.isHighlightingCells)
        ) {
          event.preventDefault();
          isMouseDown = true;
          tableSelection.adjustFocusCellForSelection(cell);
        }
      }
    }
  });

  tableElement.addEventListener('mouseup', (event: MouseEvent) => {
    if (isMouseDown) {
      isMouseDown = false;
    }
  });

  // Select entire table at this point, when grid selection is ready.
  tableElement.addEventListener('mouseleave', (event: MouseEvent) => {
    if (isMouseDown) {
      return;
    }
  });

  // Clear selection when clicking outside of dom.
  const mouseDownCallback = (event) => {
    if (event.button !== 0) {
      return;
    }

    editor.update(() => {
      const selection = $getSelection();

      if (
        $isGridSelection(selection) &&
        selection.gridKey === tableSelection.tableNodeKey &&
        rootElement.contains(event.target)
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
    editor.registerCommand(
      KEY_ARROW_DOWN_COMMAND,
      (payload) => {
        const selection = $getSelection();

        const event: KeyboardEvent = payload;

        const direction = 'down';

        if ($isRangeSelection(selection)) {
          if (selection.isCollapsed()) {
            const tableCellNode = $findMatchingParent(
              selection.anchor.getNode(),
              (n) => $isTableCellNode(n),
            );

            if (!$isTableCellNode(tableCellNode)) {
              return false;
            }

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

            const lastChild = tableCellNode.getLastChild();

            const isSelectionInLastBlock =
              (lastChild && elementParentNode.isParentOf(lastChild)) ||
              elementParentNode === lastChild;

            if (isSelectionInLastBlock || event.shiftKey) {
              event.preventDefault();
              event.stopImmediatePropagation();
              event.stopPropagation();

              // Start Selection
              if (event.shiftKey) {
                tableSelection.setAnchorCellForSelection(
                  tableNode.getCellFromCordsOrThrow(
                    currentCords.x,
                    currentCords.y,
                    tableSelection.grid,
                  ),
                );

                return adjustFocusNodeInDirection(
                  tableSelection,
                  tableNode,
                  currentCords.x,
                  currentCords.y,
                  direction,
                );
              }

              return selectGridNodeInDirection(
                tableSelection,
                tableNode,
                currentCords.x,
                currentCords.y,
                direction,
              );
            }
          }
        } else if ($isGridSelection(selection) && event.shiftKey) {
          const tableCellNode = selection.focus.getNode();

          if (!$isTableCellNode(tableCellNode)) {
            return false;
          }

          const currentCords = tableNode.getCordsFromCellNode(
            tableCellNode,
            tableSelection.grid,
          );

          event.preventDefault();
          event.stopImmediatePropagation();
          event.stopPropagation();

          return adjustFocusNodeInDirection(
            tableSelection,
            tableNode,
            currentCords.x,
            currentCords.y,
            direction,
          );
        }

        return false;
      },
      CriticalPriority,
    ),
  );
  tableSelection.listenersToRemove.add(
    editor.registerCommand(
      KEY_ARROW_UP_COMMAND,
      (payload) => {
        const selection = $getSelection();

        const event: KeyboardEvent = payload;

        const direction = 'up';

        if ($isRangeSelection(selection)) {
          if (selection.isCollapsed()) {
            const tableCellNode = $findMatchingParent(
              selection.anchor.getNode(),
              (n) => $isTableCellNode(n),
            );

            if (!$isTableCellNode(tableCellNode)) {
              return false;
            }

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

            const lastChild = tableCellNode.getLastChild();

            const isSelectionInLastBlock =
              (lastChild && elementParentNode.isParentOf(lastChild)) ||
              elementParentNode === lastChild;

            if (isSelectionInLastBlock || event.shiftKey) {
              event.preventDefault();
              event.stopImmediatePropagation();
              event.stopPropagation();

              // Start Selection
              if (event.shiftKey) {
                tableSelection.setAnchorCellForSelection(
                  tableNode.getCellFromCordsOrThrow(
                    currentCords.x,
                    currentCords.y,
                    tableSelection.grid,
                  ),
                );

                return adjustFocusNodeInDirection(
                  tableSelection,
                  tableNode,
                  currentCords.x,
                  currentCords.y,
                  direction,
                );
              }

              return selectGridNodeInDirection(
                tableSelection,
                tableNode,
                currentCords.x,
                currentCords.y,
                direction,
              );
            }
          }
        } else if ($isGridSelection(selection) && event.shiftKey) {
          const tableCellNode = selection.focus.getNode();

          if (!$isTableCellNode(tableCellNode)) {
            return false;
          }

          const currentCords = tableNode.getCordsFromCellNode(
            tableCellNode,
            tableSelection.grid,
          );

          event.preventDefault();
          event.stopImmediatePropagation();
          event.stopPropagation();

          return adjustFocusNodeInDirection(
            tableSelection,
            tableNode,
            currentCords.x,
            currentCords.y,
            direction,
          );
        }

        return false;
      },
      CriticalPriority,
    ),
  );
  tableSelection.listenersToRemove.add(
    editor.registerCommand(
      KEY_ARROW_LEFT_COMMAND,
      (payload) => {
        const selection = $getSelection();

        const event: KeyboardEvent = payload;

        const direction = 'backward';

        if ($isRangeSelection(selection)) {
          if (selection.isCollapsed()) {
            const tableCellNode = $findMatchingParent(
              selection.anchor.getNode(),
              (n) => $isTableCellNode(n),
            );

            if (!$isTableCellNode(tableCellNode)) {
              return false;
            }

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

            if (selection.anchor.offset === 0 || event.shiftKey) {
              event.preventDefault();
              event.stopImmediatePropagation();
              event.stopPropagation();

              // Start Selection
              if (event.shiftKey) {
                tableSelection.setAnchorCellForSelection(
                  tableNode.getCellFromCordsOrThrow(
                    currentCords.x,
                    currentCords.y,
                    tableSelection.grid,
                  ),
                );

                return adjustFocusNodeInDirection(
                  tableSelection,
                  tableNode,
                  currentCords.x,
                  currentCords.y,
                  direction,
                );
              }

              return selectGridNodeInDirection(
                tableSelection,
                tableNode,
                currentCords.x,
                currentCords.y,
                direction,
              );
            }
          }
        } else if ($isGridSelection(selection) && event.shiftKey) {
          const tableCellNode = selection.focus.getNode();

          if (!$isTableCellNode(tableCellNode)) {
            return false;
          }

          const currentCords = tableNode.getCordsFromCellNode(
            tableCellNode,
            tableSelection.grid,
          );

          event.preventDefault();
          event.stopImmediatePropagation();
          event.stopPropagation();

          return adjustFocusNodeInDirection(
            tableSelection,
            tableNode,
            currentCords.x,
            currentCords.y,
            direction,
          );
        }

        return false;
      },
      CriticalPriority,
    ),
  );
  tableSelection.listenersToRemove.add(
    editor.registerCommand(
      KEY_ARROW_RIGHT_COMMAND,
      (payload) => {
        const selection = $getSelection();

        const event: KeyboardEvent = payload;

        const direction = 'forward';

        if ($isRangeSelection(selection)) {
          if (selection.isCollapsed()) {
            const tableCellNode = $findMatchingParent(
              selection.anchor.getNode(),
              (n) => $isTableCellNode(n),
            );

            if (!$isTableCellNode(tableCellNode)) {
              return false;
            }

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

            if (
              selection.anchor.offset ===
                selection.anchor.getNode().getTextContentSize() ||
              event.shiftKey
            ) {
              event.preventDefault();
              event.stopImmediatePropagation();
              event.stopPropagation();

              // Start Selection
              if (event.shiftKey) {
                tableSelection.setAnchorCellForSelection(
                  tableNode.getCellFromCordsOrThrow(
                    currentCords.x,
                    currentCords.y,
                    tableSelection.grid,
                  ),
                );

                return adjustFocusNodeInDirection(
                  tableSelection,
                  tableNode,
                  currentCords.x,
                  currentCords.y,
                  direction,
                );
              }

              return selectGridNodeInDirection(
                tableSelection,
                tableNode,
                currentCords.x,
                currentCords.y,
                direction,
              );
            }
          }
        } else if ($isGridSelection(selection) && event.shiftKey) {
          const tableCellNode = selection.focus.getNode();

          if (!$isTableCellNode(tableCellNode)) {
            return false;
          }

          const currentCords = tableNode.getCordsFromCellNode(
            tableCellNode,
            tableSelection.grid,
          );

          event.preventDefault();
          event.stopImmediatePropagation();
          event.stopPropagation();

          return adjustFocusNodeInDirection(
            tableSelection,
            tableNode,
            currentCords.x,
            currentCords.y,
            direction,
          );
        }

        return false;
      },
      CriticalPriority,
    ),
  );
  tableSelection.listenersToRemove.add(
    editor.registerCommand(
      DELETE_CHARACTER_COMMAND,
      () => {
        const selection = $getSelection();

        if ($isGridSelection(selection)) {
          tableSelection.clearText();
          return true;
        } else if ($isRangeSelection(selection)) {
          const tableCellNode = $findMatchingParent(
            selection.anchor.getNode(),
            (n) => $isTableCellNode(n),
          );

          if (!$isTableCellNode(tableCellNode)) {
            return false;
          }

          if (
            selection.isCollapsed() &&
            selection.anchor.offset === 0 &&
            selection.anchor.getNode().getPreviousSiblings().length === 0
          ) {
            return true;
          }
        }

        return false;
      },
      CriticalPriority,
    ),
  );
  tableSelection.listenersToRemove.add(
    editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      (payload) => {
        const selection = $getSelection();

        if ($isGridSelection(selection)) {
          const event: KeyboardEvent = payload;
          event.preventDefault();
          event.stopPropagation();

          tableSelection.clearText();
          return true;
        } else if ($isRangeSelection(selection)) {
          const tableCellNode = $findMatchingParent(
            selection.anchor.getNode(),
            (n) => $isTableCellNode(n),
          );

          if (!$isTableCellNode(tableCellNode)) {
            return false;
          }
        }

        return false;
      },
      CriticalPriority,
    ),
  );
  tableSelection.listenersToRemove.add(
    editor.registerCommand(
      FORMAT_TEXT_COMMAND,
      (payload) => {
        const selection = $getSelection();

        if ($isGridSelection(selection)) {
          tableSelection.formatCells(payload);
          return true;
        } else if ($isRangeSelection(selection)) {
          const tableCellNode = $findMatchingParent(
            selection.anchor.getNode(),
            (n) => $isTableCellNode(n),
          );

          if (!$isTableCellNode(tableCellNode)) {
            return false;
          }
        }

        return false;
      },
      CriticalPriority,
    ),
  );
  tableSelection.listenersToRemove.add(
    editor.registerCommand(
      INSERT_TEXT_COMMAND,
      (payload) => {
        const selection = $getSelection();

        if ($isGridSelection(selection)) {
          tableSelection.clearHighlight();
          return false;
        } else if ($isRangeSelection(selection)) {
          const tableCellNode = $findMatchingParent(
            selection.anchor.getNode(),
            (n) => $isTableCellNode(n),
          );

          if (!$isTableCellNode(tableCellNode)) {
            return false;
          }
        }

        return false;
      },
      CriticalPriority,
    ),
  );
  tableSelection.listenersToRemove.add(
    editor.registerCommand(
      KEY_TAB_COMMAND,
      (payload) => {
        const selection = $getSelection();

        if ($isRangeSelection(selection)) {
          const tableCellNode = $findMatchingParent(
            selection.anchor.getNode(),
            (n) => $isTableCellNode(n),
          );

          if (!$isTableCellNode(tableCellNode)) {
            return false;
          }

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
              !event.shiftKey ? 'forward' : 'backward',
            );

            return true;
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
        elemStyle.setProperty('background-color', 'rgb(172, 206, 247)');
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

const adjustFocusNodeInDirection = (
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
        tableSelection.adjustFocusCellForSelection(
          tableNode.getCellFromCordsOrThrow(
            x + (isForward ? 1 : -1),
            y,
            tableSelection.grid,
          ),
        );
      }

      return true;
    }

    case 'up': {
      if (y !== 0) {
        tableSelection.adjustFocusCellForSelection(
          tableNode.getCellFromCordsOrThrow(x, y - 1, tableSelection.grid),
        );
        return true;
      } else {
        return false;
      }
    }

    case 'down': {
      if (y !== tableSelection.grid.rows - 1) {
        tableSelection.adjustFocusCellForSelection(
          tableNode.getCellFromCordsOrThrow(x, y + 1, tableSelection.grid),
        );
        return true;
      } else {
        return false;
      }
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
