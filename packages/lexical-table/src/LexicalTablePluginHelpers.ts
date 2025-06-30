/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $getClipboardDataFromSelection,
  copyToClipboard,
} from '@lexical/clipboard';
import {
  $findMatchingParent,
  $insertFirst,
  $insertNodeToNearestRoot,
  $unwrapAndFilterDescendants,
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
  CLICK_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_HIGH,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  CUT_COMMAND,
  DELETE_LINE_COMMAND,
  ElementNode,
  FOCUS_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  getDOMSelection,
  INSERT_PARAGRAPH_COMMAND,
  isDOMNode,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
  LexicalCommand,
  LexicalEditor,
  NodeKey,
  SELECTION_CHANGE_COMMAND,
  SELECTION_INSERT_CLIPBOARD_NODES_COMMAND,
} from 'lexical';
import {IS_FIREFOX} from 'shared/environment';
import invariant from 'shared/invariant';

import {
  $createTableCellNode,
  $isTableCellNode,
  TableCellNode,
} from './LexicalTableCellNode';
import {
  INSERT_TABLE_COMMAND,
  InsertTableCommandPayload,
} from './LexicalTableCommands';
import {$isTableNode, TableNode} from './LexicalTableNode';
import {
  $getTableAndElementByKey,
  TableDOMCell,
  TableObserver,
} from './LexicalTableObserver';
import {$isTableRowNode, TableRowNode} from './LexicalTableRowNode';
import {$isTableSelection} from './LexicalTableSelection';
import {
  $addHighlightStyleToTable,
  $findCellNode,
  $findParentTableCellNodeInTable,
  $findTableNode,
  $getObserverCellFromCellNodeOrThrow,
  $getTableEdgeCursorPosition,
  $handleArrowKey,
  $insertParagraphAtTableEdge,
  $isFullTableSelection,
  $isSelectionInTable,
  $removeHighlightStyleToTable,
  $selectAdjacentCell,
  applyTableHandlers,
  ARROW_KEY_COMMANDS_WITH_DIRECTION,
  DELETE_KEY_COMMANDS,
  DELETE_TEXT_COMMANDS,
  getDOMCellFromTarget,
  getDOMCellInTableFromTarget,
  getTableElement,
  HTMLTableElementWithWithTableSelectionState,
  isPointerDownOnEvent,
  LEXICAL_ELEMENT_KEY,
  stopEvent,
} from './LexicalTableSelectionHelpers';
import {
  $computeTableMap,
  $computeTableMapSkipCellCheck,
  $createTableNodeWithDimensions,
  $getNodeTriplet,
} from './LexicalTableUtils';

function $insertTableCommandListener({
  rows,
  columns,
  includeHeaders,
}: InsertTableCommandPayload): boolean {
  const selection = $getSelection() || $getPreviousSelection();
  if (!selection || !$isRangeSelection(selection)) {
    return false;
  }

  // Prevent nested tables by checking if we're already inside a table
  if ($findTableNode(selection.anchor.getNode())) {
    return false;
  }

  const tableNode = $createTableNodeWithDimensions(
    Number(rows),
    Number(columns),
    includeHeaders,
  );
  $insertNodeToNearestRoot(tableNode);

  const firstDescendant = tableNode.getFirstDescendant();
  if ($isTextNode(firstDescendant)) {
    firstDescendant.select();
  }

  return true;
}

function $tableCellTransform(node: TableCellNode) {
  if (!$isTableRowNode(node.getParent())) {
    // TableCellNode must be a child of TableRowNode.
    node.remove();
  } else if (node.isEmpty()) {
    // TableCellNode should never be empty
    node.append($createParagraphNode());
  }
}

function $tableRowTransform(node: TableRowNode) {
  if (!$isTableNode(node.getParent())) {
    // TableRowNode must be a child of TableNode.
    // TODO: Future support of tbody/thead/tfoot may change this
    node.remove();
  } else {
    $unwrapAndFilterDescendants(node, $isTableCellNode);
  }
}

