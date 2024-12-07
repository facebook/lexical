/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $insertFirst,
  $insertNodeToNearestRoot,
  $unwrapAndFilterDescendants,
  mergeRegister,
} from '@lexical/utils';
import {
  $createParagraphNode,
  $isTextNode,
  COMMAND_PRIORITY_EDITOR,
  LexicalEditor,
  NodeKey,
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
  applyTableHandlers,
  getTableElement,
  HTMLTableElementWithWithTableSelectionState,
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
    editor.registerNodeTransform(TableNode, $tableTransform),
    editor.registerNodeTransform(TableRowNode, $tableRowTransform),
    editor.registerNodeTransform(TableCellNode, $tableCellTransform),
  );
}
