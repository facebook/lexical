/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {TableCellNode} from './LexicalTableCellNode';
import type {TableDOMCell, TableDOMRows} from './LexicalTableObserver';
import type {
  TableMapType,
  TableMapValueType,
  TableSelection,
} from './LexicalTableSelection';
import type {
  BaseSelection,
  CaretDirection,
  ChildCaret,
  EditorState,
  ElementNode,
  LexicalCommand,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  PointCaret,
  RangeSelection,
  SiblingCaret,
} from 'lexical';

import {
  $getClipboardDataFromSelection,
  copyToClipboard,
} from '@lexical/clipboard';
import {
  $findMatchingParent,
  addClassNamesToElement,
  objectKlassEquals,
  removeClassNamesFromElement,
} from '@lexical/utils';
import {
  $caretFromPoint,
  $createParagraphNode,
  $createRangeSelectionFromDom,
  $createTextNode,
  $extendCaretToRange,
  $getAdjacentChildCaret,
  $getChildCaret,
  $getNearestNodeFromDOMNode,
  $getPreviousSelection,
  $getSelection,
  $getSiblingCaret,
  $isChildCaret,
  $isElementNode,
  $isExtendableTextPointCaret,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $isSiblingCaret,
  $isTextNode,
  $normalizeCaret,
  $setPointFromCaret,
  $setSelection,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_HIGH,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  CUT_COMMAND,
  DELETE_CHARACTER_COMMAND,
  DELETE_LINE_COMMAND,
  DELETE_WORD_COMMAND,
  FOCUS_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  getDOMSelection,
  INSERT_PARAGRAPH_COMMAND,
  isDOMNode,
  isHTMLElement,
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
import {IS_FIREFOX} from 'shared/environment';
import invariant from 'shared/invariant';

import {$isTableCellNode} from './LexicalTableCellNode';
import {
  $getElementForTableNode,
  $isScrollableTablesActive,
  $isTableNode,
  TableNode,
} from './LexicalTableNode';
import {TableDOMTable, TableObserver} from './LexicalTableObserver';
import {$isTableRowNode} from './LexicalTableRowNode';
import {$isTableSelection} from './LexicalTableSelection';
import {
  $computeTableCellRectBoundary,
  $computeTableCellRectSpans,
  $computeTableMap,
  $computeTableMapSkipCellCheck,
  $getNodeTriplet,
  $insertTableColumnAtNode,
  $insertTableRowAtNode,
  $mergeCells,
  $unmergeCellNode,
  TableCellRectBoundary,
} from './LexicalTableUtils';

const LEXICAL_ELEMENT_KEY = '__lexicalTableSelection';

const isPointerDownOnEvent = (event: PointerEvent) => {
  return (event.buttons & 1) === 1;
};

export function isHTMLTableElement(el: unknown): el is HTMLTableElement {
  return isHTMLElement(el) && el.nodeName === 'TABLE';
}

export function getTableElement<T extends HTMLElement | null>(
  tableNode: TableNode,
  dom: T,
): HTMLTableElementWithWithTableSelectionState | (T & null) {
  if (!dom) {
    return dom as T & null;
  }
  const element = (
    isHTMLTableElement(dom) ? dom : tableNode.getDOMSlot(dom).element
  ) as HTMLTableElementWithWithTableSelectionState;
  invariant(
    element.nodeName === 'TABLE',
    'getTableElement: Expecting table in as DOM node for TableNode, not %s',
    dom.nodeName,
  );
  return element;
}

export function getEditorWindow(editor: LexicalEditor): Window | null {
  return editor._window;
}

export function $findParentTableCellNodeInTable(
  tableNode: LexicalNode,
  node: LexicalNode | null,
): TableCellNode | null {
  for (
    let currentNode = node, lastTableCellNode: TableCellNode | null = null;
    currentNode !== null;
    currentNode = currentNode.getParent()
  ) {
    if (tableNode.is(currentNode)) {
      return lastTableCellNode;
    } else if ($isTableCellNode(currentNode)) {
      lastTableCellNode = currentNode;
    }
  }
  return null;
}

const ARROW_KEY_COMMANDS_WITH_DIRECTION = [
  [KEY_ARROW_DOWN_COMMAND, 'down'],
  [KEY_ARROW_UP_COMMAND, 'up'],
  [KEY_ARROW_LEFT_COMMAND, 'backward'],
  [KEY_ARROW_RIGHT_COMMAND, 'forward'],
] as const;
const DELETE_TEXT_COMMANDS = [
  DELETE_WORD_COMMAND,
  DELETE_LINE_COMMAND,
  DELETE_CHARACTER_COMMAND,
] as const;
const DELETE_KEY_COMMANDS = [
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
] as const;

export function applyTableHandlers(
  tableNode: TableNode,
  element: HTMLElement,
  editor: LexicalEditor,
  hasTabHandler: boolean,
): TableObserver {
  const rootElement = editor.getRootElement();
  const editorWindow = getEditorWindow(editor);
  invariant(
    rootElement !== null && editorWindow !== null,
    'applyTableHandlers: editor has no root element set',
  );

  const tableObserver = new TableObserver(editor, tableNode.getKey());

  const tableElement = getTableElement(tableNode, element);
  attachTableObserverToTableElement(tableElement, tableObserver);
  tableObserver.listenersToRemove.add(() =>
    detachTableObserverFromTableElement(tableElement, tableObserver),
  );

  const createPointerHandlers = () => {
    if (tableObserver.isSelecting) {
      return;
    }
    const onPointerUp = () => {
      tableObserver.isSelecting = false;
      editorWindow.removeEventListener('pointerup', onPointerUp);
      editorWindow.removeEventListener('pointermove', onPointerMove);
    };

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (!isPointerDownOnEvent(moveEvent) && tableObserver.isSelecting) {
        tableObserver.isSelecting = false;
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
      const override = !(IS_FIREFOX || tableElement.contains(moveEvent.target));
      if (override) {
        focusCell = getDOMCellInTableFromTarget(tableElement, moveEvent.target);
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
        (tableObserver.focusCell === null ||
          focusCell.elem !== tableObserver.focusCell.elem)
      ) {
        tableObserver.setNextFocus({focusCell, override});
        editor.dispatchCommand(SELECTION_CHANGE_COMMAND, undefined);
      }
    };
    tableObserver.isSelecting = true;
    editorWindow.addEventListener(
      'pointerup',
      onPointerUp,
      tableObserver.listenerOptions,
    );
    editorWindow.addEventListener(
      'pointermove',
      onPointerMove,
      tableObserver.listenerOptions,
    );
  };

  const onPointerDown = (event: PointerEvent) => {
    tableObserver.pointerType = event.pointerType;
    if (event.button !== 0 || !isDOMNode(event.target) || !editorWindow) {
      return;
    }

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
          ($isRangeSelection(prevSelection) || $isTableSelection(prevSelection))
        ) {
          const prevAnchorNode = prevSelection.anchor.getNode();
          const prevAnchorCell = $findParentTableCellNodeInTable(
            tableNode,
            prevSelection.anchor.getNode(),
          );
          if (prevAnchorCell) {
            tableObserver.$setAnchorCellForSelection(
              $getObserverCellFromCellNodeOrThrow(
                tableObserver,
                prevAnchorCell,
              ),
            );
            tableObserver.$setFocusCellForSelection(targetCell);
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
          // Only set anchor cell for selection if this is not a simple touch tap
          // Touch taps should not initiate table selection mode
          if (event.pointerType !== 'touch') {
            tableObserver.$setAnchorCellForSelection(targetCell);
          }
        }
      });
    }

    createPointerHandlers();
  };
  tableElement.addEventListener(
    'pointerdown',
    onPointerDown,
    tableObserver.listenerOptions,
  );
  tableObserver.listenersToRemove.add(() => {
    tableElement.removeEventListener('pointerdown', onPointerDown);
  });

  const onTripleClick = (event: MouseEvent) => {
    if (event.detail >= 3 && isDOMNode(event.target)) {
      const targetCell = getDOMCellFromTarget(event.target);
      if (targetCell !== null) {
        event.preventDefault();
      }
    }
  };
  tableElement.addEventListener(
    'mousedown',
    onTripleClick,
    tableObserver.listenerOptions,
  );
  tableObserver.listenersToRemove.add(() => {
    tableElement.removeEventListener('mousedown', onTripleClick);
  });

  // Clear selection when clicking outside of dom.
  const pointerDownCallback = (event: PointerEvent) => {
    const target = event.target;
    if (event.button !== 0 || !isDOMNode(target)) {
      return;
    }

    editor.update(() => {
      const selection = $getSelection();
      if (
        $isTableSelection(selection) &&
        selection.tableKey === tableObserver.tableNodeKey &&
        rootElement.contains(target)
      ) {
        tableObserver.$clearHighlight();
      }
    });
  };

  editorWindow.addEventListener(
    'pointerdown',
    pointerDownCallback,
    tableObserver.listenerOptions,
  );
  tableObserver.listenersToRemove.add(() => {
    editorWindow.removeEventListener('pointerdown', pointerDownCallback);
  });

  for (const [command, direction] of ARROW_KEY_COMMANDS_WITH_DIRECTION) {
    tableObserver.listenersToRemove.add(
      editor.registerCommand(
        command,
        (event) =>
          $handleArrowKey(editor, event, direction, tableNode, tableObserver),
        COMMAND_PRIORITY_HIGH,
      ),
    );
  }

  tableObserver.listenersToRemove.add(
    editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      (event) => {
        const selection = $getSelection();
        if ($isTableSelection(selection)) {
          const focusCellNode = $findParentTableCellNodeInTable(
            tableNode,
            selection.focus.getNode(),
          );
          if (focusCellNode !== null) {
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
      tableObserver.$clearText();

      return true;
    } else if ($isRangeSelection(selection)) {
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

  for (const command of DELETE_TEXT_COMMANDS) {
    tableObserver.listenersToRemove.add(
      editor.registerCommand(
        command,
        deleteTextHandler(command),
        COMMAND_PRIORITY_CRITICAL,
      ),
    );
  }

  const $deleteCellHandler = (
    event: KeyboardEvent | ClipboardEvent | null,
  ): boolean => {
    const selection = $getSelection();
    if (!($isTableSelection(selection) || $isRangeSelection(selection))) {
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

  for (const command of DELETE_KEY_COMMANDS) {
    tableObserver.listenersToRemove.add(
      editor.registerCommand(
        command,
        $deleteCellHandler,
        COMMAND_PRIORITY_CRITICAL,
      ),
    );
  }

  tableObserver.listenersToRemove.add(
    editor.registerCommand(
      CUT_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (selection) {
          if (!($isTableSelection(selection) || $isRangeSelection(selection))) {
            return false;
          }
          // Copying to the clipboard is async so we must capture the data
          // before we delete it
          void copyToClipboard(
            editor,
            objectKlassEquals(event, ClipboardEvent) ? event : null,
            $getClipboardDataFromSelection(selection),
          );
          const intercepted = $deleteCellHandler(event);
          if ($isRangeSelection(selection)) {
            selection.removeText();
            return true;
          }
          return intercepted;
        }
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    ),
  );

  tableObserver.listenersToRemove.add(
    editor.registerCommand(
      FORMAT_TEXT_COMMAND,
      (payload) => {
        const selection = $getSelection();

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
  );

  tableObserver.listenersToRemove.add(
    editor.registerCommand(
      FORMAT_ELEMENT_COMMAND,
      (formatType) => {
        const selection = $getSelection();
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
  );

  if (hasTabHandler) {
    tableObserver.listenersToRemove.add(
      editor.registerCommand(
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

  tableObserver.listenersToRemove.add(
    editor.registerCommand(
      SELECTION_INSERT_CLIPBOARD_NODES_COMMAND,
      (selectionPayload, dispatchEditor) => {
        if (editor !== dispatchEditor) {
          return false;
        }
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

        const [anchor, focus] = anchorAndFocus;
        const [anchorCellNode, anchorRowNode, gridNode] =
          $getNodeTriplet(anchor);
        const focusCellNode = $findMatchingParent(focus.getNode(), (n) =>
          $isTableCellNode(n),
        );

        if (
          !$isTableCellNode(anchorCellNode) ||
          !$isTableCellNode(focusCellNode) ||
          !$isTableRowNode(anchorRowNode) ||
          !$isTableNode(gridNode)
        ) {
          return false;
        }

        const templateGrid = nodes[0];
        const [initialGridMap, anchorCellMap, focusCellMap] = $computeTableMap(
          gridNode,
          anchorCellNode,
          focusCellNode,
        );
        const [templateGridMap] = $computeTableMapSkipCellCheck(
          templateGrid,
          null,
          null,
        );
        const initialRowCount = initialGridMap.length;
        const initialColCount =
          initialRowCount > 0 ? initialGridMap[0].length : 0;

        // If we have a range selection, we'll fit the template grid into the
        // table, growing the table if necessary.
        let startRow = anchorCellMap.startRow;
        let startCol = anchorCellMap.startColumn;
        let affectedRowCount = templateGridMap.length;
        let affectedColCount =
          affectedRowCount > 0 ? templateGridMap[0].length : 0;

        if (isTableSelection) {
          // If we have a table selection, we'll only modify the cells within
          // the selection boundary.
          const selectionBoundary = $computeTableCellRectBoundary(
            initialGridMap,
            anchorCellMap,
            focusCellMap,
          );
          const selectionRowCount =
            selectionBoundary.maxRow - selectionBoundary.minRow + 1;
          const selectionColCount =
            selectionBoundary.maxColumn - selectionBoundary.minColumn + 1;
          startRow = selectionBoundary.minRow;
          startCol = selectionBoundary.minColumn;
          affectedRowCount = Math.min(affectedRowCount, selectionRowCount);
          affectedColCount = Math.min(affectedColCount, selectionColCount);
        }

        // Step 1: Unmerge all merged cells within the affected area
        let didPerformMergeOperations = false;
        const lastRowForUnmerge =
          Math.min(initialRowCount, startRow + affectedRowCount) - 1;
        const lastColForUnmerge =
          Math.min(initialColCount, startCol + affectedColCount) - 1;
        const unmergedKeys = new Set<NodeKey>();
        for (let row = startRow; row <= lastRowForUnmerge; row++) {
          for (let col = startCol; col <= lastColForUnmerge; col++) {
            const cellMap = initialGridMap[row][col];
            if (unmergedKeys.has(cellMap.cell.getKey())) {
              continue; // cell was a merged cell that was already handled
            }
            if (cellMap.cell.__rowSpan === 1 && cellMap.cell.__colSpan === 1) {
              continue; // cell is not a merged cell
            }
            $unmergeCellNode(cellMap.cell);
            unmergedKeys.add(cellMap.cell.getKey());
            didPerformMergeOperations = true;
          }
        }

        let [interimGridMap] = $computeTableMapSkipCellCheck(
          gridNode.getWritable(),
          null,
          null,
        );

        // Step 2: Expand current table (if needed)
        const rowsToInsert = affectedRowCount - initialRowCount + startRow;
        for (let i = 0; i < rowsToInsert; i++) {
          const cellMap = interimGridMap[initialRowCount - 1][0];
          $insertTableRowAtNode(cellMap.cell);
        }
        const colsToInsert = affectedColCount - initialColCount + startCol;
        for (let i = 0; i < colsToInsert; i++) {
          const cellMap = interimGridMap[0][initialColCount - 1];
          $insertTableColumnAtNode(cellMap.cell, true, false);
        }

        [interimGridMap] = $computeTableMapSkipCellCheck(
          gridNode.getWritable(),
          null,
          null,
        );

        // Step 3: Merge cells and set cell content, to match template grid
        for (let row = startRow; row < startRow + affectedRowCount; row++) {
          for (let col = startCol; col < startCol + affectedColCount; col++) {
            const templateRow = row - startRow;
            const templateCol = col - startCol;
            const templateCellMap = templateGridMap[templateRow][templateCol];
            if (
              templateCellMap.startRow !== templateRow ||
              templateCellMap.startColumn !== templateCol
            ) {
              continue; // cell is a merged cell that was already handled
            }

            const templateCell = templateCellMap.cell;
            if (templateCell.__rowSpan !== 1 || templateCell.__colSpan !== 1) {
              const cellsToMerge = [];
              const lastRowForMerge =
                Math.min(
                  row + templateCell.__rowSpan,
                  startRow + affectedRowCount,
                ) - 1;
              const lastColForMerge =
                Math.min(
                  col + templateCell.__colSpan,
                  startCol + affectedColCount,
                ) - 1;
              for (let r = row; r <= lastRowForMerge; r++) {
                for (let c = col; c <= lastColForMerge; c++) {
                  const cellMap = interimGridMap[r][c];
                  cellsToMerge.push(cellMap.cell);
                }
              }
              $mergeCells(cellsToMerge);
              didPerformMergeOperations = true;
            }

            const {cell} = interimGridMap[row][col];
            const originalChildren = cell.getChildren();
            templateCell.getChildren().forEach((child) => {
              if ($isTextNode(child)) {
                const paragraphNode = $createParagraphNode();
                paragraphNode.append(child);
                cell.append(child);
              } else {
                cell.append(child);
              }
            });
            originalChildren.forEach((n) => n.remove());
          }
        }

        if (isTableSelection && didPerformMergeOperations) {
          // reset the table selection in case the anchor or focus cell was
          // removed via merge operations
          const [finalGridMap] = $computeTableMapSkipCellCheck(
            gridNode.getWritable(),
            null,
            null,
          );
          const newAnchorCellMap =
            finalGridMap[anchorCellMap.startRow][anchorCellMap.startColumn];
          newAnchorCellMap.cell.selectEnd();
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
            // However, only do this if the table observer is actively selecting (user dragging)
            // to prevent unwanted selections when simply tapping between cells on mobile
            if (
              tableObserver.pointerType === 'touch' &&
              tableObserver.isSelecting &&
              selection.isCollapsed() &&
              $isRangeSelection(prevSelection) &&
              prevSelection.isCollapsed()
            ) {
              const prevAnchorCellNode = $findCellNode(
                prevSelection.anchor.getNode(),
              );
              if (prevAnchorCellNode && !prevAnchorCellNode.is(focusCellNode)) {
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
          ($isTableSelection(selection) || $isTableSelection(prevSelection)) &&
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
  );

  tableObserver.listenersToRemove.add(
    editor.registerCommand(
      INSERT_PARAGRAPH_COMMAND,
      () => {
        const selection = $getSelection();
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

  return tableObserver;
}

export type HTMLTableElementWithWithTableSelectionState = HTMLTableElement & {
  [LEXICAL_ELEMENT_KEY]?: TableObserver | undefined;
};

export function detachTableObserverFromTableElement(
  tableElement: HTMLTableElementWithWithTableSelectionState,
  tableObserver: TableObserver,
) {
  if (getTableObserverFromTableElement(tableElement) === tableObserver) {
    delete tableElement[LEXICAL_ELEMENT_KEY];
  }
}

export function attachTableObserverToTableElement(
  tableElement: HTMLTableElementWithWithTableSelectionState,
  tableObserver: TableObserver,
) {
  invariant(
    getTableObserverFromTableElement(tableElement) === null,
    'tableElement already has an attached TableObserver',
  );
  tableElement[LEXICAL_ELEMENT_KEY] = tableObserver;
}

export function getTableObserverFromTableElement(
  tableElement: HTMLTableElementWithWithTableSelectionState,
): TableObserver | null {
  return tableElement[LEXICAL_ELEMENT_KEY] || null;
}

export function getDOMCellFromTarget(node: null | Node): TableDOMCell | null {
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

export function getDOMCellInTableFromTarget(
  table: HTMLTableElementWithWithTableSelectionState,
  node: null | Node,
): TableDOMCell | null {
  if (!table.contains(node)) {
    return null;
  }
  let cell: null | TableDOMCell = null;
  for (
    let currentNode: ParentNode | Node | null = node;
    currentNode != null;
    currentNode = currentNode.parentNode
  ) {
    if (currentNode === table) {
      return cell;
    }
    const nodeName = currentNode.nodeName;
    if (nodeName === 'TD' || nodeName === 'TH') {
      // @ts-expect-error: internal field
      cell = currentNode._cell || null;
    }
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

export function getTable(
  tableNode: TableNode,
  dom: HTMLElement,
): TableDOMTable {
  const tableElement = getTableElement(tableNode, dom);
  const domRows: TableDOMRows = [];
  const grid = {
    columns: 0,
    domRows,
    rows: 0,
  };
  let currentNode = tableElement.querySelector('tr') as ChildNode | null;
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
  tableSelection.$disableHighlightStyle();
  $forEachTableCell(tableSelection.table, (cell) => {
    cell.highlighted = true;
    $addHighlightToDOM(editor, cell);
  });
}

export function $removeHighlightStyleToTable(
  editor: LexicalEditor,
  tableObserver: TableObserver,
) {
  tableObserver.$enableHighlightStyle();
  $forEachTableCell(tableObserver.table, (cell) => {
    const elem = cell.elem;
    cell.highlighted = false;
    $removeHighlightFromDOM(editor, cell);

    if (!elem.getAttribute('style')) {
      elem.removeAttribute('style');
    }
  });
}

function $selectAdjacentCell(
  tableCellNode: TableCellNode,
  direction: 'next' | 'previous',
) {
  const siblingMethod =
    direction === 'next' ? 'getNextSibling' : 'getPreviousSibling';
  const childMethod = direction === 'next' ? 'getFirstChild' : 'getLastChild';
  const sibling = tableCellNode[siblingMethod]();
  if ($isElementNode(sibling)) {
    return sibling.selectEnd();
  }
  const parentRow = $findMatchingParent(tableCellNode, $isTableRowNode);
  invariant(parentRow !== null, 'selectAdjacentCell: Cell not in table row');
  for (
    let nextRow = parentRow[siblingMethod]();
    $isTableRowNode(nextRow);
    nextRow = nextRow[siblingMethod]()
  ) {
    const child = nextRow[childMethod]();
    if ($isElementNode(child)) {
      return child.selectEnd();
    }
  }
  const parentTable = $findMatchingParent(parentRow, $isTableNode);
  invariant(parentTable !== null, 'selectAdjacentCell: Row not in table');
  return direction === 'next'
    ? parentTable.selectNext()
    : parentTable.selectPrevious();
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

type Corner = ['minColumn' | 'maxColumn', 'minRow' | 'maxRow'];
function getCorner(
  rect: TableCellRectBoundary,
  cellValue: TableMapValueType,
): Corner | null {
  let colName: 'minColumn' | 'maxColumn';
  let rowName: 'minRow' | 'maxRow';
  if (cellValue.startColumn === rect.minColumn) {
    colName = 'minColumn';
  } else if (
    cellValue.startColumn + cellValue.cell.__colSpan - 1 ===
    rect.maxColumn
  ) {
    colName = 'maxColumn';
  } else {
    return null;
  }
  if (cellValue.startRow === rect.minRow) {
    rowName = 'minRow';
  } else if (
    cellValue.startRow + cellValue.cell.__rowSpan - 1 ===
    rect.maxRow
  ) {
    rowName = 'maxRow';
  } else {
    return null;
  }
  return [colName, rowName];
}

function getCornerOrThrow(
  rect: TableCellRectBoundary,
  cellValue: TableMapValueType,
): Corner {
  const corner = getCorner(rect, cellValue);
  invariant(
    corner !== null,
    'getCornerOrThrow: cell %s is not at a corner of rect',
    cellValue.cell.getKey(),
  );
  return corner;
}

function oppositeCorner([colName, rowName]: Corner): Corner {
  return [
    colName === 'minColumn' ? 'maxColumn' : 'minColumn',
    rowName === 'minRow' ? 'maxRow' : 'minRow',
  ];
}

function cellAtCornerOrThrow(
  tableMap: TableMapType,
  rect: TableCellRectBoundary,
  [colName, rowName]: Corner,
): TableMapValueType {
  const rowNum = rect[rowName];
  const rowMap = tableMap[rowNum];
  invariant(
    rowMap !== undefined,
    'cellAtCornerOrThrow: %s = %s missing in tableMap',
    rowName,
    String(rowNum),
  );
  const colNum = rect[colName];
  const cell = rowMap[colNum];
  invariant(
    cell !== undefined,
    'cellAtCornerOrThrow: %s = %s missing in tableMap',
    colName,
    String(colNum),
  );
  return cell;
}

function $extractRectCorners(
  tableMap: TableMapType,
  anchorCellValue: TableMapValueType,
  newFocusCellValue: TableMapValueType,
) {
  // We are sure that the focus now either contracts or expands the rect
  // but both the anchor and focus might be moved to ensure a rectangle
  // given a potentially ragged merge shape
  const rect = $computeTableCellRectBoundary(
    tableMap,
    anchorCellValue,
    newFocusCellValue,
  );
  const anchorCorner = getCorner(rect, anchorCellValue);
  if (anchorCorner) {
    return [
      cellAtCornerOrThrow(tableMap, rect, anchorCorner),
      cellAtCornerOrThrow(tableMap, rect, oppositeCorner(anchorCorner)),
    ];
  }
  const newFocusCorner = getCorner(rect, newFocusCellValue);
  if (newFocusCorner) {
    return [
      cellAtCornerOrThrow(tableMap, rect, oppositeCorner(newFocusCorner)),
      cellAtCornerOrThrow(tableMap, rect, newFocusCorner),
    ];
  }
  // TODO this doesn't have to be arbitrary, use the closest corner instead
  const newAnchorCorner: Corner = ['minColumn', 'minRow'];
  return [
    cellAtCornerOrThrow(tableMap, rect, newAnchorCorner),
    cellAtCornerOrThrow(tableMap, rect, oppositeCorner(newAnchorCorner)),
  ];
}

function $adjustFocusInDirection(
  tableObserver: TableObserver,
  tableMap: TableMapType,
  anchorCellValue: TableMapValueType,
  focusCellValue: TableMapValueType,
  direction: Direction,
): boolean {
  const rect = $computeTableCellRectBoundary(
    tableMap,
    anchorCellValue,
    focusCellValue,
  );
  const spans = $computeTableCellRectSpans(tableMap, rect);
  const {topSpan, leftSpan, bottomSpan, rightSpan} = spans;
  const anchorCorner = getCornerOrThrow(rect, anchorCellValue);
  const [focusColumn, focusRow] = oppositeCorner(anchorCorner);
  let fCol = rect[focusColumn];
  let fRow = rect[focusRow];
  if (direction === 'forward') {
    fCol += focusColumn === 'maxColumn' ? 1 : leftSpan;
  } else if (direction === 'backward') {
    fCol -= focusColumn === 'minColumn' ? 1 : rightSpan;
  } else if (direction === 'down') {
    fRow += focusRow === 'maxRow' ? 1 : topSpan;
  } else if (direction === 'up') {
    fRow -= focusRow === 'minRow' ? 1 : bottomSpan;
  }
  const targetRowMap = tableMap[fRow];
  if (targetRowMap === undefined) {
    return false;
  }
  const newFocusCellValue = targetRowMap[fCol];
  if (newFocusCellValue === undefined) {
    return false;
  }
  // We can be certain that anchorCellValue and newFocusCellValue are
  // contained within the desired selection, but we are not certain if
  // they need to be expanded or not to maintain a rectangular shape
  const [finalAnchorCell, finalFocusCell] = $extractRectCorners(
    tableMap,
    anchorCellValue,
    newFocusCellValue,
  );
  const anchorDOM = $getObserverCellFromCellNodeOrThrow(
    tableObserver,
    finalAnchorCell.cell,
  )!;
  const focusDOM = $getObserverCellFromCellNodeOrThrow(
    tableObserver,
    finalFocusCell.cell,
  );
  tableObserver.$setAnchorCellForSelection(anchorDOM);
  tableObserver.$setFocusCellForSelection(focusDOM, true);
  return true;
}

function $isSelectionInTable(
  selection: null | BaseSelection,
  tableNode: TableNode,
): boolean {
  if ($isRangeSelection(selection) || $isTableSelection(selection)) {
    // TODO this should probably return false if there's an unrelated
    //      shadow root between the node and the table (e.g. another table,
    //      collapsible, etc.)
    const isAnchorInside = tableNode.isParentOf(selection.anchor.getNode());
    const isFocusInside = tableNode.isParentOf(selection.focus.getNode());

    return isAnchorInside && isFocusInside;
  }

  return false;
}

function $isFullTableSelection(
  selection: null | BaseSelection,
  tableNode: TableNode,
): boolean {
  if ($isTableSelection(selection)) {
    const anchorNode = selection.anchor.getNode() as TableCellNode;
    const focusNode = selection.focus.getNode() as TableCellNode;
    if (tableNode && anchorNode && focusNode) {
      const [map] = $computeTableMap(tableNode, anchorNode, focusNode);
      return (
        anchorNode.getKey() === map[0][0].cell.getKey() &&
        focusNode.getKey() === map[map.length - 1].at(-1)!.cell.getKey()
      );
    }
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

function $addHighlightToDOM(editor: LexicalEditor, cell: TableDOMCell): void {
  const element = cell.elem;
  const editorThemeClasses = editor._config.theme;
  const node = $getNearestNodeFromDOMNode(element);
  invariant(
    $isTableCellNode(node),
    'Expected to find LexicalNode from Table Cell DOMNode',
  );
  addClassNamesToElement(element, editorThemeClasses.tableCellSelected);
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
  const editorThemeClasses = editor._config.theme;
  removeClassNamesFromElement(element, editorThemeClasses.tableCellSelected);
}

export function $findCellNode(node: LexicalNode): null | TableCellNode {
  const cellNode = $findMatchingParent(node, $isTableCellNode);
  return $isTableCellNode(cellNode) ? cellNode : null;
}

export function $findTableNode(node: LexicalNode): null | TableNode {
  const tableNode = $findMatchingParent(node, $isTableNode);
  return $isTableNode(tableNode) ? tableNode : null;
}

function $getBlockParentIfFirstNode(node: LexicalNode): ElementNode | null {
  for (
    let prevNode = node, currentNode: LexicalNode | null = node;
    currentNode !== null;
    prevNode = currentNode, currentNode = currentNode.getParent()
  ) {
    if ($isElementNode(currentNode)) {
      if (
        currentNode !== prevNode &&
        currentNode.getFirstChild() !== prevNode
      ) {
        // Not the first child or the initial node
        return null;
      } else if (!currentNode.isInline()) {
        return currentNode;
      }
    }
  }
  return null;
}

function $handleHorizontalArrowKeyRangeSelection(
  editor: LexicalEditor,
  event: KeyboardEvent,
  selection: RangeSelection,
  alter: 'extend' | 'move',
  isBackward: boolean,
  tableNode: TableNode,
  tableObserver: TableObserver,
): boolean {
  const initialFocus = $caretFromPoint(
    selection.focus,
    isBackward ? 'previous' : 'next',
  );
  if ($isExtendableTextPointCaret(initialFocus)) {
    return false;
  }
  let lastCaret = initialFocus;
  // TableCellNode is the only shadow root we are interested in piercing so
  // we find the last internal caret and then check its parent
  for (const nextCaret of $extendCaretToRange(initialFocus).iterNodeCarets(
    'shadowRoot',
  )) {
    if (!($isSiblingCaret(nextCaret) && $isElementNode(nextCaret.origin))) {
      return false;
    }
    lastCaret = nextCaret;
  }
  const lastCaretParent = lastCaret.getParentAtCaret();
  if (!$isTableCellNode(lastCaretParent)) {
    return false;
  }
  const anchorCell = lastCaretParent;
  const focusCaret = $findNextTableCell(
    $getSiblingCaret(anchorCell, lastCaret.direction),
  );
  const anchorCellTable = $findMatchingParent(anchorCell, $isTableNode);
  if (!(anchorCellTable && anchorCellTable.is(tableNode))) {
    return false;
  }
  const anchorCellDOM = editor.getElementByKey(anchorCell.getKey());
  const anchorDOMCell = getDOMCellFromTarget(anchorCellDOM);
  if (!anchorCellDOM || !anchorDOMCell) {
    return false;
  }

  const anchorCellTableElement = $getElementForTableNode(
    editor,
    anchorCellTable,
  );
  tableObserver.table = anchorCellTableElement;
  if (!focusCaret) {
    if (alter === 'extend') {
      // extend the selection from a range inside the cell to a table selection of the cell
      tableObserver.$setAnchorCellForSelection(anchorDOMCell);
      tableObserver.$setFocusCellForSelection(anchorDOMCell, true);
    } else {
      // exit the table
      const outerFocusCaret = $getTableExitCaret(
        $getSiblingCaret(anchorCellTable, initialFocus.direction),
      );
      $setPointFromCaret(selection.anchor, outerFocusCaret);
      $setPointFromCaret(selection.focus, outerFocusCaret);
    }
  } else if (alter === 'extend') {
    const focusDOMCell = getDOMCellFromTarget(
      editor.getElementByKey(focusCaret.origin.getKey()),
    );
    if (!focusDOMCell) {
      return false;
    }
    tableObserver.$setAnchorCellForSelection(anchorDOMCell);
    tableObserver.$setFocusCellForSelection(focusDOMCell, true);
  } else {
    // alter === 'move'
    const innerFocusCaret = $normalizeCaret(focusCaret);
    $setPointFromCaret(selection.anchor, innerFocusCaret);
    $setPointFromCaret(selection.focus, innerFocusCaret);
  }
  stopEvent(event);
  return true;
}

function $getTableExitCaret<D extends CaretDirection>(
  initialCaret: SiblingCaret<TableNode, D>,
): PointCaret<D> {
  const adjacent = $getAdjacentChildCaret(initialCaret);
  return $isChildCaret(adjacent) ? $normalizeCaret(adjacent) : initialCaret;
}

function $findNextTableCell<D extends CaretDirection>(
  initialCaret: SiblingCaret<TableCellNode, D>,
): null | ChildCaret<TableCellNode, D> {
  for (const nextCaret of $extendCaretToRange(initialCaret).iterNodeCarets(
    'root',
  )) {
    const {origin} = nextCaret;
    if ($isTableCellNode(origin)) {
      // not sure why ts isn't narrowing here (even if the guard is on nextCaret.origin)
      // but returning a new caret is fine
      if ($isChildCaret(nextCaret)) {
        return $getChildCaret(origin, initialCaret.direction);
      }
    } else if (!$isTableRowNode(origin)) {
      break;
    }
  }
  return null;
}

function $handleArrowKey(
  editor: LexicalEditor,
  event: KeyboardEvent,
  direction: Direction,
  tableNode: TableNode,
  tableObserver: TableObserver,
): boolean {
  if (
    (direction === 'up' || direction === 'down') &&
    isTypeaheadMenuInView(editor)
  ) {
    return false;
  }

  const selection = $getSelection();

  if (!$isSelectionInTable(selection, tableNode)) {
    if ($isRangeSelection(selection)) {
      if (direction === 'backward') {
        if (selection.focus.offset > 0) {
          return false;
        }
        const parentNode = $getBlockParentIfFirstNode(
          selection.focus.getNode(),
        );
        if (!parentNode) {
          return false;
        }
        const siblingNode = parentNode.getPreviousSibling();
        if (!$isTableNode(siblingNode)) {
          return false;
        }
        stopEvent(event);
        if (event.shiftKey) {
          selection.focus.set(
            siblingNode.getParentOrThrow().getKey(),
            siblingNode.getIndexWithinParent(),
            'element',
          );
        } else {
          siblingNode.selectEnd();
        }
        return true;
      } else if (
        event.shiftKey &&
        (direction === 'up' || direction === 'down')
      ) {
        const focusNode = selection.focus.getNode();
        const isTableUnselect =
          !selection.isCollapsed() &&
          ((direction === 'up' && !selection.isBackward()) ||
            (direction === 'down' && selection.isBackward()));
        if (isTableUnselect) {
          let focusParentNode = $findMatchingParent(focusNode, (n) =>
            $isTableNode(n),
          );
          if ($isTableCellNode(focusParentNode)) {
            focusParentNode = $findMatchingParent(
              focusParentNode,
              $isTableNode,
            );
          }
          if (focusParentNode !== tableNode) {
            return false;
          }
          if (!focusParentNode) {
            return false;
          }
          const sibling =
            direction === 'down'
              ? focusParentNode.getNextSibling()
              : focusParentNode.getPreviousSibling();
          if (!sibling) {
            return false;
          }
          let newOffset = 0;
          if (direction === 'up') {
            if ($isElementNode(sibling)) {
              newOffset = sibling.getChildrenSize();
            }
          }
          let newFocusNode = sibling;
          if (direction === 'up') {
            if ($isElementNode(sibling)) {
              const lastCell = sibling.getLastChild();
              newFocusNode = lastCell ? lastCell : sibling;
              newOffset = $isTextNode(newFocusNode)
                ? newFocusNode.getTextContentSize()
                : 0;
            }
          }
          const newSelection = selection.clone();

          newSelection.focus.set(
            newFocusNode.getKey(),
            newOffset,
            $isTextNode(newFocusNode) ? 'text' : 'element',
          );
          $setSelection(newSelection);
          stopEvent(event);
          return true;
        } else if ($isRootOrShadowRoot(focusNode)) {
          const selectedNode =
            direction === 'up'
              ? selection.getNodes()[selection.getNodes().length - 1]
              : selection.getNodes()[0];
          if (selectedNode) {
            const tableCellNode = $findParentTableCellNodeInTable(
              tableNode,
              selectedNode,
            );
            if (tableCellNode !== null) {
              const firstDescendant = tableNode.getFirstDescendant();
              const lastDescendant = tableNode.getLastDescendant();
              if (!firstDescendant || !lastDescendant) {
                return false;
              }
              const [firstCellNode] = $getNodeTriplet(firstDescendant);
              const [lastCellNode] = $getNodeTriplet(lastDescendant);
              const firstCellCoords = tableNode.getCordsFromCellNode(
                firstCellNode,
                tableObserver.table,
              );
              const lastCellCoords = tableNode.getCordsFromCellNode(
                lastCellNode,
                tableObserver.table,
              );
              const firstCellDOM = tableNode.getDOMCellFromCordsOrThrow(
                firstCellCoords.x,
                firstCellCoords.y,
                tableObserver.table,
              );
              const lastCellDOM = tableNode.getDOMCellFromCordsOrThrow(
                lastCellCoords.x,
                lastCellCoords.y,
                tableObserver.table,
              );
              tableObserver.$setAnchorCellForSelection(firstCellDOM);
              tableObserver.$setFocusCellForSelection(lastCellDOM, true);
              return true;
            }
          }
          return false;
        } else {
          let focusParentNode = $findMatchingParent(
            focusNode,
            (n) => $isElementNode(n) && !n.isInline(),
          );
          if ($isTableCellNode(focusParentNode)) {
            focusParentNode = $findMatchingParent(
              focusParentNode,
              $isTableNode,
            );
          }
          if (!focusParentNode) {
            return false;
          }
          const sibling =
            direction === 'down'
              ? focusParentNode.getNextSibling()
              : focusParentNode.getPreviousSibling();
          if (
            $isTableNode(sibling) &&
            tableObserver.tableNodeKey === sibling.getKey()
          ) {
            const firstDescendant = sibling.getFirstDescendant();
            const lastDescendant = sibling.getLastDescendant();
            if (!firstDescendant || !lastDescendant) {
              return false;
            }
            const [firstCellNode] = $getNodeTriplet(firstDescendant);
            const [lastCellNode] = $getNodeTriplet(lastDescendant);
            const newSelection = selection.clone();
            newSelection.focus.set(
              (direction === 'up' ? firstCellNode : lastCellNode).getKey(),
              direction === 'up' ? 0 : lastCellNode.getChildrenSize(),
              'element',
            );
            stopEvent(event);
            $setSelection(newSelection);
            return true;
          }
        }
      }
    }
    if (direction === 'down' && $isScrollableTablesActive(editor)) {
      // Enable Firefox workaround
      tableObserver.setShouldCheckSelection();
    }
    return false;
  }

  if ($isRangeSelection(selection)) {
    if (direction === 'backward' || direction === 'forward') {
      const alter = event.shiftKey ? 'extend' : 'move';
      return $handleHorizontalArrowKeyRangeSelection(
        editor,
        event,
        selection,
        alter,
        direction === 'backward',
        tableNode,
        tableObserver,
      );
    }

    if (selection.isCollapsed()) {
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
        const anchorCellTableElement = getTableElement(
          anchorCellTable,
          editor.getElementByKey(anchorCellTable.getKey()),
        );
        if (anchorCellTableElement != null) {
          tableObserver.table = getTable(
            anchorCellTable,
            anchorCellTableElement,
          );
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
        const domSelection = getDOMSelection(getEditorWindow(editor));
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
          : edgeSelectionRect.bottom + edgeSelectionRect.height >
            edgeRect.bottom;

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
          tableObserver.$setAnchorCellForSelection(cell);
          tableObserver.$setFocusCellForSelection(cell, true);
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
    invariant(
      $isTableNode(tableNodeFromSelection),
      '$handleArrowKey: TableSelection.getNodes()[0] expected to be TableNode',
    );
    const tableElement = getTableElement(
      tableNodeFromSelection,
      editor.getElementByKey(tableNodeFromSelection.getKey()),
    );
    if (
      !$isTableCellNode(anchorCellNode) ||
      !$isTableCellNode(focusCellNode) ||
      !$isTableNode(tableNodeFromSelection) ||
      tableElement == null
    ) {
      return false;
    }
    tableObserver.$updateTableTableSelection(selection);

    const grid = getTable(tableNodeFromSelection, tableElement);
    const cordsAnchor = tableNode.getCordsFromCellNode(anchorCellNode, grid);
    const anchorCell = tableNode.getDOMCellFromCordsOrThrow(
      cordsAnchor.x,
      cordsAnchor.y,
      grid,
    );
    tableObserver.$setAnchorCellForSelection(anchorCell);

    stopEvent(event);

    if (event.shiftKey) {
      const [tableMap, anchorValue, focusValue] = $computeTableMap(
        tableNode,
        anchorCellNode,
        focusCellNode,
      );
      return $adjustFocusInDirection(
        tableObserver,
        tableMap,
        anchorValue,
        focusValue,
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

function isTypeaheadMenuInView(editor: LexicalEditor) {
  // There is no inbuilt way to check if the component picker is in view
  // but we can check if the root DOM element has the aria-controls attribute "typeahead-menu".
  const root = editor.getRootElement();
  if (!root) {
    return false;
  }
  return (
    root.hasAttribute('aria-controls') &&
    root.getAttribute('aria-controls') === 'typeahead-menu'
  );
}

function $insertParagraphAtTableEdge(
  edgePosition: 'first' | 'last',
  tableNode: TableNode,
  children?: LexicalNode[],
) {
  const paragraphNode = $createParagraphNode();
  if (edgePosition === 'first') {
    tableNode.insertBefore(paragraphNode);
  } else {
    tableNode.insertAfter(paragraphNode);
  }
  paragraphNode.append(...(children || []));
  paragraphNode.selectEnd();
}

function $getTableEdgeCursorPosition(
  editor: LexicalEditor,
  selection: RangeSelection,
  tableNode: TableNode,
) {
  const tableNodeParent = tableNode.getParent();
  if (!tableNodeParent) {
    return undefined;
  }

  // TODO: Add support for nested tables
  const domSelection = getDOMSelection(getEditorWindow(editor));
  if (!domSelection) {
    return undefined;
  }
  const domAnchorNode = domSelection.anchorNode;
  const tableNodeParentDOM = editor.getElementByKey(tableNodeParent.getKey());
  const tableElement = getTableElement(
    tableNode,
    editor.getElementByKey(tableNode.getKey()),
  );
  // We are only interested in the scenario where the
  // native selection anchor is:
  // - at or inside the table's parent DOM
  // - and NOT at or inside the table DOM
  // It may be adjacent to the table DOM (e.g. in a wrapper)
  if (
    !domAnchorNode ||
    !tableNodeParentDOM ||
    !tableElement ||
    !tableNodeParentDOM.contains(domAnchorNode) ||
    tableElement.contains(domAnchorNode)
  ) {
    return undefined;
  }

  const anchorCellNode = $findMatchingParent(selection.anchor.getNode(), (n) =>
    $isTableCellNode(n),
  ) as TableCellNode | null;
  if (!anchorCellNode) {
    return undefined;
  }

  const parentTable = $findMatchingParent(anchorCellNode, (n) =>
    $isTableNode(n),
  );
  if (!$isTableNode(parentTable) || !parentTable.is(tableNode)) {
    return undefined;
  }

  const [tableMap, cellValue] = $computeTableMap(
    tableNode,
    anchorCellNode,
    anchorCellNode,
  );
  const firstCell = tableMap[0][0];
  const lastCell = tableMap[tableMap.length - 1][tableMap[0].length - 1];
  const {startRow, startColumn} = cellValue;

  const isAtFirstCell =
    startRow === firstCell.startRow && startColumn === firstCell.startColumn;
  const isAtLastCell =
    startRow === lastCell.startRow && startColumn === lastCell.startColumn;

  if (isAtFirstCell) {
    return 'first';
  } else if (isAtLastCell) {
    return 'last';
  } else {
    return undefined;
  }
}

export function $getObserverCellFromCellNodeOrThrow(
  tableObserver: TableObserver,
  tableCellNode: TableCellNode,
): TableDOMCell {
  const {tableNode} = tableObserver.$lookup();
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

export function $getNearestTableCellInTableFromDOMNode(
  tableNode: TableNode,
  startingDOM: Node,
  editorState?: EditorState,
) {
  return $findParentTableCellNodeInTable(
    tableNode,
    $getNearestNodeFromDOMNode(startingDOM, editorState),
  );
}
