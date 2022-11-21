/** @module @lexical/table */
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Cell} from './LexicalTableSelection';
import type {HTMLTableElementWithWithTableSelectionState} from './LexicalTableSelectionHelpers';
import type {LexicalCommand} from 'lexical';

import {createCommand} from 'lexical';

import {
  $createTableCellNode,
  $isTableCellNode,
  TableCellHeaderStates,
  TableCellNode,
  SerializedTableCellNode
} from './LexicalTableCellNode';
import {
  $createTableNode,
  $getElementGridForTableNode,
  $isTableNode,
  TableNode,
  SerializedTableNode
} from './LexicalTableNode';
import {
  $createTableRowNode,
  $isTableRowNode,
  TableRowNode,
  SerializedTableRowNode
} from './LexicalTableRowNode';
import {TableSelection} from './LexicalTableSelection';
import {
  applyTableHandlers,
  getCellFromTarget,
  getTableSelectionFromTableElement,
} from './LexicalTableSelectionHelpers';
import {
  $createTableNodeWithDimensions,
  $deleteTableColumn,
  $getTableCellNodeFromLexicalNode,
  $getTableColumnIndexFromTableCellNode,
  $getTableNodeFromLexicalNodeOrThrow,
  $getTableRowIndexFromTableCellNode,
  $getTableRowNodeFromTableCellNodeOrThrow,
  $insertTableColumn,
  $insertTableRow,
  $removeTableRowAtIndex,
} from './LexicalTableUtils';

export {
  $createTableCellNode,
  $createTableNode,
  $createTableNodeWithDimensions,
  $createTableRowNode,
  $deleteTableColumn,
  $getElementGridForTableNode,
  $getTableCellNodeFromLexicalNode,
  $getTableColumnIndexFromTableCellNode,
  $getTableNodeFromLexicalNodeOrThrow,
  $getTableRowIndexFromTableCellNode,
  $getTableRowNodeFromTableCellNodeOrThrow,
  $insertTableColumn,
  $insertTableRow,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  $removeTableRowAtIndex,
  applyTableHandlers,
  Cell,
  getCellFromTarget,
  getTableSelectionFromTableElement,
  HTMLTableElementWithWithTableSelectionState,
  TableCellHeaderStates,
  TableCellNode,
  TableNode,
  TableRowNode,
  TableSelection,
  SerializedTableNode,
  SerializedTableCellNode,
  SerializedTableRowNode
};

export type InsertTableCommandPayload = Readonly<{
  columns: string;
  rows: string;
  includeHeaders?: boolean;
}>;

export const INSERT_TABLE_COMMAND: LexicalCommand<InsertTableCommandPayload> =
  createCommand('INSERT_TABLE_COMMAND');
