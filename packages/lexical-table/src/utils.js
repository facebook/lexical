/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */
import type {LexicalNode} from 'lexical';

import {$findMatchingParent} from '@lexical/helpers/nodes';
import {$createParagraphNode, $createTextNode} from 'lexical';
import invariant from 'shared/invariant';

import {
  $createTableCellNode,
  $isTableCellNode,
  TableCellNode,
} from './LexicalTableCellNode';
import {$createTableNode, $isTableNode, TableNode} from './LexicalTableNode';
import {
  $createTableRowNode,
  $isTableRowNode,
  TableRowNode,
} from './LexicalTableRowNode';

export function $createTableNodeWithDimensions(
  rowCount: number,
  columnCount: number,
  includeHeaders?: boolean = true,
): TableNode {
  const tableNode = $createTableNode();

  for (let iRow = 0; iRow < rowCount; iRow++) {
    const tableRowNode = $createTableRowNode();

    for (let iColumn = 0; iColumn < columnCount; iColumn++) {
      const headerStyles = new Set();

      if (includeHeaders) {
        if (iRow === 0) headerStyles.add('row');
        if (iColumn === 0) headerStyles.add('column');
      }

      const tableCellNode = $createTableCellNode(headerStyles);

      const paragraphNode = $createParagraphNode();
      paragraphNode.append($createTextNode());

      tableCellNode.append(paragraphNode);
      tableRowNode.append(tableCellNode);
    }

    tableNode.append(tableRowNode);
  }

  return tableNode;
}

export function $getTableCellNodeFromLexicalNode(
  startingNode: LexicalNode,
): TableCellNode | null {
  const node = $findMatchingParent(startingNode, (n) => $isTableCellNode(n));

  if ($isTableCellNode(node)) {
    return node;
  }

  return null;
}

export function $getTableRowNodeFromTableCellNodeOrThrow(
  startingNode: LexicalNode,
): TableRowNode {
  const node = $findMatchingParent(startingNode, (n) => $isTableRowNode(n));

  if ($isTableRowNode(node)) {
    return node;
  }

  throw new Error('Expected table cell to be inside of table row.');
}

export function $getTableNodeFromLexicalNodeOrThrow(
  startingNode: LexicalNode,
): TableNode {
  const node = $findMatchingParent(startingNode, (n) => $isTableNode(n));

  if ($isTableNode(node)) {
    return node;
  }

  throw new Error('Expected table cell to be inside of table.');
}

export function $getTableRowIndexFromTableCellNode(
  tableCellNode: TableCellNode,
): number {
  const tableRowNode = $getTableRowNodeFromTableCellNodeOrThrow(tableCellNode);

  const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableRowNode);

  return tableNode.getChildren().findIndex((n) => n.is(tableRowNode));
}

export function $getTableColumnIndexFromTableCellNode(
  tableCellNode: TableCellNode,
): number {
  const tableRowNode = $getTableRowNodeFromTableCellNodeOrThrow(tableCellNode);

  return tableRowNode.getChildren().findIndex((n) => n.is(tableCellNode));
}

export type TableCellSiblings = {
  above: ?TableCellNode,
  below: ?TableCellNode,
  left: ?TableCellNode,
  right: ?TableCellNode,
};

export function $getTableCellSiblingsFromTableCellNode(
  tableCellNode: TableCellNode,
): TableCellSiblings {
  const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);

  const {x, y} = tableNode.getCordsFromCellNode(tableCellNode);

  return {
    above: tableNode.getCellNodeFromCords(x, y - 1),
    below: tableNode.getCellNodeFromCords(x, y + 1),
    left: tableNode.getCellNodeFromCords(x - 1, y),
    right: tableNode.getCellNodeFromCords(x + 1, y),
  };
}

export function $removeTableRowAtIndex(
  tableNode: TableNode,
  indexToDelete: number,
): TableNode {
  const tableRows = tableNode.getChildren();

  if (indexToDelete >= tableRows.length || indexToDelete < 0) {
    throw new Error('Expected table cell to be inside of table row.');
  }

  const targetRowNode = tableRows[indexToDelete];

  targetRowNode.remove();

  return tableNode;
}

export function $insertTableRow(
  tableNode: TableNode,
  targetIndex: number,
  shouldInsertAfter?: boolean = true,
  rowCount: number,
): TableNode {
  const tableRows = tableNode.getChildren();

  if (targetIndex >= tableRows.length || targetIndex < 0) {
    throw new Error('Table row target index out of range');
  }

  const targetRowNode = tableRows[targetIndex];

  if ($isTableRowNode(targetRowNode)) {
    for (let r = 0; r < rowCount; r++) {
      const tableRowCells = targetRowNode.getChildren();
      const tableColumnCount = tableRowCells.length;

      const newTableRowNode = $createTableRowNode();

      for (let c = 0; c < tableColumnCount; c++) {
        const tableCellFromTargetRow = tableRowCells[c];

        invariant(
          $isTableCellNode(tableCellFromTargetRow),
          'Expected table cell',
        );

        const {above, below} = $getTableCellSiblingsFromTableCellNode(
          tableCellFromTargetRow,
        );

        const headerStyles = new Set();

        if (
          (above && above.getHeaderStyles().has('column')) ||
          (below && below.getHeaderStyles().has('column'))
        ) {
          headerStyles.add('column');
        }

        const tableCellNode = $createTableCellNode(headerStyles);

        tableCellNode.append($createParagraphNode());
        newTableRowNode.append(tableCellNode);
      }

      if (shouldInsertAfter) {
        targetRowNode.insertAfter(newTableRowNode);
      } else {
        targetRowNode.insertBefore(newTableRowNode);
      }
    }
  } else {
    throw new Error('Row before insertion index does not exist.');
  }

  return tableNode;
}

export function $insertTableColumn(
  tableNode: TableNode,
  targetIndex: number,
  shouldInsertAfter?: boolean = true,
  columnCount: number,
): TableNode {
  const tableRows = tableNode.getChildren();

  for (let r = 0; r < tableRows.length; r++) {
    const currentTableRowNode = tableRows[r];
    if ($isTableRowNode(currentTableRowNode)) {
      for (let c = 0; c < columnCount; c++) {
        const headerStyles = new Set();

        if (r === 0) {
          headerStyles.add('row');
        }

        const newTableCell = $createTableCellNode(headerStyles);

        newTableCell.append($createParagraphNode());

        const tableRowChildren = currentTableRowNode.getChildren();

        if (targetIndex >= tableRowChildren.length || targetIndex < 0) {
          throw new Error('Table column target index out of range');
        }

        const targetCell = tableRowChildren[targetIndex];

        if (shouldInsertAfter) {
          targetCell.insertAfter(newTableCell);
        } else {
          targetCell.insertBefore(newTableCell);
        }
      }
    }
  }

  return tableNode;
}

export function $deleteTableColumn(
  tableNode: TableNode,
  targetIndex: number,
): TableNode {
  const tableRows = tableNode.getChildren();

  for (let i = 0; i < tableRows.length; i++) {
    const currentTableRowNode = tableRows[i];

    if ($isTableRowNode(currentTableRowNode)) {
      const tableRowChildren = currentTableRowNode.getChildren();

      if (targetIndex >= tableRowChildren.length || targetIndex < 0) {
        throw new Error('Table column target index out of range');
      }

      tableRowChildren[targetIndex].remove();
    }
  }

  return tableNode;
}
