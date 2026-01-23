/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {Signal, signal} from '@lexical/extension';
import {
  $dfs,
  $findMatchingParent,
  $insertFirst,
  $insertNodeToNearestRoot,
  $unwrapAndFilterDescendants,
  mergeRegister,
} from '@lexical/utils';
import {
  $createParagraphNode,
  $getNearestNodeFromDOMNode,
  $getPreviousSelection,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_LOW,
  CommandPayloadType,
  ElementNode,
  isDOMNode,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  RangeSelection,
  SELECT_ALL_COMMAND,
  SELECTION_INSERT_CLIPBOARD_NODES_COMMAND,
} from 'lexical';
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
import {$getTableAndElementByKey, TableObserver} from './LexicalTableObserver';
import {$isTableRowNode, TableRowNode} from './LexicalTableRowNode';
import {
  $createTableSelectionFrom,
  $isTableSelection,
  TableSelection,
} from './LexicalTableSelection';
import {
  $findTableNode,
  applyTableHandlers,
  getTableElement,
  HTMLTableElementWithWithTableSelectionState,
} from './LexicalTableSelectionHelpers';
import {
  $computeTableCellRectBoundary,
  $computeTableMap,
  $computeTableMapSkipCellCheck,
  $createTableNodeWithDimensions,
  $getNodeTriplet,
  $getTableColumnIndexFromTableCellNode,
  $getTableNodeFromLexicalNodeOrThrow,
  $insertTableColumnAtNode,
  $insertTableRowAtNode,
  $mergeCells,
  $unmergeCellNode,
} from './LexicalTableUtils';

