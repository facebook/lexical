/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {TableCellNode} from './LexicalTableCellNode';
import type {TableNode} from './LexicalTableNode';
import type {TableDOMCell, TableDOMRows} from './LexicalTableObserver';
import type {TableSelection} from './LexicalTableSelection';
import type {
  BaseSelection,
  LexicalCommand,
  LexicalEditor,
  LexicalNode,
  RangeSelection,
  TextFormatType,
} from 'lexical';

import {$findMatchingParent} from '@lexical/utils';
import {
  $createParagraphNode,
  $getNearestNodeFromDOMNode,
  $getPreviousSelection,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_HIGH,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  DELETE_CHARACTER_COMMAND,
  DELETE_LINE_COMMAND,
  DELETE_WORD_COMMAND,
  FOCUS_COMMAND,
  FORMAT_TEXT_COMMAND,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
  SELECTION_CHANGE_COMMAND,
  SELECTION_INSERT_CLIPBOARD_NODES_COMMAND,
} from 'lexical';
import invariant from 'shared/invariant';

import {$isTableCellNode} from './LexicalTableCellNode';
import {$isTableNode} from './LexicalTableNode';
import {TableDOMTable, TableObserver} from './LexicalTableObserver';
import {$isTableRowNode} from './LexicalTableRowNode';
import {
  $createTableSelection,
  $isTableSelection,
} from './LexicalTableSelection';

const LEXICAL_ELEMENT_KEY = '__lexicalTableSelection';

