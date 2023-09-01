/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { Grid } from './LexicalTableSelection';
import { LexicalNode } from 'lexical';
import { InsertTableCommandPayloadHeaders } from '.';
import { TableCellNode } from './LexicalTableCellNode';
import { TableNode } from './LexicalTableNode';
import { TableRowNode } from './LexicalTableRowNode';
export declare function $createTableNodeWithDimensions(rowCount: number, columnCount: number, includeHeaders?: InsertTableCommandPayloadHeaders): TableNode;
export declare function $getTableCellNodeFromLexicalNode(startingNode: LexicalNode): TableCellNode | null;
export declare function $getTableRowNodeFromTableCellNodeOrThrow(startingNode: LexicalNode): TableRowNode;
export declare function $getTableNodeFromLexicalNodeOrThrow(startingNode: LexicalNode): TableNode;
export declare function $getTableRowIndexFromTableCellNode(tableCellNode: TableCellNode): number;
export declare function $getTableColumnIndexFromTableCellNode(tableCellNode: TableCellNode): number;
export type TableCellSiblings = {
    above: TableCellNode | null | undefined;
    below: TableCellNode | null | undefined;
    left: TableCellNode | null | undefined;
    right: TableCellNode | null | undefined;
};
export declare function $getTableCellSiblingsFromTableCellNode(tableCellNode: TableCellNode, grid: Grid): TableCellSiblings;
export declare function $removeTableRowAtIndex(tableNode: TableNode, indexToDelete: number): TableNode;
export declare function $insertTableRow(tableNode: TableNode, targetIndex: number, shouldInsertAfter: boolean | undefined, rowCount: number, grid: Grid): TableNode;
export declare function $insertTableRow__EXPERIMENTAL(insertAfter?: boolean): void;
export declare function $insertTableColumn(tableNode: TableNode, targetIndex: number, shouldInsertAfter: boolean | undefined, columnCount: number, grid: Grid): TableNode;
export declare function $insertTableColumn__EXPERIMENTAL(insertAfter?: boolean): void;
export declare function $deleteTableColumn(tableNode: TableNode, targetIndex: number): TableNode;
export declare function $deleteTableRow__EXPERIMENTAL(): void;
export declare function $deleteTableColumn__EXPERIMENTAL(): void;
export declare function $unmergeCell(): void;