function $tableTransform(node: TableNode) {
  // TableRowNode is the only valid child for TableNode
  // TODO: Future support of tbody/thead/tfoot/caption may change this
  $unwrapAndFilterDescendants(node, $isTableRowNode);

  const [gridMap] = $computeTableMapSkipCellCheck(node, null, null);
  const maxRowLength = gridMap.reduce((curLength, row) => {
    return Math.max(curLength, row.length);
  }, 0);
  const rowNodes = node.getChildren();
  for (let i = 0; i < gridMap.length; ++i) {
    const rowNode = rowNodes[i];
    if (!rowNode) {
      continue;
    }
    invariant(
      $isTableRowNode(rowNode),
      'TablePlugin: Expecting all children of TableNode to be TableRowNode, found %s (type %s)',
      rowNode.constructor.name,
      rowNode.getType(),
    );
    const rowLength = gridMap[i].reduce(
      (acc, cell) => (cell ? 1 + acc : acc),
      0,
    );
    if (rowLength === maxRowLength) {
      continue;
    }
    for (let j = rowLength; j < maxRowLength; ++j) {
      // TODO: inherit header state from another header or body
      const newCell = $createTableCellNode();
      newCell.append($createParagraphNode());
      rowNode.append(newCell);
    }
  }
}

function $tableClickCommand(event: MouseEvent): boolean {
  if (event.detail < 3 || !isDOMNode(event.target)) {
    return false;
  }
  const startNode = $getNearestNodeFromDOMNode(event.target);
  if (startNode === null) {
    return false;
  }
  const blockNode = $findMatchingParent(
    startNode,
    (node): node is ElementNode => $isElementNode(node) && !node.isInline(),
  );
  if (blockNode === null) {
    return false;
  }
  const rootNode = blockNode.getParent();
  if (!$isTableCellNode(rootNode)) {
    return false;
  }
  blockNode.select(0);
  return true;
}

/**
 * Register a transform to ensure that all TableCellNode have a colSpan and rowSpan of 1.
 * This should only be registered when you do not want to support merged cells.
 *
 * @param editor The editor
 * @returns An unregister callback
 */
export function registerTableCellUnmergeTransform(
  editor: LexicalEditor,
): () => void {
  return editor.registerNodeTransform(TableCellNode, (node) => {
    if (node.getColSpan() > 1 || node.getRowSpan() > 1) {
      // When we have rowSpan we have to map the entire Table to understand where the new Cells
      // fit best; let's analyze all Cells at once to save us from further transform iterations
      const [, , gridNode] = $getNodeTriplet(node);
      const [gridMap] = $computeTableMap(gridNode, node, node);
      // TODO this function expects Tables to be normalized. Look into this once it exists
      const rowsCount = gridMap.length;
      const columnsCount = gridMap[0].length;
      let row = gridNode.getFirstChild();
      invariant(
        $isTableRowNode(row),
        'Expected TableNode first child to be a RowNode',
      );
      const unmerged = [];
      for (let i = 0; i < rowsCount; i++) {
        if (i !== 0) {
          row = row.getNextSibling();
          invariant(
            $isTableRowNode(row),
            'Expected TableNode first child to be a RowNode',
          );
        }
        let lastRowCell: null | TableCellNode = null;
        for (let j = 0; j < columnsCount; j++) {
          const cellMap = gridMap[i][j];
          const cell = cellMap.cell;
          if (cellMap.startRow === i && cellMap.startColumn === j) {
            lastRowCell = cell;
            unmerged.push(cell);
          } else if (cell.getColSpan() > 1 || cell.getRowSpan() > 1) {
            invariant(
              $isTableCellNode(cell),
              'Expected TableNode cell to be a TableCellNode',
            );
            const newCell = $createTableCellNode(cell.__headerState);
            if (lastRowCell !== null) {
              lastRowCell.insertAfter(newCell);
            } else {
              $insertFirst(row, newCell);
            }
          }
        }
      }
      for (const cell of unmerged) {
        cell.setColSpan(1);
        cell.setRowSpan(1);
      }
    }
  });
}

export function registerTableSelectionObserver(
  editor: LexicalEditor,
  hasTabHandler: boolean = true,
): () => void {
  const tableSelections = new Map<
    NodeKey,
    [TableObserver, HTMLTableElementWithWithTableSelectionState]
  >();

  const initializeTableNode = (
    tableNode: TableNode,
    nodeKey: NodeKey,
    dom: HTMLElement,
  ) => {
    const tableElement = getTableElement(tableNode, dom);
    const tableSelection = applyTableHandlers(
      tableNode,
      tableElement,
      editor,
      hasTabHandler,
    );
    tableSelections.set(nodeKey, [tableSelection, tableElement]);
  };

  const unregisterMutationListener = editor.registerMutationListener(
    TableNode,
    (nodeMutations) => {
      editor.getEditorState().read(
        () => {
          for (const [nodeKey, mutation] of nodeMutations) {
            const tableSelection = tableSelections.get(nodeKey);
            if (mutation === 'created' || mutation === 'updated') {
              const {tableNode, tableElement} =
                $getTableAndElementByKey(nodeKey);
              if (tableSelection === undefined) {
                initializeTableNode(tableNode, nodeKey, tableElement);
              } else if (tableElement !== tableSelection[1]) {
                // The update created a new DOM node, destroy the existing TableObserver
                tableSelection[0].removeListeners();
                tableSelections.delete(nodeKey);
                initializeTableNode(tableNode, nodeKey, tableElement);
              }
            } else if (mutation === 'destroyed') {
              if (tableSelection !== undefined) {
                tableSelection[0].removeListeners();
                tableSelections.delete(nodeKey);
              }
            }
          }
        },
        {editor},
      );
    },
    {skipInitialization: false},
  );

  return () => {
    unregisterMutationListener();
    // Hook might be called multiple times so cleaning up tables listeners as well,
    // as it'll be reinitialized during recurring call
    for (const [, [tableSelection]] of tableSelections) {
      tableSelection.removeListeners();
    }
  };
}