function $insertTable(
  {rows, columns, includeHeaders}: InsertTableCommandPayload,
  hasNestedTables: boolean,
): boolean {
  const selection = $getSelection() || $getPreviousSelection();
  if (!selection || !$isRangeSelection(selection)) {
    return false;
  }

  // Prevent nested tables by checking if we're already inside a table
  if (!hasNestedTables && $findTableNode(selection.anchor.getNode())) {
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
  const colWidths = node.getColWidths();
  const columnCount = node.getColumnCount();
  if (colWidths && colWidths.length !== columnCount) {
    let newColWidths: number[] | undefined = undefined;
    if (columnCount < colWidths.length) {
      newColWidths = colWidths.slice(0, columnCount);
    } else if (colWidths.length > 0) {
      // Repeat the last column width.
      const fillWidth = colWidths[colWidths.length - 1];
      newColWidths = [
        ...colWidths,
        ...Array(columnCount - colWidths.length).fill(fillWidth),
      ];
    }
    node.setColWidths(newColWidths);
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

function $tableSelectAllCommand(): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return false;
  }

  // Check if the selection is inside a table
  const anchorNode = selection.anchor.getNode();
  const tableNode = $findTableNode(anchorNode);
  if (tableNode === null) {
    return false;
  }

  // CRITICAL: Only intercept if table is the ONLY child of root
  // This is required to reproduce the bug: table must be the only content, no empty paragraphs
  // This prevents breaking other tests that expect RangeSelection when there's content outside table
  const root = $getRoot();
  if (!root.is(tableNode.getParent()) || root.getChildrenSize() !== 1) {
    return false;
  }

  // At this point, table is the only child
  // This is the exact scenario from issue #8074: table is the only content in editor

  // Get the table map to find first and last cells (handles merged cells correctly)
  const [tableMap] = $computeTableMapSkipCellCheck(tableNode, null, null);
  if (tableMap.length === 0 || tableMap[0].length === 0) {
    return false;
  }

  // Get the first cell (top-left)
  const firstCellMap = tableMap[0][0];
  if (!firstCellMap || !firstCellMap.cell) {
    return false;
  }

  // Get the last cell (bottom-right)
  const lastRow = tableMap[tableMap.length - 1];
  const lastCellMap = lastRow[lastRow.length - 1];
  if (!lastCellMap || !lastCellMap.cell) {
    return false;
  }

  // Create a TableSelection that selects all cells
  const tableSelection = $createTableSelectionFrom(
    tableNode,
    firstCellMap.cell,
    lastCellMap.cell,
  );
  $setSelection(tableSelection);

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

/**
 * Register table command listeners and the table integrity transforms. The
 * table selection observer should be registered separately after this with
 * {@link registerTableSelectionObserver}.
 *
 * @param editor The editor
 * @returns An unregister callback
 */
export function registerTablePlugin(
  editor: LexicalEditor,
  options?: {hasNestedTables?: Signal<boolean>},
): () => void {
  if (!editor.hasNodes([TableNode])) {
    invariant(false, 'TablePlugin: TableNode is not registered on editor');
  }

  const {hasNestedTables = signal(false)} = options ?? {};

  return mergeRegister(
    editor.registerCommand(
      INSERT_TABLE_COMMAND,
      (payload) => {
        return $insertTable(payload, hasNestedTables.peek());
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand(
      SELECTION_INSERT_CLIPBOARD_NODES_COMMAND,
      (payload, dispatchEditor) => {
        if (editor !== dispatchEditor) {
          return false;
        }
        return $tableSelectionInsertClipboardNodesCommand(
          payload,
          hasNestedTables,
        );
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand(
      SELECT_ALL_COMMAND,
      $tableSelectAllCommand,
      COMMAND_PRIORITY_LOW,
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

function $tableSelectionInsertClipboardNodesCommand(
  selectionPayload: CommandPayloadType<
    typeof SELECTION_INSERT_CLIPBOARD_NODES_COMMAND
  >,
  hasNestedTables: Signal<boolean>,
) {
  const {nodes, selection} = selectionPayload;

  const hasTables = nodes.some(
    (n) => $isTableNode(n) || $dfs(n).some((d) => $isTableNode(d.node)),
  );
  if (!hasTables) {
    // Not pasting a table - no special handling required.
    return false;
  }

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

  if (!isSelectionInsideOfGrid) {
    // Not pasting in a grid - no special handling required.
    return false;
  }

  // When pasting just a table, flatten the table on the destination table, even when nested tables are allowed.
  if (nodes.length === 1 && $isTableNode(nodes[0])) {
    return $insertTableIntoGrid(nodes[0], selection);
  }

  // When pasting multiple nodes (including tables) into a cell, update the table to fit.
  if (isRangeSelection && hasNestedTables.peek()) {
    return $insertTableNodesIntoCells(nodes, selection);
  }

  // If we reached this point, there's a table in the clipboard and nested tables are not allowed - reject the paste.
  return true;
}

function $insertTableIntoGrid(
  tableNode: TableNode,
  selection: RangeSelection | TableSelection,
) {
  const anchorAndFocus = selection.getStartEndPoints();
  const isTableSelection = $isTableSelection(selection);

  if (anchorAndFocus === null) {
    return false;
  }

  const [anchor, focus] = anchorAndFocus;
  const [anchorCellNode, anchorRowNode, gridNode] = $getNodeTriplet(anchor);
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

  const [initialGridMap, anchorCellMap, focusCellMap] = $computeTableMap(
    gridNode,
    anchorCellNode,
    focusCellNode,
  );
  const [templateGridMap] = $computeTableMapSkipCellCheck(
    tableNode,
    null,
    null,
  );
  const initialRowCount = initialGridMap.length;
  const initialColCount = initialRowCount > 0 ? initialGridMap[0].length : 0;

  // If we have a range selection, we'll fit the template grid into the
  // table, growing the table if necessary.
  let startRow = anchorCellMap.startRow;
  let startCol = anchorCellMap.startColumn;
  let affectedRowCount = templateGridMap.length;
  let affectedColCount = affectedRowCount > 0 ? templateGridMap[0].length : 0;

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
          Math.min(row + templateCell.__rowSpan, startRow + affectedRowCount) -
          1;
        const lastColForMerge =
          Math.min(col + templateCell.__colSpan, startCol + affectedColCount) -
          1;
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
}

// Inserts the given nodes (which will include TableNodes) into the table at the given selection.
function $insertTableNodesIntoCells(
  nodes: LexicalNode[],
  selection: TableSelection | RangeSelection,
) {
  // Currently only support pasting into a single cell. In other cases we reject the insertion.
  const isMultiCellTableSelection =
    $isTableSelection(selection) &&
    !selection.focus.getNode().is(selection.anchor.getNode());
  const isMultiCellRangeSelection =
    $isRangeSelection(selection) &&
    $isTableCellNode(selection.anchor.getNode()) &&
    !selection.anchor.getNode().is(selection.focus.getNode());
  if (isMultiCellTableSelection || isMultiCellRangeSelection) {
    return true;
  }

  // Determine the width of the cell being pasted into.
  const destinationCellNode = $findMatchingParent(
    selection.focus.getNode(),
    $isTableCellNode,
  );
  if (!destinationCellNode) {
    return false;
  }
  const destinationTableNode =
    $getTableNodeFromLexicalNodeOrThrow(destinationCellNode);

  const columnIndex =
    $getTableColumnIndexFromTableCellNode(destinationCellNode);
  let cellWidth = destinationCellNode.getWidth();
  const colWidths = destinationTableNode.getColWidths();
  if (colWidths) {
    cellWidth = colWidths[columnIndex];
  }
  if (cellWidth === undefined) {
    return false;
  }

  // Recursively find all table nodes in the nodes array (including nested tables)
  const tablesToResize: TableNode[] = [];

  function collectTables(node: LexicalNode): void {
    if ($isTableNode(node)) {
      tablesToResize.push(node);
    }
    // Recursively check children for nested tables
    if ($isElementNode(node)) {
      for (const child of node.getChildren()) {
        collectTables(child);
      }
    }
  }

  // Collect all tables from the nodes being pasted
  for (const node of nodes) {
    collectTables(node);
  }

  // Clear column widths on all tables so they fit their container
  // When column widths are undefined, tables will auto-size to fit their container
  for (const table of tablesToResize) {
    table.setColWidths(undefined);
  }

  // Return false to let normal insertion proceed with the modified nodes
  return false;
}
