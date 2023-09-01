/** @module @lexical/table */
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { LexicalCommand } from 'lexical';
export type { SerializedTableCellNode } from './LexicalTableCellNode';
export { $createTableCellNode, $isTableCellNode, TableCellHeaderStates, TableCellNode, } from './LexicalTableCellNode';
export type { SerializedTableNode } from './LexicalTableNode';
export { $createTableNode, $getElementGridForTableNode, $isTableNode, TableNode, } from './LexicalTableNode';
export type { SerializedTableRowNode } from './LexicalTableRowNode';
export { $createTableRowNode, $isTableRowNode, TableRowNode, } from './LexicalTableRowNode';
export type { Cell } from './LexicalTableSelection';
export { TableSelection } from './LexicalTableSelection';
export type { HTMLTableElementWithWithTableSelectionState } from './LexicalTableSelectionHelpers';
export { applyTableHandlers, getCellFromTarget, getTableSelectionFromTableElement, } from './LexicalTableSelectionHelpers';
export { $createTableNodeWithDimensions, $deleteTableColumn, $deleteTableColumn__EXPERIMENTAL, $deleteTableRow__EXPERIMENTAL, $getTableCellNodeFromLexicalNode, $getTableColumnIndexFromTableCellNode, $getTableNodeFromLexicalNodeOrThrow, $getTableRowIndexFromTableCellNode, $getTableRowNodeFromTableCellNodeOrThrow, $insertTableColumn, $insertTableColumn__EXPERIMENTAL, $insertTableRow, $insertTableRow__EXPERIMENTAL, $removeTableRowAtIndex, $unmergeCell, } from './LexicalTableUtils';
export type InsertTableCommandPayloadHeaders = Readonly<{
    rows: boolean;
    columns: boolean;
}> | boolean;
export type InsertTableCommandPayload = Readonly<{
    columns: string;
    rows: string;
    includeHeaders?: InsertTableCommandPayloadHeaders;
}>;
export declare const INSERT_TABLE_COMMAND: LexicalCommand<InsertTableCommandPayload>;