type TableEntry = {
  observer: TableObserver;
  dom: HTMLTableElement;
  node: TableNode;
};

export function registerOptimizedTableSelectionObserver(
  editor: LexicalEditor,
  rootElement: HTMLElement,
  hasTabHandler: boolean = true,
): () => void {
  const tables = new Map<NodeKey, TableEntry>();
  const domToKey = new WeakMap<HTMLTableElement, NodeKey>();
  const tablePointerHandlers = new Map<
    NodeKey,
    (event: PointerEvent) => void
  >();

  let activeObserver: TableObserver | null = null;

  const getTableAndObserver = (nodeKey: NodeKey) => {
    const tableEntry = tables.get(nodeKey);
    if (tableEntry) {
      return {
        tableNode: tableEntry.node,
        tableObserver: tableEntry.observer,
      };
    }
    return {tableNode: null, tableObserver: null};
  };

  const getActiveTableAndObserver = () => {
    if (activeObserver) {
      return getTableAndObserver(activeObserver.tableNodeKey);
    }
    return {tableNode: null, tableObserver: null};
  };

  const $onGlobalPointerDown = (event: PointerEvent) => {
    const target = event.target;

    if (event.button !== 0 || !isDOMNode(target)) {
      return;
    }

    // Clear previous highlighted tables
    editor.getEditorState().read(() => {
      const previousSelection = $getSelection();
      const previousSelectedTables = previousSelection
        ? previousSelection.getNodes().filter($isTableNode)
        : [];
      if (previousSelectedTables.length > 0) {
        editor.update(() => {
          for (const tableNode of previousSelectedTables) {
            const tableEntry = tables.get(tableNode.getKey());
            if (tableEntry) {
              tableEntry.observer.$clearHighlight();
            }
          }
        });
      }
    });
  };

  const createPointerHandlers = (tableNodeKey: NodeKey) => {
    const tableEntry = tables.get(tableNodeKey);

    if (!tableEntry) {
      return;
    }

    if (!activeObserver) {
      return;
    }

    const onPointerUp = () => {
      if (!activeObserver) {
        return;
      }
      activeObserver.isSelecting = false;
      rootElement.removeEventListener('pointerup', onPointerUp);
      rootElement.removeEventListener('pointermove', onPointerMove);
    };

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (!activeObserver) {
        return;
      }

      const tableElement = tableEntry.dom;

      if (!isPointerDownOnEvent(moveEvent) && activeObserver.isSelecting) {
        activeObserver.isSelecting = false;
        rootElement.removeEventListener('pointerup', onPointerUp);
        rootElement.removeEventListener('pointermove', onPointerMove);
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
        (activeObserver.focusCell === null ||
          focusCell.elem !== activeObserver.focusCell.elem)
      ) {
        activeObserver.setNextFocus({focusCell, override});
        editor.dispatchCommand(SELECTION_CHANGE_COMMAND, undefined);
      }
    };

    activeObserver.isSelecting = true;

    rootElement.addEventListener(
      'pointerup',
      onPointerUp,
      activeObserver.listenerOptions,
    );
    rootElement.addEventListener(
      'pointermove',
      onPointerMove,
      activeObserver.listenerOptions,
    );
  };

  const $onTablePointerDown = (event: PointerEvent, tableNodeKey: NodeKey) => {
    const tableEntry = tables.get(tableNodeKey);

    if (!tableEntry || event.button !== 0 || !isDOMNode(event.target)) {
      return;
    }

    // Clean previous observer
    if (activeObserver && activeObserver.tableNodeKey !== tableNodeKey) {
      editor.update(() => {
        activeObserver!.$clearHighlight();
      });
    }

    const observer = tableEntry.observer;
    activeObserver = observer;
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
          ($isRangeSelection(prevSelection) || $isTableSelection(prevSelection))
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

  const $attachTable = (nodeKey: NodeKey) => {
    const {tableElement, tableNode} = $getTableAndElementByKey(nodeKey, editor);

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

  const $detachTable = (nodeKey: NodeKey) => {
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
      editor.getEditorState().read(
        () => {
          for (const [key, type] of mutations) {
            if (type === 'created') {
              $attachTable(key);
            } else if (type === 'destroyed') {
              $detachTable(key);
            } else if (type === 'updated') {
              // If the table node was updated, we need to re-create the observer
              // and re-attach the pointer handler
              const tableEntry = tables.get(key);
              const {tableElement} = $getTableAndElementByKey(key);
              if (
                tableEntry &&
                tableElement &&
                tableEntry.dom !== tableElement
              ) {
                $detachTable(key);
                $attachTable(key);
              }
            }
          }
        },
        {editor},
      );
    },
  );

  const $deleteCellHandler = (event: KeyboardEvent | ClipboardEvent | null) => {
    const selection = $getSelection();
    const {tableNode, tableObserver} = getActiveTableAndObserver();

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
    const {tableNode, tableObserver} = getActiveTableAndObserver();

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

  const unregisterCommands = mergeRegister(
    ...ARROW_KEY_COMMANDS_WITH_DIRECTION.map(([command, direction]) =>
      editor.registerCommand(
        command,
        (event) => {
          const {tableNode, tableObserver} = getActiveTableAndObserver();

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
        const {tableNode} = getActiveTableAndObserver();
        return tableNode ? tableNode.isSelected() : false;
      },
      COMMAND_PRIORITY_HIGH,
    ),
    editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      (event) => {
        const selection = $getSelection();
        const {tableNode} = getActiveTableAndObserver();

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
        const {tableNode} = getActiveTableAndObserver();

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
        const {tableNode, tableObserver} = getActiveTableAndObserver();

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
        const {tableNode, tableObserver} = getActiveTableAndObserver();

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
        const selection = $getSelection();

        if (
          !selection ||
          (!$isRangeSelection(selection) && !$isTableSelection(selection))
        ) {
          return false;
        }

        const tablesInSelection = selection.getNodes().filter($isTableNode);

        if (tablesInSelection.length === 0) {
          return false;
        }

        for (const table of tablesInSelection) {
          if (!tables.has(table.getKey())) {
            continue;
          }

          const {tableNode, tableObserver} = getTableAndObserver(
            table.getKey(),
          );

          if (!tableNode || !tableObserver) {
            continue;
          }

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
            // const editorWindow = getEditorWindow(editor);
            const domSelection = getDOMSelection(null);
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
        }

        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    ),
    editor.registerCommand(
      INSERT_PARAGRAPH_COMMAND,
      () => {
        const selection = $getSelection();
        const {tableNode} = getActiveTableAndObserver();

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
        const {tableNode} = getActiveTableAndObserver();

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

  rootElement.addEventListener('pointerdown', $onGlobalPointerDown);

  return () => {
    rootElement.removeEventListener('pointerdown', $onGlobalPointerDown);

    unregisterMutationListener();
    unregisterCommands();

    if (unregisterTab) {
      unregisterTab();
    }

    for (const [key] of tables) {
      $detachTable(key);
    }

    tables.clear();
  };
}

/**
 * Register the INSERT_TABLE_COMMAND listener and the table integrity transforms. The
 * table selection observer should be registered separately after this with
 * {@link registerTableSelectionObserver}.
 *
 * @param editor The editor
 * @returns An unregister callback
 */
export function registerTablePlugin(editor: LexicalEditor): () => void {
  if (!editor.hasNodes([TableNode])) {
    invariant(false, 'TablePlugin: TableNode is not registered on editor');
  }

  return mergeRegister(
    editor.registerCommand(
      INSERT_TABLE_COMMAND,
      $insertTableCommandListener,
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand(
      SELECTION_INSERT_CLIPBOARD_NODES_COMMAND,
      ({nodes, selection}) => {
        if (!$isRangeSelection(selection)) {
          return false;
        }
        const isInsideTableCell =
          $findTableNode(selection.anchor.getNode()) !== null;
        return isInsideTableCell && nodes.some($isTableNode);
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand(
      CLICK_COMMAND,
      $tableClickCommand,
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerNodeTransform(TableNode, $tableTransform),
    editor.registerNodeTransform(TableRowNode, $tableRowTransform),
    editor.registerNodeTransform(TableCellNode, $tableCellTransform),
  );
}