export function applyTableHandlers(
  tableNode: TableNode,
  tableElement: HTMLTableElementWithWithTableSelectionState,
  editor: LexicalEditor,
  hasTabHandler: boolean,
): TableObserver {
  const rootElement = editor.getRootElement();

  if (rootElement === null) {
    throw new Error('No root element.');
  }

  const tableObserver = new TableObserver(editor, tableNode.getKey());
  const editorWindow = editor._window || window;

  attachTableObserverToTableElement(tableElement, tableObserver);

  tableElement.addEventListener('mousedown', (event: MouseEvent) => {
    setTimeout(() => {
      if (event.button !== 0) {
        return;
      }

      if (!editorWindow) {
        return;
      }

      const anchorCell = getDOMCellFromTarget(event.target as Node);
      if (anchorCell !== null) {
        stopEvent(event);
        tableObserver.setAnchorCellForSelection(anchorCell);
      }

      const onMouseUp = () => {
        editorWindow.removeEventListener('mouseup', onMouseUp);
        editorWindow.removeEventListener('mousemove', onMouseMove);
      };

      const onMouseMove = (moveEvent: MouseEvent) => {
        const focusCell = getDOMCellFromTarget(moveEvent.target as Node);
        if (
          focusCell !== null &&
          (tableObserver.anchorX !== focusCell.x ||
            tableObserver.anchorY !== focusCell.y)
        ) {
          moveEvent.preventDefault();
          tableObserver.setFocusCellForSelection(focusCell);
        }
      };

      editorWindow.addEventListener('mouseup', onMouseUp);
      editorWindow.addEventListener('mousemove', onMouseMove);
    }, 0);
  });

  // Clear selection when clicking outside of dom.
  const mouseDownCallback = (event: MouseEvent) => {
    if (event.button !== 0) {
      return;
    }

    editor.update(() => {
      const selection = $getSelection();
      const target = event.target as Node;
      if (
        $isTableSelection(selection) &&
        selection.tableKey === tableObserver.tableNodeKey &&
        rootElement.contains(target)
      ) {
        tableObserver.clearHighlight();
      }
    });
  };

  editorWindow.addEventListener('mousedown', mouseDownCallback);

  tableObserver.listenersToRemove.add(() =>
    editorWindow.removeEventListener('mousedown', mouseDownCallback),
  );

  tableObserver.listenersToRemove.add(
    editor.registerCommand<KeyboardEvent>(
      KEY_ARROW_DOWN_COMMAND,
      (event) =>
        $handleArrowKey(editor, event, 'down', tableNode, tableObserver),
      COMMAND_PRIORITY_HIGH,
    ),
  );

  tableObserver.listenersToRemove.add(
    editor.registerCommand<KeyboardEvent>(
      KEY_ARROW_UP_COMMAND,
      (event) => $handleArrowKey(editor, event, 'up', tableNode, tableObserver),
      COMMAND_PRIORITY_HIGH,
    ),
  );

  tableObserver.listenersToRemove.add(
    editor.registerCommand<KeyboardEvent>(
      KEY_ARROW_LEFT_COMMAND,
      (event) =>
        $handleArrowKey(editor, event, 'backward', tableNode, tableObserver),
      COMMAND_PRIORITY_HIGH,
    ),
  );

  tableObserver.listenersToRemove.add(
    editor.registerCommand<KeyboardEvent>(
      KEY_ARROW_RIGHT_COMMAND,
      (event) =>
        $handleArrowKey(editor, event, 'forward', tableNode, tableObserver),
      COMMAND_PRIORITY_HIGH,
    ),
  );

  tableObserver.listenersToRemove.add(
    editor.registerCommand<KeyboardEvent>(
      KEY_ESCAPE_COMMAND,
      (event) => {
        const selection = $getSelection();
        if ($isTableSelection(selection)) {
          const focusCellNode = $findMatchingParent(
            selection.focus.getNode(),
            $isTableCellNode,
          );
          if ($isTableCellNode(focusCellNode)) {
            stopEvent(event);
            focusCellNode.selectEnd();
            return true;
          }
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

    if ($isTableSelection(selection)) {
      tableObserver.clearText();

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
        tableObserver.clearText();
        return true;
      }

      const nearestElementNode = $findMatchingParent(
        selection.anchor.getNode(),
        (n) => $isElementNode(n),
      );

      const topLevelCellElementNode =
        nearestElementNode &&
        $findMatchingParent(
          nearestElementNode,
          (n) => $isElementNode(n) && $isTableCellNode(n.getParent()),
        );

      if (
        !$isElementNode(topLevelCellElementNode) ||
        !$isElementNode(nearestElementNode)
      ) {
        return false;
      }

      if (
        command === DELETE_LINE_COMMAND &&
        topLevelCellElementNode.getPreviousSibling() === null
      ) {
        // TODO: Fix Delete Line in Table Cells.
        return true;
      }

      if (
        command === DELETE_CHARACTER_COMMAND ||
        command === DELETE_WORD_COMMAND
      ) {
        if (selection.isCollapsed() && selection.anchor.offset === 0) {
          if (nearestElementNode !== topLevelCellElementNode) {
            const children = nearestElementNode.getChildren();
            const newParagraphNode = $createParagraphNode();
            children.forEach((child) => newParagraphNode.append(child));
            nearestElementNode.replace(newParagraphNode);
            nearestElementNode.getWritable().__parent = tableCellNode.getKey();
            return true;
          }
        }
      }
    }

    return false;
  };

  [DELETE_WORD_COMMAND, DELETE_LINE_COMMAND, DELETE_CHARACTER_COMMAND].forEach(
    (command) => {
      tableObserver.listenersToRemove.add(
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

    if ($isTableSelection(selection)) {
      event.preventDefault();
      event.stopPropagation();
      tableObserver.clearText();

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

  tableObserver.listenersToRemove.add(
    editor.registerCommand<KeyboardEvent>(
      KEY_BACKSPACE_COMMAND,
      deleteCellHandler,
      COMMAND_PRIORITY_CRITICAL,
    ),
  );

  tableObserver.listenersToRemove.add(
    editor.registerCommand<KeyboardEvent>(
      KEY_DELETE_COMMAND,
      deleteCellHandler,
      COMMAND_PRIORITY_CRITICAL,
    ),
  );

  tableObserver.listenersToRemove.add(
    editor.registerCommand<TextFormatType>(
      FORMAT_TEXT_COMMAND,
      (payload) => {
        const selection = $getSelection();

        if (!$isSelectionInTable(selection, tableNode)) {
          return false;
        }

        if ($isTableSelection(selection)) {
          tableObserver.formatCells(payload);

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

  tableObserver.listenersToRemove.add(
    editor.registerCommand(
      CONTROLLED_TEXT_INSERTION_COMMAND,
      (payload) => {
        const selection = $getSelection();

        if (!$isSelectionInTable(selection, tableNode)) {
          return false;
        }

        if ($isTableSelection(selection)) {
          tableObserver.clearHighlight();

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

  if (hasTabHandler) {
    tableObserver.listenersToRemove.add(
      editor.registerCommand<KeyboardEvent>(
        KEY_TAB_COMMAND,
        (event) => {
          const selection = $getSelection();
          if (
            !$isRangeSelection(selection) ||
            !selection.isCollapsed() ||
            !$isSelectionInTable(selection, tableNode)
          ) {
            return false;
          }

          const tableCellNode = $findCellNode(selection.anchor.getNode());
          if (tableCellNode === null) {
            return false;
          }

          stopEvent(event);

          const currentCords = tableNode.getCordsFromCellNode(
            tableCellNode,
            tableObserver.table,
          );

          selectTableNodeInDirection(
            tableObserver,
            tableNode,
            currentCords.x,
            currentCords.y,
            !event.shiftKey ? 'forward' : 'backward',
          );

          return true;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
    );
  }

  tableObserver.listenersToRemove.add(
    editor.registerCommand(
      FOCUS_COMMAND,
      (payload) => {
        return tableNode.isSelected();
      },
      COMMAND_PRIORITY_HIGH,
    ),
  );

  function getObserverCellFromCellNode(
    tableCellNode: TableCellNode,
  ): TableDOMCell {
    const currentCords = tableNode.getCordsFromCellNode(
      tableCellNode,
      tableObserver.table,
    );
    return tableNode.getDOMCellFromCordsOrThrow(
      currentCords.x,
      currentCords.y,
      tableObserver.table,
    );
  }

  tableObserver.listenersToRemove.add(
    editor.registerCommand(
      SELECTION_INSERT_CLIPBOARD_NODES_COMMAND,
      (selectionPayload) => {
        const {nodes, selection} = selectionPayload;
        const anchorAndFocus = selection.getStartEndPoints();
        const isTableSelection = $isTableSelection(selection);
        const isRangeSelection = $isRangeSelection(selection);
        const isSelectionInsideOfGrid =
          (isRangeSelection &&
            $findMatchingParent(selection.anchor.getNode(), (n) =>
              $isTableCellNode(n),
            ) !== null &&
            $findMatchingParent(selection.focus.getNode(), (n) =>
              $isTableCellNode(n),
            ) !== null) ||
          isTableSelection;

        if (
          nodes.length !== 1 ||
          !$isTableNode(nodes[0]) ||
          !isSelectionInsideOfGrid ||
          anchorAndFocus === null
        ) {
          return false;
        }
        const [anchor] = anchorAndFocus;

        const newGrid = nodes[0];
        const newGridRows = newGrid.getChildren();
        const newColumnCount = newGrid
          .getFirstChildOrThrow<TableNode>()
          .getChildrenSize();
        const newRowCount = newGrid.getChildrenSize();
        const gridCellNode = $findMatchingParent(anchor.getNode(), (n) =>
          $isTableCellNode(n),
        );
        const gridRowNode =
          gridCellNode &&
          $findMatchingParent(gridCellNode, (n) => $isTableRowNode(n));
        const gridNode =
          gridRowNode &&
          $findMatchingParent(gridRowNode, (n) => $isTableNode(n));

        if (
          !$isTableCellNode(gridCellNode) ||
          !$isTableRowNode(gridRowNode) ||
          !$isTableNode(gridNode)
        ) {
          return false;
        }

        const startY = gridRowNode.getIndexWithinParent();
        const stopY = Math.min(
          gridNode.getChildrenSize() - 1,
          startY + newRowCount - 1,
        );
        const startX = gridCellNode.getIndexWithinParent();
        const stopX = Math.min(
          gridRowNode.getChildrenSize() - 1,
          startX + newColumnCount - 1,
        );
        const fromX = Math.min(startX, stopX);
        const fromY = Math.min(startY, stopY);
        const toX = Math.max(startX, stopX);
        const toY = Math.max(startY, stopY);
        const gridRowNodes = gridNode.getChildren();
        let newRowIdx = 0;
        let newAnchorCellKey;
        let newFocusCellKey;

        for (let r = fromY; r <= toY; r++) {
          const currentGridRowNode = gridRowNodes[r];

          if (!$isTableRowNode(currentGridRowNode)) {
            return false;
          }

          const newGridRowNode = newGridRows[newRowIdx];

          if (!$isTableRowNode(newGridRowNode)) {
            return false;
          }

          const gridCellNodes = currentGridRowNode.getChildren();
          const newGridCellNodes = newGridRowNode.getChildren();
          let newColumnIdx = 0;

          for (let c = fromX; c <= toX; c++) {
            const currentGridCellNode = gridCellNodes[c];

            if (!$isTableCellNode(currentGridCellNode)) {
              return false;
            }

            const newGridCellNode = newGridCellNodes[newColumnIdx];

            if (!$isTableCellNode(newGridCellNode)) {
              return false;
            }

            if (r === fromY && c === fromX) {
              newAnchorCellKey = currentGridCellNode.getKey();
            } else if (r === toY && c === toX) {
              newFocusCellKey = currentGridCellNode.getKey();
            }

            const originalChildren = currentGridCellNode.getChildren();
            newGridCellNode.getChildren().forEach((child) => {
              if ($isTextNode(child)) {
                const paragraphNode = $createParagraphNode();
                paragraphNode.append(child);
                currentGridCellNode.append(child);
              } else {
                currentGridCellNode.append(child);
              }
            });
            originalChildren.forEach((n) => n.remove());
            newColumnIdx++;
          }

          newRowIdx++;
        }
        if (newAnchorCellKey && newFocusCellKey) {
          const newTableSelection = $createTableSelection();
          newTableSelection.set(
            nodes[0].getKey(),
            newAnchorCellKey,
            newFocusCellKey,
          );
          $setSelection(newTableSelection);
        }
        return true;
      },
      COMMAND_PRIORITY_CRITICAL,
    ),
  );

  tableObserver.listenersToRemove.add(
    editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        const selection = $getSelection();
        const prevSelection = $getPreviousSelection();

        if ($isRangeSelection(selection)) {
          const {anchor, focus} = selection;
          const anchorNode = anchor.getNode();
          const focusNode = focus.getNode();
          // Using explicit comparison with table node to ensure it's not a nested table
          // as in that case we'll leave selection resolving to that table
          const anchorCellNode = $findCellNode(anchorNode);
          const focusCellNode = $findCellNode(focusNode);
          const isAnchorInside = !!(
            anchorCellNode && tableNode.is($findTableNode(anchorCellNode))
          );
          const isFocusInside = !!(
            focusCellNode && tableNode.is($findTableNode(focusCellNode))
          );
          const isPartialyWithinTable = isAnchorInside !== isFocusInside;
          const isWithinTable = isAnchorInside && isFocusInside;
          const isBackward = selection.isBackward();

          if (isPartialyWithinTable) {
            const newSelection = selection.clone();
            newSelection.focus.set(
              tableNode.getKey(),
              isBackward ? 0 : tableNode.getChildrenSize(),
              'element',
            );
            $setSelection(newSelection);
            $addHighlightStyleToTable(editor, tableObserver);
          } else if (isWithinTable) {
            // Handle case when selection spans across multiple cells but still
            // has range selection, then we convert it into grid selection
            if (!anchorCellNode.is(focusCellNode)) {
              tableObserver.setAnchorCellForSelection(
                getObserverCellFromCellNode(anchorCellNode),
              );
              tableObserver.setFocusCellForSelection(
                getObserverCellFromCellNode(focusCellNode),
                true,
              );
            }
          }
        }

        if (
          selection &&
          !selection.is(prevSelection) &&
          ($isTableSelection(selection) || $isTableSelection(prevSelection)) &&
          tableObserver.tableSelection &&
          !tableObserver.tableSelection.is(prevSelection)
        ) {
          if (
            $isTableSelection(selection) &&
            selection.tableKey === tableObserver.tableNodeKey
          ) {
            tableObserver.updateTableTableSelection(selection);
          } else if (
            !$isTableSelection(selection) &&
            $isTableSelection(prevSelection) &&
            prevSelection.tableKey === tableObserver.tableNodeKey
          ) {
            tableObserver.updateTableTableSelection(null);
          }
          return false;
        }

        if (
          tableObserver.hasHijackedSelectionStyles &&
          !tableNode.isSelected()
        ) {
          $removeHighlightStyleToTable(editor, tableObserver);
        } else if (
          !tableObserver.hasHijackedSelectionStyles &&
          tableNode.isSelected()
        ) {
          $addHighlightStyleToTable(editor, tableObserver);
        }

        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    ),
  );

  return tableObserver;
}

export type HTMLTableElementWithWithTableSelectionState = HTMLTableElement &
  Record<typeof LEXICAL_ELEMENT_KEY, TableObserver>;

export function attachTableObserverToTableElement(
  tableElement: HTMLTableElementWithWithTableSelectionState,
  tableObserver: TableObserver,
) {
  tableElement[LEXICAL_ELEMENT_KEY] = tableObserver;
}

export function getTableObserverFromTableElement(
  tableElement: HTMLTableElementWithWithTableSelectionState,
): TableObserver | null {
  return tableElement[LEXICAL_ELEMENT_KEY];
}

export function getDOMCellFromTarget(node: Node): TableDOMCell | null {
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

export function doesTargetContainText(node: Node): boolean {
  const currentNode: ParentNode | Node | null = node;

  if (currentNode !== null) {
    const nodeName = currentNode.nodeName;

    if (nodeName === 'SPAN') {
      return true;
    }
  }
  return false;
}

export function getTable(tableElement: HTMLElement): TableDOMTable {
  const domRows: TableDOMRows = [];
  const grid = {
    columns: 0,
    domRows,
    rows: 0,
  };
  let currentNode = tableElement.firstChild;
  let x = 0;
  let y = 0;
  domRows.length = 0;

  while (currentNode != null) {
    const nodeMame = currentNode.nodeName;

    if (nodeMame === 'TD' || nodeMame === 'TH') {
      const elem = currentNode as HTMLElement;
      const cell = {
        elem,
        hasBackgroundColor: elem.style.backgroundColor !== '',
        highlighted: false,
        x,
        y,
      };

      // @ts-expect-error: internal field
      currentNode._cell = cell;

      let row = domRows[y];
      if (row === undefined) {
        row = domRows[y] = [];
      }

      row[x] = cell;
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
  editor: LexicalEditor,
  table: TableDOMTable,
  selection: TableSelection | RangeSelection | null,
) {
  const selectedCellNodes = new Set(selection ? selection.getNodes() : []);
  $forEachTableCell(table, (cell, lexicalNode) => {
    const elem = cell.elem;

    if (selectedCellNodes.has(lexicalNode)) {
      cell.highlighted = true;
      $addHighlightToDOM(editor, cell);
    } else {
      cell.highlighted = false;
      $removeHighlightFromDOM(editor, cell);
      if (!elem.getAttribute('style')) {
        elem.removeAttribute('style');
      }
    }
  });
}

export function $forEachTableCell(
  grid: TableDOMTable,
  cb: (
    cell: TableDOMCell,
    lexicalNode: LexicalNode,
    cords: {
      x: number;
      y: number;
    },
  ) => void,
) {
  const {domRows} = grid;

  for (let y = 0; y < domRows.length; y++) {
    const row = domRows[y];
    if (!row) {
      continue;
    }

    for (let x = 0; x < row.length; x++) {
      const cell = row[x];
      if (!cell) {
        continue;
      }
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

export function $addHighlightStyleToTable(
  editor: LexicalEditor,
  tableSelection: TableObserver,
) {
  tableSelection.disableHighlightStyle();
  $forEachTableCell(tableSelection.table, (cell) => {
    cell.highlighted = true;
    $addHighlightToDOM(editor, cell);
  });
}

export function $removeHighlightStyleToTable(
  editor: LexicalEditor,
  tableObserver: TableObserver,
) {
  tableObserver.enableHighlightStyle();
  $forEachTableCell(tableObserver.table, (cell) => {
    const elem = cell.elem;
    cell.highlighted = false;
    $removeHighlightFromDOM(editor, cell);

    if (!elem.getAttribute('style')) {
      elem.removeAttribute('style');
    }
  });
}

type Direction = 'backward' | 'forward' | 'up' | 'down';

const selectTableNodeInDirection = (
  tableObserver: TableObserver,
  tableNode: TableNode,
  x: number,
  y: number,
  direction: Direction,
): boolean => {
  const isForward = direction === 'forward';

  switch (direction) {
    case 'backward':
    case 'forward':
      if (x !== (isForward ? tableObserver.table.columns - 1 : 0)) {
        selectTableCellNode(
          tableNode.getCellNodeFromCordsOrThrow(
            x + (isForward ? 1 : -1),
            y,
            tableObserver.table,
          ),
          isForward,
        );
      } else {
        if (y !== (isForward ? tableObserver.table.rows - 1 : 0)) {
          selectTableCellNode(
            tableNode.getCellNodeFromCordsOrThrow(
              isForward ? 0 : tableObserver.table.columns - 1,
              y + (isForward ? 1 : -1),
              tableObserver.table,
            ),
            isForward,
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
          tableNode.getCellNodeFromCordsOrThrow(x, y - 1, tableObserver.table),
          false,
        );
      } else {
        tableNode.selectPrevious();
      }

      return true;

    case 'down':
      if (y !== tableObserver.table.rows - 1) {
        selectTableCellNode(
          tableNode.getCellNodeFromCordsOrThrow(x, y + 1, tableObserver.table),
          true,
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
  tableObserver: TableObserver,
  tableNode: TableNode,
  x: number,
  y: number,
  direction: Direction,
): boolean => {
  const isForward = direction === 'forward';

  switch (direction) {
    case 'backward':
    case 'forward':
      if (x !== (isForward ? tableObserver.table.columns - 1 : 0)) {
        tableObserver.setFocusCellForSelection(
          tableNode.getDOMCellFromCordsOrThrow(
            x + (isForward ? 1 : -1),
            y,
            tableObserver.table,
          ),
        );
      }

      return true;
    case 'up':
      if (y !== 0) {
        tableObserver.setFocusCellForSelection(
          tableNode.getDOMCellFromCordsOrThrow(x, y - 1, tableObserver.table),
        );

        return true;
      } else {
        return false;
      }
    case 'down':
      if (y !== tableObserver.table.rows - 1) {
        tableObserver.setFocusCellForSelection(
          tableNode.getDOMCellFromCordsOrThrow(x, y + 1, tableObserver.table),
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
  selection: null | BaseSelection,
  tableNode: TableNode,
): boolean {
  if ($isRangeSelection(selection) || $isTableSelection(selection)) {
    const isAnchorInside = tableNode.isParentOf(selection.anchor.getNode());
    const isFocusInside = tableNode.isParentOf(selection.focus.getNode());

    return isAnchorInside && isFocusInside;
  }

  return false;
}

function selectTableCellNode(tableCell: TableCellNode, fromStart: boolean) {
  if (fromStart) {
    tableCell.selectStart();
  } else {
    tableCell.selectEnd();
  }
}

const BROWSER_BLUE_RGB = '172,206,247';
function $addHighlightToDOM(editor: LexicalEditor, cell: TableDOMCell): void {
  const element = cell.elem;
  const node = $getNearestNodeFromDOMNode(element);
  invariant(
    $isTableCellNode(node),
    'Expected to find LexicalNode from Table Cell DOMNode',
  );
  const backgroundColor = node.getBackgroundColor();
  if (backgroundColor === null) {
    element.style.setProperty('background-color', `rgb(${BROWSER_BLUE_RGB})`);
  } else {
    element.style.setProperty(
      'background-image',
      `linear-gradient(to right, rgba(${BROWSER_BLUE_RGB},0.85), rgba(${BROWSER_BLUE_RGB},0.85))`,
    );
  }
  element.style.setProperty('caret-color', 'transparent');
}

function $removeHighlightFromDOM(
  editor: LexicalEditor,
  cell: TableDOMCell,
): void {
  const element = cell.elem;
  const node = $getNearestNodeFromDOMNode(element);
  invariant(
    $isTableCellNode(node),
    'Expected to find LexicalNode from Table Cell DOMNode',
  );
  const backgroundColor = node.getBackgroundColor();
  if (backgroundColor === null) {
    element.style.removeProperty('background-color');
  }
  element.style.removeProperty('background-image');
  element.style.removeProperty('caret-color');
}

function $findCellNode(node: LexicalNode): null | TableCellNode {
  const cellNode = $findMatchingParent(node, $isTableCellNode);
  return $isTableCellNode(cellNode) ? cellNode : null;
}

function $findTableNode(node: LexicalNode): null | TableNode {
  const tableNode = $findMatchingParent(node, $isTableNode);
  return $isTableNode(tableNode) ? tableNode : null;
}

function $handleArrowKey(
  editor: LexicalEditor,
  event: KeyboardEvent,
  direction: Direction,
  tableNode: TableNode,
  tableObserver: TableObserver,
): boolean {
  const selection = $getSelection();

  if (!$isSelectionInTable(selection, tableNode)) {
    return false;
  }

  if ($isRangeSelection(selection) && selection.isCollapsed()) {
    // Horizontal move between cels seem to work well without interruption
    // so just exit early, and handle vertical moves
    if (direction === 'backward' || direction === 'forward') {
      return false;
    }

    const {anchor, focus} = selection;
    const anchorCellNode = $findMatchingParent(
      anchor.getNode(),
      $isTableCellNode,
    );
    const focusCellNode = $findMatchingParent(
      focus.getNode(),
      $isTableCellNode,
    );
    if (
      !$isTableCellNode(anchorCellNode) ||
      !anchorCellNode.is(focusCellNode)
    ) {
      return false;
    }
    const anchorCellTable = $findTableNode(anchorCellNode);
    if (anchorCellTable !== tableNode && anchorCellTable != null) {
      const anchorCellTableElement = editor.getElementByKey(
        anchorCellTable.getKey(),
      );
      if (anchorCellTableElement != null) {
        tableObserver.table = getTable(anchorCellTableElement);
        return $handleArrowKey(
          editor,
          event,
          direction,
          anchorCellTable,
          tableObserver,
        );
      }
    }

    const anchorCellDom = editor.getElementByKey(anchorCellNode.__key);
    const anchorDOM = editor.getElementByKey(anchor.key);
    if (anchorDOM == null || anchorCellDom == null) {
      return false;
    }

    let edgeSelectionRect;
    if (anchor.type === 'element') {
      edgeSelectionRect = anchorDOM.getBoundingClientRect();
    } else {
      const domSelection = window.getSelection();
      if (domSelection === null || domSelection.rangeCount === 0) {
        return false;
      }

      const range = domSelection.getRangeAt(0);
      edgeSelectionRect = range.getBoundingClientRect();
    }

    const edgeChild =
      direction === 'up'
        ? anchorCellNode.getFirstChild()
        : anchorCellNode.getLastChild();
    if (edgeChild == null) {
      return false;
    }

    const edgeChildDOM = editor.getElementByKey(edgeChild.__key);

    if (edgeChildDOM == null) {
      return false;
    }

    const edgeRect = edgeChildDOM.getBoundingClientRect();
    const isExiting =
      direction === 'up'
        ? edgeRect.top > edgeSelectionRect.top - edgeSelectionRect.height
        : edgeSelectionRect.bottom + edgeSelectionRect.height > edgeRect.bottom;

    if (isExiting) {
      stopEvent(event);

      const cords = tableNode.getCordsFromCellNode(
        anchorCellNode,
        tableObserver.table,
      );

      if (event.shiftKey) {
        const cell = tableNode.getDOMCellFromCordsOrThrow(
          cords.x,
          cords.y,
          tableObserver.table,
        );
        tableObserver.setAnchorCellForSelection(cell);
        tableObserver.setFocusCellForSelection(cell, true);
      } else {
        return selectTableNodeInDirection(
          tableObserver,
          tableNode,
          cords.x,
          cords.y,
          direction,
        );
      }

      return true;
    }
  } else if ($isTableSelection(selection)) {
    const {anchor, focus} = selection;
    const anchorCellNode = $findMatchingParent(
      anchor.getNode(),
      $isTableCellNode,
    );
    const focusCellNode = $findMatchingParent(
      focus.getNode(),
      $isTableCellNode,
    );

    const [tableNodeFromSelection] = selection.getNodes();
    const tableElement = editor.getElementByKey(
      tableNodeFromSelection.getKey(),
    );
    if (
      !$isTableCellNode(anchorCellNode) ||
      !$isTableCellNode(focusCellNode) ||
      !$isTableNode(tableNodeFromSelection) ||
      tableElement == null
    ) {
      return false;
    }
    tableObserver.updateTableTableSelection(selection);

    const grid = getTable(tableElement);
    const cordsAnchor = tableNode.getCordsFromCellNode(anchorCellNode, grid);
    const anchorCell = tableNode.getDOMCellFromCordsOrThrow(
      cordsAnchor.x,
      cordsAnchor.y,
      grid,
    );
    tableObserver.setAnchorCellForSelection(anchorCell);

    stopEvent(event);

    if (event.shiftKey) {
      const cords = tableNode.getCordsFromCellNode(focusCellNode, grid);
      return adjustFocusNodeInDirection(
        tableObserver,
        tableNodeFromSelection,
        cords.x,
        cords.y,
        direction,
      );
    } else {
      focusCellNode.selectEnd();
    }

    return true;
  }

  return false;
}

function stopEvent(event: Event) {
  event.preventDefault();
  event.stopImmediatePropagation();
  event.stopPropagation();
}
