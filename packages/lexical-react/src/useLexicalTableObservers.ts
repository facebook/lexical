/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {
  HTMLTableElementWithWithTableSelectionState,
  TableCellNode,
  TableDOMCell,
} from '@lexical/table';
import type {LexicalCommand, NodeKey} from 'lexical';

import {
  $getClipboardDataFromSelection,
  copyToClipboard,
} from '@lexical/clipboard';
import {
  $addHighlightStyleToTable,
  $computeTableMap,
  $findCellNode,
  $findParentTableCellNodeInTable,
  $findTableNode,
  $getObserverCellFromCellNodeOrThrow,
  $getTableAndElementByKey,
  $getTableEdgeCursorPosition,
  $handleArrowKey,
  $insertParagraphAtTableEdge,
  $isFullTableSelection,
  $isSelectionInTable,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  $isTableSelection,
  $removeHighlightStyleToTable,
  $selectAdjacentCell,
  ARROW_KEY_COMMANDS_WITH_DIRECTION,
  DELETE_KEY_COMMANDS,
  DELETE_TEXT_COMMANDS,
  getDOMCellFromTarget,
  getDOMCellInTableFromTarget,
  getEditorWindow,
  isPointerDownOnEvent,
  LEXICAL_ELEMENT_KEY,
  stopEvent,
  TableNode,
  TableObserver,
} from '@lexical/table';
import {
  $findMatchingParent,
  IS_FIREFOX,
  mergeRegister,
  objectKlassEquals,
} from '@lexical/utils';
import {
  $createParagraphNode,
  $createRangeSelectionFromDom,
  $createTextNode,
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
  CUT_COMMAND,
  DELETE_LINE_COMMAND,
  FOCUS_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  getDOMSelection,
  INSERT_PARAGRAPH_COMMAND,
  isDOMNode,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
  LexicalEditor,
  SELECTION_CHANGE_COMMAND,
  SELECTION_INSERT_CLIPBOARD_NODES_COMMAND,
} from 'lexical';
import {useEffect, useRef} from 'react';

import {useMap, useWeakMap} from './shared/useMap';

type RegisteredTable = {
  dom: HTMLTableElementWithWithTableSelectionState;
  node: TableNode;
  observer: TableObserver;
};

