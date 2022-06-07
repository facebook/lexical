/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { Grid } from './LexicalTableSelection';
import type { LexicalNode } from 'lexical';
import { TableCellNode } from './LexicalTableCellNode';
import { TableNode } from './LexicalTableNode';
import { TableRowNode } from './LexicalTableRowNode';
export declare function $createTableNodeWithDimensions(rowCount: number, columnCount: number, includeHeaders?: boolean): TableNode;
export declare function $getTableCellNodeFromLexicalNode(startingNode: LexicalNode): TableCellNode | null;
export declare function $getTableRowNodeFromTableCellNodeOrThrow(startingNode: LexicalNode): TableRowNode;
export declare function $getTableNodeFromLexicalNodeOrThrow(startingNode: LexicalNode): TableNode;
export declare function $getTableRowIndexFromTableCellNode(tableCellNode: TableCellNode): number;
export declare function $getTableColumnIndexFromTableCellNode(tableCellNode: TableCellNode): number;
export declare type TableCellSiblings = {
    above: TableCellNode | null | undefined;
    below: TableCellNode | null | undefined;
    left: TableCellNode | null | undefined;
    right: TableCellNode | null | undefined;
};
export declare function $getTableCellSiblingsFromTableCellNode(tableCellNode: TableCellNode, grid: Grid): TableCellSiblings;
export declare function $removeTableRowAtIndex(tableNode: TableNode, indexToDelete: number): TableNode;
export declare function $insertTableRow(tableNode: TableNode, targetIndex: number, shouldInsertAfter: boolean, rowCount: number, grid: Grid): TableNode;
export declare function $insertTableColumn(tableNode: TableNode, targetIndex: number, shouldInsertAfter: boolean, columnCount: number): TableNode;
export declare function $deleteTableColumn(tableNode: TableNode, targetIndex: number): TableNode;
