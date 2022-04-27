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
  GridSelection,
  LexicalEditor,
  LexicalNode,
  NodeSelection,
  RangeSelection,
} from 'lexical';

import {$findMatchingParent} from '@lexical/utils';
import {
  $createRangeSelection,
  $getNearestNodeFromDOMNode,
  $getPreviousSelection,
  $getSelection,
  $isElementNode,
  $isGridSelection,
  $isParagraphNode,
  $isRangeSelection,
  $setSelection,
  COMMAND_PRIORITY_CRITICAL,
  DELETE_CHARACTER_COMMAND,
  FOCUS_COMMAND,
  FORMAT_TEXT_COMMAND,
  INSERT_TEXT_COMMAND,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_TAB_COMMAND,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';

import {$isTableCellNode} from './LexicalTableCellNode';
import {TableSelection} from './LexicalTableSelection';

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
  let isRangeSelectionHijacked = false;

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
    if (isRangeSelectionHijacked) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }

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
    } else {
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
    isMouseDown = true;

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

  const mouseUpCallback = (event) => {
    isMouseDown = false;
  };

  window.addEventListener('mouseup', mouseUpCallback);

  tableSelection.listenersToRemove.add(() =>
    window.removeEventListener('mouseup', mouseUpCallback),
  );

  tableSelection.listenersToRemove.add(
    editor.registerCommand(
      KEY_ARROW_DOWN_COMMAND,
      (payload) => {
        const selection = $getSelection();

        if (!$isSelectionInTable(selection, tableNode)) {
          return false;
        }

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
      COMMAND_PRIORITY_CRITICAL,
    ),
  );
  tableSelection.listenersToRemove.add(
    editor.registerCommand(
      KEY_ARROW_UP_COMMAND,
      (payload) => {
        const selection = $getSelection();

        if (!$isSelectionInTable(selection, tableNode)) {
          return false;
        }

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
      COMMAND_PRIORITY_CRITICAL,
    ),
  );
  tableSelection.listenersToRemove.add(
    editor.registerCommand(
      KEY_ARROW_LEFT_COMMAND,
      (payload) => {
        const selection = $getSelection();

        if (!$isSelectionInTable(selection, tableNode)) {
          return false;
        }

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
      COMMAND_PRIORITY_CRITICAL,
    ),
  );
  tableSelection.listenersToRemove.add(
    editor.registerCommand(
      KEY_ARROW_RIGHT_COMMAND,
      (payload) => {
        const selection = $getSelection();

        if (!$isSelectionInTable(selection, tableNode)) {
          return false;
        }

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
      COMMAND_PRIORITY_CRITICAL,
    ),
  );
  tableSelection.listenersToRemove.add(
    editor.registerCommand(
      DELETE_CHARACTER_COMMAND,
      () => {
        const selection = $getSelection();

        if (!$isSelectionInTable(selection, tableNode)) {
          return false;
        }

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

          const paragraphNode = $findMatchingParent(
            selection.anchor.getNode(),
            (n) => $isParagraphNode(n),
          );

          if (!$isParagraphNode(paragraphNode)) {
            return false;
          }

          if (
            selection.isCollapsed() &&
            selection.anchor.offset === 0 &&
            paragraphNode.getPreviousSiblings().length === 0
          ) {
            return true;
          }
        }

        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    ),
  );
  tableSelection.listenersToRemove.add(
    editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      (payload) => {
        const selection = $getSelection();

        if (!$isSelectionInTable(selection, tableNode)) {
          return false;
        }

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
      COMMAND_PRIORITY_CRITICAL,
    ),
  );
  tableSelection.listenersToRemove.add(
    editor.registerCommand(
      FORMAT_TEXT_COMMAND,
      (payload) => {
        const selection = $getSelection();

        if (!$isSelectionInTable(selection, tableNode)) {
          return false;
        }

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
      COMMAND_PRIORITY_CRITICAL,
    ),
  );
  tableSelection.listenersToRemove.add(
    editor.registerCommand(
      INSERT_TEXT_COMMAND,
      (payload) => {
        const selection = $getSelection();

        if (!$isSelectionInTable(selection, tableNode)) {
          return false;
        }

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
      COMMAND_PRIORITY_CRITICAL,
    ),
  );
  tableSelection.listenersToRemove.add(
    editor.registerCommand(
      KEY_TAB_COMMAND,
      (payload) => {
        const selection = $getSelection();

        if (!$isSelectionInTable(selection, tableNode)) {
          return false;
        }

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
      COMMAND_PRIORITY_CRITICAL,
    ),
  );

  tableSelection.listenersToRemove.add(
    editor.registerCommand(
      FOCUS_COMMAND,
      (payload) => {
        return tableNode.isSelected();
      },
      COMMAND_PRIORITY_CRITICAL,
    ),
  );

  tableSelection.listenersToRemove.add(
    editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      (payload) => {
        const selection = $getSelection();
        const prevSelection = $getPreviousSelection();

        if (
          selection !== prevSelection &&
          ($isGridSelection(selection) || $isGridSelection(prevSelection)) &&
          tableSelection.gridSelection !== selection
        ) {
          tableSelection.updateTableGridSelection(
            $isGridSelection(selection) && tableNode.isSelected()
              ? selection
              : null,
          );

          return false;
        }

        if (
          selection &&
          $isRangeSelection(selection) &&
          !selection.isCollapsed()
        ) {
          const anchorNode = selection.anchor.getNode();
          const focusNode = selection.focus.getNode();
          const isAnchorInside = tableNode.isParentOf(anchorNode);
          const isFocusInside = tableNode.isParentOf(focusNode);
          const containsPartialTable =
            (isAnchorInside && !isFocusInside) ||
            (isFocusInside && !isAnchorInside);

          if (containsPartialTable) {
            const isBackward = selection.isBackward();
            const modifiedSelection = $createRangeSelection();
            const tableIndex = tableNode.getIndexWithinParent();
            const parentKey = tableNode.getParentOrThrow().getKey();
            modifiedSelection.anchor.set(
              selection.anchor.key,
              selection.anchor.offset,
              selection.anchor.type,
            );
            // Set selection to before or after table on the root node.
            modifiedSelection.focus.set(
              parentKey,
              isBackward ? tableIndex - 1 : tableIndex + 1,
              'element',
            );
            isRangeSelectionHijacked = true;
            $setSelection(modifiedSelection);
            $addHighlightStyleToTable(tableSelection);
            return true;
          }
        }

        if (
          tableSelection.hasHijackedSelectionStyles &&
          !tableNode.isSelected()
        ) {
          $removeHighlightStyleToTable(tableSelection);
          isRangeSelectionHijacked = false;
        } else if (
          !tableSelection.hasHijackedSelectionStyles &&
          tableNode.isSelected()
        ) {
          $addHighlightStyleToTable(tableSelection);
        }

        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
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
  selection: GridSelection | RangeSelection | null,
): Array<Cell> {
  const highlightedCells = [];
  const selectedCellNodes = new Set(selection ? selection.getNodes() : []);

  $forEachGridCell(grid, (cell, lexicalNode) => {
    const elem = cell.elem;

    if (selectedCellNodes.has(lexicalNode)) {
      cell.highlighted = true;
      elem.style.setProperty('background-color', 'rgb(172, 206, 247)');
      elem.style.setProperty('caret-color', 'transparent');
      highlightedCells.push(cell);
    } else {
      cell.highlighted = false;
      elem.style.removeProperty('background-color');
      elem.style.removeProperty('caret-color');

      if (!elem.getAttribute('style')) {
        elem.removeAttribute('style');
      }
    }
  });

  return highlightedCells;
}

export function $forEachGridCell(
  grid: Grid,
  cb: (
    cell: Cell,
    lexicalNode: LexicalNode,
    cords: {x: number, y: number},
  ) => void,
) {
  const {cells} = grid;
  for (let y = 0; y < cells.length; y++) {
    const row = cells[y];
    for (let x = 0; x < row.length; x++) {
      const cell = row[x];
      const lexicalNode = $getNearestNodeFromDOMNode(cell.elem);
      if (lexicalNode !== null) {
        cb(cell, lexicalNode, {x, y});
      }
    }
  }
}

export function $addHighlightStyleToTable(tableSelection: TableSelection) {
  tableSelection.disableHighlightStyle();
  $forEachGridCell(tableSelection.grid, (cell) => {
    const elem = cell.elem;
    cell.highlighted = true;
    elem.style.setProperty('background-color', 'rgb(172, 206, 247)');
    elem.style.setProperty('caret-color', 'transparent');
  });
}

export function $removeHighlightStyleToTable(tableSelection: TableSelection) {
  tableSelection.enableHighlightStyle();
  $forEachGridCell(tableSelection.grid, (cell) => {
    const elem = cell.elem;
    cell.highlighted = false;
    elem.style.removeProperty('background-color');
    elem.style.removeProperty('caret-color');
    if (!elem.getAttribute('style')) {
      elem.removeAttribute('style');
    }
  });
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

function $isSelectionInTable(
  selection: null | GridSelection | RangeSelection | NodeSelection,
  tableNode: TableNode,
): boolean {
  if ($isRangeSelection(selection) || $isGridSelection(selection)) {
    const isAnchorInside = tableNode.isParentOf(selection.anchor.getNode());
    const isFocusInside = tableNode.isParentOf(selection.focus.getNode());
    return isAnchorInside && isFocusInside;
  }
  return false;
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