export function useLexicalTableObservers(
  editor: LexicalEditor,
  hasTabHandler: boolean,
) {
  const editorWindow = getEditorWindow(editor);

  const observerRef = useRef<TableObserver | null>(null);
  const domToKey = useWeakMap<HTMLElement, NodeKey>();
  const tables = useMap<NodeKey, RegisteredTable>();
  const tablePointerHandlers = useMap<NodeKey, (event: PointerEvent) => void>();

  const createTableObserverFnRef = useRef<(nodeKey: NodeKey) => void>(
    () => null,
  );
  const deleteTableObserversFnRef = useRef<(nodeKey: NodeKey) => void>(
    () => null,
  );

  useEffect(() => {
    if (!editorWindow) {
      return;
    }

    const getObservedTable = () => {
      const tableObserver = observerRef.current;

      if (!tableObserver) {
        return {tableNode: null, tableObserver: null};
      }

      const {tableNodeKey} = tableObserver;
      const tableEntry = tables.get(tableNodeKey);

      if (!tableEntry) {
        return {tableNode: null, tableObserver: null};
      }

      return {tableNode: tableEntry.node, tableObserver};
    };

    const createPointerHandlers = (tableNodeKey: NodeKey) => {
      const tableEntry = tables.get(tableNodeKey);

      if (!tableEntry) {
        return;
      }

      const observer = observerRef.current;

      if (!observer) {
        return;
      }

      const onPointerUp = () => {
        observer.isSelecting = false;
        editorWindow.removeEventListener('pointerup', onPointerUp);
        editorWindow.removeEventListener('pointermove', onPointerMove);
      };

      const onPointerMove = (moveEvent: PointerEvent) => {
        const tableElement = tableEntry.dom;

        if (!isPointerDownOnEvent(moveEvent) && observer.isSelecting) {
          observer.isSelecting = false;
          editorWindow.removeEventListener('pointerup', onPointerUp);
          editorWindow.removeEventListener('pointermove', onPointerMove);
          return;
        }

        if (!isDOMNode(moveEvent.target)) {
          return;
        }

        let focusCell: null | TableDOMCell = null;
        // In firefox the moveEvent.target may be captured so we must always
        // consult the coordinates #7245
        const override = !(
          IS_FIREFOX || tableElement.contains(moveEvent.target)
        );
        if (override) {
          focusCell = getDOMCellInTableFromTarget(
            tableElement,
            moveEvent.target,
          );
        } else {
          for (const el of document.elementsFromPoint(
            moveEvent.clientX,
            moveEvent.clientY,
          )) {
            focusCell = getDOMCellInTableFromTarget(tableElement, el);
            if (focusCell) {
              break;
            }
          }
        }
        if (
          focusCell &&
          (observer.focusCell === null ||
            focusCell.elem !== observer.focusCell.elem)
        ) {
          observer.setNextFocus({focusCell, override});
          editor.dispatchCommand(SELECTION_CHANGE_COMMAND, undefined);
        }
      };

      observer.isSelecting = true;

      editorWindow.addEventListener(
        'pointerup',
        onPointerUp,
        observer.listenerOptions,
      );
      editorWindow.addEventListener(
        'pointermove',
        onPointerMove,
        observer.listenerOptions,
      );
    };

    const $onTablePointerDown = (
      event: PointerEvent,
      tableNodeKey: NodeKey,
    ) => {
      const tableEntry = tables.get(tableNodeKey);

      if (!tableEntry || event.button !== 0 || !isDOMNode(event.target)) {
        return;
      }

      // Clean previous observer
      if (
        observerRef.current &&
        observerRef.current.tableNodeKey !== tableNodeKey
      ) {
        editor.update(() => {
          observerRef.current!.$clearHighlight();
        });
      }

      const observer = tableEntry.observer;
      observerRef.current = observer;
      const tableNode = tableEntry.node;

      const targetCell = getDOMCellFromTarget(event.target);
      if (targetCell !== null) {
        editor.update(() => {
          const prevSelection = $getPreviousSelection();
          // We can't trust Firefox to do the right thing with the selection and
          // we don't have a proper state machine to do this "correctly" but
          // if we go ahead and make the table selection now it will work
          if (
            IS_FIREFOX &&
            event.shiftKey &&
            $isSelectionInTable(prevSelection, tableNode) &&
            ($isRangeSelection(prevSelection) ||
              $isTableSelection(prevSelection))
          ) {
            const prevAnchorNode = prevSelection.anchor.getNode();
            const prevAnchorCell = $findParentTableCellNodeInTable(
              tableNode,
              prevSelection.anchor.getNode(),
            );
            if (prevAnchorCell) {
              observer.$setAnchorCellForSelection(
                $getObserverCellFromCellNodeOrThrow(observer, prevAnchorCell),
              );
              observer.$setFocusCellForSelection(targetCell);
              stopEvent(event);
            } else {
              const newSelection = tableNode.isBefore(prevAnchorNode)
                ? tableNode.selectStart()
                : tableNode.selectEnd();
              newSelection.anchor.set(
                prevSelection.anchor.key,
                prevSelection.anchor.offset,
                prevSelection.anchor.type,
              );
            }
          } else {
            observer.$setAnchorCellForSelection(targetCell);
          }
        });
      }

      createPointerHandlers(tableNodeKey);
    };

    const $onGlobalPointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (event.button !== 0 || !isDOMNode(target)) {
        return;
      }

      let tableKey: NodeKey | null = null;

      const maybeTableElement = (event.target as HTMLElement).closest('table');
      if (maybeTableElement && domToKey.has(maybeTableElement)) {
        tableKey = domToKey.get(maybeTableElement) || null;
      }

      if (tableKey) {
        const tableEntry = tables.get(tableKey);
        if (!tableEntry) {
          return;
        }
        editor.update(() => {
          tableEntry.observer.$clearHighlight();
        });
      }
    };

    // eslint-disable-next-line @lexical/rules-of-lexical
    createTableObserverFnRef.current = (nodeKey: NodeKey) => {
      const {tableElement, tableNode} = $getTableAndElementByKey(
        nodeKey,
        editor,
      );

      // register the table node
      if (!tables.has(nodeKey)) {
        const observer = new TableObserver(editor, nodeKey);
        tables.set(nodeKey, {
          dom: tableElement,
          node: tableNode,
          observer,
        });
        // attach observer to the table element
        tableElement[LEXICAL_ELEMENT_KEY] = observer;
      }

      // register the table DOM element
      domToKey.set(tableElement, nodeKey);

      const $handler = (event: PointerEvent) =>
        $onTablePointerDown(event, nodeKey);
      tablePointerHandlers.set(nodeKey, $handler);
      tableElement.addEventListener('pointerdown', $handler);
    };

    deleteTableObserversFnRef.current = (nodeKey: NodeKey) => {
      // Clean handlers & Delete existing observer if it exists
      const table = tables.get(nodeKey);
      if (table) {
        const handleToRemove = tablePointerHandlers.get(nodeKey);
        if (handleToRemove) {
          table.dom.removeEventListener('pointerdown', handleToRemove);
          tablePointerHandlers.delete(nodeKey);
        }
        tables.delete(nodeKey);
      }
    };

    const unregisterMutationListener = editor.registerMutationListener(
      TableNode,
      (mutations) => {
        editor.getEditorState().read(() => {
          for (const [nodeKey, type] of mutations) {
            if (type === 'destroyed') {
              deleteTableObserversFnRef.current(nodeKey);
            } else if (type === 'created') {
              createTableObserverFnRef.current(nodeKey);
            } else if (type === 'updated') {
              // If the table node was updated, we need to re-create the observer
              // and re-attach the pointer handler
              const tableEntry = tables.get(nodeKey);
              const {tableElement} = $getTableAndElementByKey(nodeKey);
              if (
                tableEntry &&
                tableElement &&
                tableEntry.dom !== tableElement
              ) {
                deleteTableObserversFnRef.current(nodeKey);
                createTableObserverFnRef.current(nodeKey);
              }
            }
          }
        });
      },
    );

    const $deleteCellHandler = (
      event: KeyboardEvent | ClipboardEvent | null,
    ) => {
      const selection = $getSelection();
      const {tableNode, tableObserver} = getObservedTable();

      if (
        !tableNode ||
        !($isTableSelection(selection) || $isRangeSelection(selection))
      ) {
        return false;
      }

      // If the selection is inside the table but should remove the whole table
      // we expand the selection so that both the anchor and focus are outside
      // the table and the editor's command listener will handle the delete
      const isAnchorInside = tableNode.isParentOf(selection.anchor.getNode());
      const isFocusInside = tableNode.isParentOf(selection.focus.getNode());
      if (isAnchorInside !== isFocusInside) {
        const tablePoint = isAnchorInside ? 'anchor' : 'focus';
        const outerPoint = isAnchorInside ? 'focus' : 'anchor';
        // Preserve the outer point
        const {key, offset, type} = selection[outerPoint];
        // Expand the selection around the table
        const newSelection =
          tableNode[
            selection[tablePoint].isBefore(selection[outerPoint])
              ? 'selectPrevious'
              : 'selectNext'
          ]();
        // Restore the outer point of the selection
        newSelection[outerPoint].set(key, offset, type);
        // Let the base implementation handle the rest
        return false;
      }

      if (!$isSelectionInTable(selection, tableNode)) {
        return false;
      }

      if ($isTableSelection(selection)) {
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }
        tableObserver.$clearText();

        return true;
      }

      return false;
    };

    const $deleteTextHandler = (command: LexicalCommand<boolean>) => () => {
      const selection = $getSelection();
      const {tableNode, tableObserver} = getObservedTable();

      if (!tableNode || !$isSelectionInTable(selection, tableNode)) {
        return false;
      }

      if ($isTableSelection(selection)) {
        tableObserver.$clearText();
        return true;
      }

      if ($isRangeSelection(selection)) {
        const tableCellNode = $findParentTableCellNodeInTable(
          tableNode,
          selection.anchor.getNode(),
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
          tableObserver.$clearText();
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
      }

      return false;
    };

    const unregisterCommandListener = mergeRegister(
      ...ARROW_KEY_COMMANDS_WITH_DIRECTION.map(([command, direction]) =>
        editor.registerCommand(
          command,
          (event) => {
            const {tableNode, tableObserver} = getObservedTable();

            if (!tableNode) {
              return false;
            }

            return $handleArrowKey(
              editor,
              event,
              direction,
              tableNode,
              tableObserver,
            );
          },
          COMMAND_PRIORITY_HIGH,
        ),
      ),
      ...DELETE_KEY_COMMANDS.map((command) =>
        editor.registerCommand(
          command,
          $deleteCellHandler,
          COMMAND_PRIORITY_CRITICAL,
        ),
      ),
      ...DELETE_TEXT_COMMANDS.map((command) =>
        editor.registerCommand(
          command,
          $deleteTextHandler(command),
          COMMAND_PRIORITY_CRITICAL,
        ),
      ),
      editor.registerCommand(
        FOCUS_COMMAND,
        () => {
          const {tableNode} = getObservedTable();
          return tableNode ? tableNode.isSelected() : false;
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        (event) => {
          const selection = $getSelection();
          const {tableNode} = getObservedTable();

          if (!$isTableSelection(selection) || !tableNode) {
            return false;
          }

          const focusCellNode = $findParentTableCellNodeInTable(
            tableNode,
            selection.focus.getNode(),
          );
          if (focusCellNode !== null) {
            stopEvent(event);
            focusCellNode.selectEnd();
            return true;
          }

          return false;
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand(
        CUT_COMMAND,
        (event) => {
          const selection = $getSelection();
          const {tableNode} = getObservedTable();

          if (!tableNode) {
            return false;
          }

          if (!($isTableSelection(selection) || $isRangeSelection(selection))) {
            return false;
          }

          // Copying to the clipboard is async so we must capture the data
          // before we delete it
          void copyToClipboard(
            editor,
            objectKlassEquals(event, ClipboardEvent)
              ? (event as ClipboardEvent)
              : null,
            $getClipboardDataFromSelection(selection),
          );

          const intercepted = $deleteCellHandler(event);
          if ($isRangeSelection(selection)) {
            selection.removeText();
            return true;
          }
          return intercepted;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),

      editor.registerCommand(
        FORMAT_ELEMENT_COMMAND,
        (formatType) => {
          const selection = $getSelection();
          const {tableNode} = getObservedTable();

          if (!tableNode) {
            return false;
          }

          if (
            !$isTableSelection(selection) ||
            !$isSelectionInTable(selection, tableNode)
          ) {
            return false;
          }

          const anchorNode = selection.anchor.getNode();
          const focusNode = selection.focus.getNode();
          if (!$isTableCellNode(anchorNode) || !$isTableCellNode(focusNode)) {
            return false;
          }

          // Align the table if the entire table is selected
          if ($isFullTableSelection(selection, tableNode)) {
            tableNode.setFormat(formatType);
            return true;
          }

          const [tableMap, anchorCell, focusCell] = $computeTableMap(
            tableNode,
            anchorNode,
            focusNode,
          );
          const maxRow = Math.max(
            anchorCell.startRow + anchorCell.cell.__rowSpan - 1,
            focusCell.startRow + focusCell.cell.__rowSpan - 1,
          );
          const maxColumn = Math.max(
            anchorCell.startColumn + anchorCell.cell.__colSpan - 1,
            focusCell.startColumn + focusCell.cell.__colSpan - 1,
          );
          const minRow = Math.min(anchorCell.startRow, focusCell.startRow);
          const minColumn = Math.min(
            anchorCell.startColumn,
            focusCell.startColumn,
          );
          const visited = new Set<TableCellNode>();
          for (let i = minRow; i <= maxRow; i++) {
            for (let j = minColumn; j <= maxColumn; j++) {
              const cell = tableMap[i][j].cell;
              if (visited.has(cell)) {
                continue;
              }
              visited.add(cell);
              cell.setFormat(formatType);

              const cellChildren = cell.getChildren();
              for (let k = 0; k < cellChildren.length; k++) {
                const child = cellChildren[k];
                if ($isElementNode(child) && !child.isInline()) {
                  child.setFormat(formatType);
                }
              }
            }
          }
          return true;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        FORMAT_TEXT_COMMAND,
        (payload) => {
          const selection = $getSelection();
          const {tableNode, tableObserver} = getObservedTable();

          if (!tableNode) {
            return false;
          }

          if (!$isSelectionInTable(selection, tableNode)) {
            return false;
          }

          if ($isTableSelection(selection)) {
            tableObserver.$formatCells(payload);

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
      editor.registerCommand(
        CONTROLLED_TEXT_INSERTION_COMMAND,
        (payload) => {
          const selection = $getSelection();
          const {tableNode, tableObserver} = getObservedTable();

          if (!tableNode) {
            return false;
          }

          if (!$isSelectionInTable(selection, tableNode)) {
            return false;
          }

          if ($isTableSelection(selection)) {
            tableObserver.$clearHighlight();

            return false;
          } else if ($isRangeSelection(selection)) {
            const tableCellNode = $findMatchingParent(
              selection.anchor.getNode(),
              (n) => $isTableCellNode(n),
            );

            if (!$isTableCellNode(tableCellNode)) {
              return false;
            }

            if (typeof payload === 'string') {
              const edgePosition = $getTableEdgeCursorPosition(
                editor,
                selection,
                tableNode,
              );
              if (edgePosition) {
                $insertParagraphAtTableEdge(edgePosition, tableNode, [
                  $createTextNode(payload),
                ]);
                return true;
              }
            }
          }

          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
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
          return true;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          const {tableNode, tableObserver} = getObservedTable();

          if (!tableNode) {
            return false;
          }

          const selection = $getSelection();
          const prevSelection = $getPreviousSelection();
          const nextFocus = tableObserver.getAndClearNextFocus();
          if (nextFocus !== null) {
            const {focusCell} = nextFocus;
            if (
              $isTableSelection(selection) &&
              selection.tableKey === tableObserver.tableNodeKey
            ) {
              if (
                focusCell.x === tableObserver.focusX &&
                focusCell.y === tableObserver.focusY
              ) {
                // The selection is already the correct table selection
                return false;
              } else {
                tableObserver.$setFocusCellForSelection(focusCell);
                return true;
              }
            } else if (
              focusCell !== tableObserver.anchorCell &&
              $isSelectionInTable(selection, tableNode)
            ) {
              // The selection has crossed cells
              tableObserver.$setFocusCellForSelection(focusCell);
              return true;
            }
          }
          const shouldCheckSelection =
            tableObserver.getAndClearShouldCheckSelection();
          // If they pressed the down arrow with the selection outside of the
          // table, and then the selection ends up in the table but not in the
          // first cell, then move the selection to the first cell.
          if (
            shouldCheckSelection &&
            $isRangeSelection(prevSelection) &&
            $isRangeSelection(selection) &&
            selection.isCollapsed()
          ) {
            const anchor = selection.anchor.getNode();
            const firstRow = tableNode.getFirstChild();
            const anchorCell = $findCellNode(anchor);
            if (anchorCell !== null && $isTableRowNode(firstRow)) {
              const firstCell = firstRow.getFirstChild();
              if (
                $isTableCellNode(firstCell) &&
                tableNode.is(
                  $findMatchingParent(
                    anchorCell,
                    (node) => node.is(tableNode) || node.is(firstCell),
                  ),
                )
              ) {
                // The selection moved to the table, but not in the first cell
                firstCell.selectStart();
                return true;
              }
            }
          }

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
            const isPartiallyWithinTable = isAnchorInside !== isFocusInside;
            const isWithinTable = isAnchorInside && isFocusInside;
            const isBackward = selection.isBackward();

            if (isPartiallyWithinTable) {
              const newSelection = selection.clone();
              if (isFocusInside) {
                const [tableMap] = $computeTableMap(
                  tableNode,
                  focusCellNode,
                  focusCellNode,
                );
                const firstCell = tableMap[0][0].cell;
                const lastCell = tableMap[tableMap.length - 1].at(-1)!.cell;
                newSelection.focus.set(
                  isBackward ? firstCell.getKey() : lastCell.getKey(),
                  isBackward
                    ? firstCell.getChildrenSize()
                    : lastCell.getChildrenSize(),
                  'element',
                );
              } else if (isAnchorInside) {
                const [tableMap] = $computeTableMap(
                  tableNode,
                  anchorCellNode,
                  anchorCellNode,
                );
                const firstCell = tableMap[0][0].cell;
                const lastCell = tableMap[tableMap.length - 1].at(-1)!.cell;
                /**
                 * If isBackward, set the anchor to be at the end of the table so that when the cursor moves outside of
                 * the table in the backward direction, the entire table will be selected from its end.
                 * Otherwise, if forward, set the anchor to be at the start of the table so that when the focus is dragged
                 * outside th end of the table, it will start from the beginning of the table.
                 */
                newSelection.anchor.set(
                  isBackward ? lastCell.getKey() : firstCell.getKey(),
                  isBackward ? lastCell.getChildrenSize() : 0,
                  'element',
                );
              }
              $setSelection(newSelection);
              $addHighlightStyleToTable(editor, tableObserver);
            } else if (isWithinTable) {
              // Handle case when selection spans across multiple cells but still
              // has range selection, then we convert it into table selection
              if (!anchorCellNode.is(focusCellNode)) {
                tableObserver.$setAnchorCellForSelection(
                  $getObserverCellFromCellNodeOrThrow(
                    tableObserver,
                    anchorCellNode,
                  ),
                );
                tableObserver.$setFocusCellForSelection(
                  $getObserverCellFromCellNodeOrThrow(
                    tableObserver,
                    focusCellNode,
                  ),
                  true,
                );
              }

              // Handle case when the pointer type is touch and the current and
              // previous selection are collapsed, and the previous anchor and current
              // focus cell nodes are different, then we convert it into table selection
              if (
                tableObserver.pointerType === 'touch' &&
                selection.isCollapsed() &&
                $isRangeSelection(prevSelection) &&
                prevSelection.isCollapsed()
              ) {
                const prevAnchorCellNode = $findCellNode(
                  prevSelection.anchor.getNode(),
                );
                if (
                  prevAnchorCellNode &&
                  !prevAnchorCellNode.is(focusCellNode)
                ) {
                  tableObserver.$setAnchorCellForSelection(
                    $getObserverCellFromCellNodeOrThrow(
                      tableObserver,
                      prevAnchorCellNode,
                    ),
                  );
                  tableObserver.$setFocusCellForSelection(
                    $getObserverCellFromCellNodeOrThrow(
                      tableObserver,
                      focusCellNode,
                    ),
                    true,
                  );
                  tableObserver.pointerType = null;
                }
              }
            }
          } else if (
            selection &&
            $isTableSelection(selection) &&
            selection.is(prevSelection) &&
            selection.tableKey === tableNode.getKey()
          ) {
            // if selection goes outside of the table we need to change it to Range selection
            const domSelection = getDOMSelection(editorWindow);
            if (
              domSelection &&
              domSelection.anchorNode &&
              domSelection.focusNode
            ) {
              const focusNode = $getNearestNodeFromDOMNode(
                domSelection.focusNode,
              );
              const isFocusOutside =
                focusNode && !tableNode.isParentOf(focusNode);

              const anchorNode = $getNearestNodeFromDOMNode(
                domSelection.anchorNode,
              );
              const isAnchorInside =
                anchorNode && tableNode.isParentOf(anchorNode);

              if (
                isFocusOutside &&
                isAnchorInside &&
                domSelection.rangeCount > 0
              ) {
                const newSelection = $createRangeSelectionFromDom(
                  domSelection,
                  editor,
                );
                if (newSelection) {
                  newSelection.anchor.set(
                    tableNode.getKey(),
                    selection.isBackward() ? tableNode.getChildrenSize() : 0,
                    'element',
                  );
                  domSelection.removeAllRanges();
                  $setSelection(newSelection);
                }
              }
            }
          }

          if (
            selection &&
            !selection.is(prevSelection) &&
            ($isTableSelection(selection) ||
              $isTableSelection(prevSelection)) &&
            tableObserver.tableSelection &&
            !tableObserver.tableSelection.is(prevSelection)
          ) {
            if (
              $isTableSelection(selection) &&
              selection.tableKey === tableObserver.tableNodeKey
            ) {
              tableObserver.$updateTableTableSelection(selection);
            } else if (
              !$isTableSelection(selection) &&
              $isTableSelection(prevSelection) &&
              prevSelection.tableKey === tableObserver.tableNodeKey
            ) {
              tableObserver.$updateTableTableSelection(null);
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
      editor.registerCommand(
        INSERT_PARAGRAPH_COMMAND,
        () => {
          const selection = $getSelection();
          const {tableNode} = getObservedTable();

          if (!tableNode) {
            return false;
          }

          if (
            !$isRangeSelection(selection) ||
            !selection.isCollapsed() ||
            !$isSelectionInTable(selection, tableNode)
          ) {
            return false;
          }

          const edgePosition = $getTableEdgeCursorPosition(
            editor,
            selection,
            tableNode,
          );

          if (edgePosition) {
            $insertParagraphAtTableEdge(edgePosition, tableNode);
            return true;
          }

          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
    );

    let unregisterTab: null | (() => void) = null;

    if (hasTabHandler) {
      unregisterTab = editor.registerCommand(
        KEY_TAB_COMMAND,
        (event) => {
          const {tableNode} = getObservedTable();

          if (!tableNode) {
            return false;
          }

          const selection = $getSelection();

          if (
            !$isRangeSelection(selection) ||
            !selection.isCollapsed() ||
            !$isSelectionInTable(selection, tableNode)
          ) {
            return false;
          }

          const tableCellNode = $findCellNode(selection.anchor.getNode());
          if (
            tableCellNode === null ||
            !tableNode.is($findTableNode(tableCellNode))
          ) {
            return false;
          }

          stopEvent(event);
          $selectAdjacentCell(
            tableCellNode,
            event.shiftKey ? 'previous' : 'next',
          );

          return true;
        },
        COMMAND_PRIORITY_CRITICAL,
      );
    }

    editorWindow.addEventListener('pointerdown', $onGlobalPointerDown);

    return () => {
      editorWindow.removeEventListener('pointerdown', $onGlobalPointerDown);
      unregisterCommandListener();
      unregisterMutationListener();
      if (unregisterTab) {
        unregisterTab();
      }
      tables.raw.forEach((tableEntry) => {
        deleteTableObserversFnRef.current(tableEntry.node.getKey());
      });
      tables.clear();
    };
  }, [
    domToKey,
    editor,
    editorWindow,
    hasTabHandler,
    tablePointerHandlers,
    tables,
  ]);

  return {
    refreshTableObservers: (nodeKey: NodeKey) => {
      deleteTableObserversFnRef.current(nodeKey);
      createTableObserverFnRef.current(nodeKey);
    },
  };
}
