/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {TableNode} from './LexicalTableNode';
import type {Cell, Cells, Grid} from './LexicalTableSelection';
import type {
  GridSelection,
  LexicalCommand,
  LexicalEditor,
  LexicalNode,
  NodeSelection,
  RangeSelection,
  TextFormatType,
} from 'lexical';

import {TableCellNode} from '@lexical/table';
import {$findMatchingParent} from '@lexical/utils';
import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getNearestNodeFromDOMNode,
  $getPreviousSelection,
  $getSelection,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  $setSelection,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_HIGH,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  DELETE_CHARACTER_COMMAND,
  DELETE_LINE_COMMAND,
  DELETE_WORD_COMMAND,
  DEPRECATED_$createGridSelection,
  DEPRECATED_$isGridSelection,
  FOCUS_COMMAND,
  FORMAT_TEXT_COMMAND,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_TAB_COMMAND,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';

import {$isTableCellNode} from './LexicalTableCellNode';
import {TableSelection} from './LexicalTableSelection';

const LEXICAL_ELEMENT_KEY = '__lexicalTableSelection';

export function applyTableHandlers(
  tableNode: TableNode,
  tableElement: HTMLTableElementWithWithTableSelectionState,
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
    const cell = getCellFromTarget(event.target as Node);

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

      const cell = getCellFromTarget(event.target as Node);

      if (cell !== null) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        tableSelection.setAnchorCellForSelection(cell);
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
      const cell = getCellFromTarget(event.target as Node);

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

  // Select entire table at this point, when grid selection is ready.
  tableElement.addEventListener('mouseleave', () => {
    if (isMouseDown) {
      return;
    }
  });

  // Clear selection when clicking outside of dom.
  const mouseDownCallback = (event: MouseEvent) => {
    isMouseDown = true;

    if (event.button !== 0) {
      return;
    }

    editor.update(() => {
      const selection = $getSelection();

      if (
        DEPRECATED_$isGridSelection(selection) &&
        selection.gridKey === tableSelection.tableNodeKey &&
        rootElement.contains(event.target as Node)
      ) {
        return tableSelection.clearHighlight();
      }
    });
  };

  window.addEventListener('mousedown', mouseDownCallback);

  tableSelection.listenersToRemove.add(() =>
    window.removeEventListener('mousedown', mouseDownCallback),
  );

  const mouseUpCallback = (event: MouseEvent) => {
    if (isMouseDown) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      isMouseDown = false;
    }
  };

  window.addEventListener('mouseup', mouseUpCallback);

  tableSelection.listenersToRemove.add(() =>
    window.removeEventListener('mouseup', mouseUpCallback),
  );

  tableSelection.listenersToRemove.add(() =>
    tableElement.addEventListener('mouseup', mouseUpCallback),
  );

  tableSelection.listenersToRemove.add(() =>
    tableElement.removeEventListener('mouseup', mouseUpCallback),
  );

  tableSelection.listenersToRemove.add(
    editor.registerCommand<KeyboardEvent>(
      KEY_ARROW_DOWN_COMMAND,
      (event) => {
        const selection = $getSelection();

        if (!$isSelectionInTable(selection, tableNode)) {
          return false;
        }

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
        } else if (DEPRECATED_$isGridSelection(selection) && event.shiftKey) {
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
      COMMAND_PRIORITY_HIGH,
    ),
  );

  tableSelection.listenersToRemove.add(
    editor.registerCommand<KeyboardEvent>(
      KEY_ARROW_UP_COMMAND,
      (event) => {
        const selection = $getSelection();

        if (!$isSelectionInTable(selection, tableNode)) {
          return false;
        }

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
        } else if (DEPRECATED_$isGridSelection(selection) && event.shiftKey) {
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
      COMMAND_PRIORITY_HIGH,
    ),
  );

  tableSelection.listenersToRemove.add(
    editor.registerCommand<KeyboardEvent>(
      KEY_ARROW_LEFT_COMMAND,
      (event) => {
        const selection = $getSelection();

        if (!$isSelectionInTable(selection, tableNode)) {
          return false;
        }

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
        } else if (DEPRECATED_$isGridSelection(selection) && event.shiftKey) {
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
      COMMAND_PRIORITY_HIGH,
    ),
  );

  tableSelection.listenersToRemove.add(
    editor.registerCommand<KeyboardEvent>(
      KEY_ARROW_RIGHT_COMMAND,
      (event) => {
        const selection = $getSelection();

        if (!$isSelectionInTable(selection, tableNode)) {
          return false;
        }

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
        } else if (DEPRECATED_$isGridSelection(selection) && event.shiftKey) {
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
      COMMAND_PRIORITY_HIGH,
    ),
  );

  const deleteTextHandler = (command: LexicalCommand<boolean>) => () => {
    const selection = $getSelection();

    if (!$isSelectionInTable(selection, tableNode)) {
      return false;
    }

    if (DEPRECATED_$isGridSelection(selection)) {
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

      const anchorNode = selection.anchor.getNode();
      const focusNode = selection.focus.getNode();
      const isAnchorInside = tableNode.isParentOf(anchorNode);
      const isFocusInside = tableNode.isParentOf(focusNode);

      const selectionContainsPartialTable =
        (isAnchorInside && !isFocusInside) ||
        (isFocusInside && !isAnchorInside);

      if (selectionContainsPartialTable) {
        tableSelection.clearText();
        return true;
      }

      const parentElementNode = $findMatchingParent(
        selection.anchor.getNode(),
        (n) => $isElementNode(n) && $isTableCellNode(n.getParent()),
      );

      const nearestElementNode = $findMatchingParent(
        selection.anchor.getNode(),
        (n) => $isElementNode(n),
      );

      if (
        !$isElementNode(parentElementNode) ||
        !$isElementNode(nearestElementNode)
      ) {
        return false;
      }

      const clearCell = () => {
        const newParagraphNode = $createParagraphNode();
        const textNode = $createTextNode();
        newParagraphNode.append(textNode);
        tableCellNode.append(newParagraphNode);
        tableCellNode.getChildren().forEach((child) => {
          if (child !== newParagraphNode) {
            child.remove();
          }
        });
      };

      if (
        command === DELETE_LINE_COMMAND &&
        parentElementNode.getPreviousSibling() === null
      ) {
        clearCell();
        return true;
      }

      if (
        command === DELETE_CHARACTER_COMMAND ||
        command === DELETE_WORD_COMMAND
      ) {
        if (
          selection.isCollapsed() &&
          selection.anchor.offset === 0 &&
          parentElementNode === nearestElementNode &&
          parentElementNode.getPreviousSibling() === null
        ) {
          return true;
        }

        if (
          !$isParagraphNode(parentElementNode) &&
          parentElementNode.getTextContentSize() === 0
        ) {
          clearCell();
          return true;
        }
      }
    }

    return false;
  };

  [DELETE_WORD_COMMAND, DELETE_LINE_COMMAND, DELETE_CHARACTER_COMMAND].forEach(
    (command) => {
      tableSelection.listenersToRemove.add(
        editor.registerCommand(
          command,
          deleteTextHandler(command),
          COMMAND_PRIORITY_CRITICAL,
        ),
      );
    },
  );

  const deleteCellHandler = (event: KeyboardEvent): boolean => {
    const selection = $getSelection();

    if (!$isSelectionInTable(selection, tableNode)) {
      return false;
    }

    if (DEPRECATED_$isGridSelection(selection)) {
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
  };

  tableSelection.listenersToRemove.add(
    editor.registerCommand<KeyboardEvent>(
      KEY_BACKSPACE_COMMAND,
      deleteCellHandler,
      COMMAND_PRIORITY_CRITICAL,
    ),
  );

  tableSelection.listenersToRemove.add(
    editor.registerCommand<KeyboardEvent>(
      KEY_DELETE_COMMAND,
      deleteCellHandler,
      COMMAND_PRIORITY_CRITICAL,
    ),
  );

  tableSelection.listenersToRemove.add(
    editor.registerCommand<TextFormatType>(
      FORMAT_TEXT_COMMAND,
      (payload) => {
        const selection = $getSelection();

        if (!$isSelectionInTable(selection, tableNode)) {
          return false;
        }

        if (DEPRECATED_$isGridSelection(selection)) {
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
      CONTROLLED_TEXT_INSERTION_COMMAND,
      (payload) => {
        const selection = $getSelection();

        if (!$isSelectionInTable(selection, tableNode)) {
          return false;
        }

        if (DEPRECATED_$isGridSelection(selection)) {
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
    editor.registerCommand<KeyboardEvent>(
      KEY_TAB_COMMAND,
      (event) => {
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
      COMMAND_PRIORITY_HIGH,
    ),
  );

  tableSelection.listenersToRemove.add(
    editor.registerCommand(
      FOCUS_COMMAND,
      (payload) => {
        return tableNode.isSelected();
      },
      COMMAND_PRIORITY_HIGH,
    ),
  );

  tableSelection.listenersToRemove.add(
    editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      (payload) => {
        const selection = $getSelection();
        const prevSelection = $getPreviousSelection();

        if (
          selection &&
          $isRangeSelection(selection) &&
          !selection.isCollapsed()
        ) {
          const anchorNode = selection.anchor.getNode();
          const focusNode = selection.focus.getNode();
          const isAnchorInside = tableNode.isParentOf(anchorNode);
          const isFocusInside = tableNode.isParentOf(focusNode);

          const selectionContainsPartialTable =
            (isAnchorInside && !isFocusInside) ||
            (isFocusInside && !isAnchorInside);

          const selectionIsInsideTable =
            isAnchorInside && isFocusInside && !tableNode.isSelected();

          if (selectionContainsPartialTable) {
            const isBackward = selection.isBackward();
            const modifiedSelection = $createRangeSelection();
            const tableKey = tableNode.getKey();

            modifiedSelection.anchor.set(
              selection.anchor.key,
              selection.anchor.offset,
              selection.anchor.type,
            );

            modifiedSelection.focus.set(
              tableKey,
              isBackward ? 0 : tableNode.getChildrenSize(),
              'element',
            );

            isRangeSelectionHijacked = true;
            $setSelection(modifiedSelection);
            $addHighlightStyleToTable(tableSelection);

            return true;
          } else if (selectionIsInsideTable) {
            const {grid} = tableSelection;

            if (
              selection.getNodes().filter($isTableCellNode).length ===
              grid.rows * grid.columns
            ) {
              const gridSelection = DEPRECATED_$createGridSelection();
              const tableKey = tableNode.getKey();

              const firstCell = tableNode
                .getFirstChildOrThrow()
                .getFirstChild();

              const lastCell = tableNode.getLastChildOrThrow().getLastChild();

              if (firstCell != null && lastCell != null) {
                gridSelection.set(
                  tableKey,
                  firstCell.getKey(),
                  lastCell.getKey(),
                );

                $setSelection(gridSelection);
                tableSelection.updateTableGridSelection(gridSelection);

                return true;
              }
            }
          }
        }

        if (
          selection &&
          !selection.is(prevSelection) &&
          (DEPRECATED_$isGridSelection(selection) ||
            DEPRECATED_$isGridSelection(prevSelection)) &&
          tableSelection.gridSelection &&
          !tableSelection.gridSelection.is(prevSelection)
        ) {
          if (
            DEPRECATED_$isGridSelection(selection) &&
            selection.gridKey === tableSelection.tableNodeKey
          ) {
            tableSelection.updateTableGridSelection(selection);
          } else if (
            !DEPRECATED_$isGridSelection(selection) &&
            DEPRECATED_$isGridSelection(prevSelection) &&
            prevSelection.gridKey === tableSelection.tableNodeKey
          ) {
            tableSelection.updateTableGridSelection(null);
          }
          return false;
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

export type HTMLTableElementWithWithTableSelectionState = HTMLTableElement &
  Record<typeof LEXICAL_ELEMENT_KEY, TableSelection>;

export function attachTableSelectionToTableElement(
  tableElement: HTMLTableElementWithWithTableSelectionState,
  tableSelection: TableSelection,
) {
  tableElement[LEXICAL_ELEMENT_KEY] = tableSelection;
}

export function getTableSelectionFromTableElement(
  tableElement: HTMLTableElementWithWithTableSelectionState,
): TableSelection | null {
  return tableElement[LEXICAL_ELEMENT_KEY];
}

export function getCellFromTarget(node: Node): Cell | null {
  let currentNode: ParentNode | Node | null = node;

  while (currentNode != null) {
    const nodeName = currentNode.nodeName;

    if (nodeName === 'TD' || nodeName === 'TH') {
      // @ts-expect-error: internal field
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
      const elem = currentNode as HTMLElement;
      const cell = {
        elem,
        highlighted: false,
        x,
        y,
      };

      // @ts-expect-error: internal field
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
  const highlightedCells: Array<Cell> = [];
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
    cords: {
      x: number;
      y: number;
    },
  ) => void,
) {
  const {cells} = grid;

  for (let y = 0; y < cells.length; y++) {
    const row = cells[y];

    for (let x = 0; x < row.length; x++) {
      const cell = row[x];
      const lexicalNode = $getNearestNodeFromDOMNode(cell.elem);

      if (lexicalNode !== null) {
        cb(cell, lexicalNode, {
          x,
          y,
        });
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
  const isForward = direction === 'forward';

  switch (direction) {
    case 'backward':
    case 'forward':
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

    case 'up':
      if (y !== 0) {
        selectTableCellNode(
          tableNode.getCellNodeFromCordsOrThrow(x, y - 1, tableSelection.grid),
        );
      } else {
        tableNode.selectPrevious();
      }

      return true;

    case 'down':
      if (y !== tableSelection.grid.rows - 1) {
        selectTableCellNode(
          tableNode.getCellNodeFromCordsOrThrow(x, y + 1, tableSelection.grid),
        );
      } else {
        tableNode.selectNext();
      }

      return true;
    default:
      return false;
  }
};

const adjustFocusNodeInDirection = (
  tableSelection: TableSelection,
  tableNode: TableNode,
  x: number,
  y: number,
  direction: 'backward' | 'forward' | 'up' | 'down',
): boolean => {
  const isForward = direction === 'forward';

  switch (direction) {
    case 'backward':
    case 'forward':
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
    case 'up':
      if (y !== 0) {
        tableSelection.adjustFocusCellForSelection(
          tableNode.getCellFromCordsOrThrow(x, y - 1, tableSelection.grid),
        );

        return true;
      } else {
        return false;
      }
    case 'down':
      if (y !== tableSelection.grid.rows - 1) {
        tableSelection.adjustFocusCellForSelection(
          tableNode.getCellFromCordsOrThrow(x, y + 1, tableSelection.grid),
        );

        return true;
      } else {
        return false;
      }
    default:
      return false;
  }
};

function $isSelectionInTable(
  selection: null | GridSelection | RangeSelection | NodeSelection,
  tableNode: TableNode,
): boolean {
  if ($isRangeSelection(selection) || DEPRECATED_$isGridSelection(selection)) {
    const isAnchorInside = tableNode.isParentOf(selection.anchor.getNode());
    const isFocusInside = tableNode.isParentOf(selection.focus.getNode());

    return isAnchorInside && isFocusInside;
  }

  return false;
}

function selectTableCellNode(tableCell: TableCellNode) {
  const possibleParagraph = tableCell
    .getChildren()
    .find((n) => $isParagraphNode(n));

  if ($isParagraphNode(possibleParagraph)) {
    possibleParagraph.selectEnd();
  } else {
    tableCell.selectEnd();
  }
}
