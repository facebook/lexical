/** @module @lexical/list */
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {SerializedListItemNode} from './LexicalListItemNode';
import type {ListType, SerializedListNode} from './LexicalListNode';
import type {LexicalCommand} from 'lexical';

import {createCommand} from 'lexical';

import {
  $handleListInsertParagraph,
  indentList,
  insertList,
  outdentList,
  removeList,
} from './formatList';
import {
  $createListItemNode,
  $isListItemNode,
  ListItemNode,
} from './LexicalListItemNode';
import {$createListNode, $isListNode, ListNode} from './LexicalListNode';
import {$getListDepth} from './utils';

export {
  $createListItemNode,
  $createListNode,
  $getListDepth,
  $handleListInsertParagraph,
  $isListItemNode,
  $isListNode,
  indentList,
  insertList,
  ListItemNode,
  ListNode,
  ListType,
  outdentList,
  removeList,
  SerializedListItemNode,
  SerializedListNode,
};

export const INSERT_UNORDERED_LIST_COMMAND: LexicalCommand<void> =
  createCommand();
export const INSERT_ORDERED_LIST_COMMAND: LexicalCommand<void> =
  createCommand();
export const INSERT_CHECK_LIST_COMMAND: LexicalCommand<void> = createCommand();
export const REMOVE_LIST_COMMAND: LexicalCommand<void> = createCommand();
