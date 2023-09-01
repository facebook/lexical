/** @module @lexical/list */
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { SerializedListItemNode } from './LexicalListItemNode';
import type { ListType, SerializedListNode } from './LexicalListNode';
import type { LexicalCommand } from 'lexical';
import { $handleListInsertParagraph, insertList, removeList } from './formatList';
import { $createListItemNode, $isListItemNode, ListItemNode } from './LexicalListItemNode';
import { $createListNode, $isListNode, ListNode } from './LexicalListNode';
import { $getListDepth } from './utils';
export { $createListItemNode, $createListNode, $getListDepth, $handleListInsertParagraph, $isListItemNode, $isListNode, insertList, ListItemNode, ListNode, ListType, removeList, SerializedListItemNode, SerializedListNode, };
export declare const INSERT_UNORDERED_LIST_COMMAND: LexicalCommand<void>;
export declare const INSERT_ORDERED_LIST_COMMAND: LexicalCommand<void>;
export declare const INSERT_CHECK_LIST_COMMAND: LexicalCommand<void>;
export declare const REMOVE_LIST_COMMAND: LexicalCommand<void>;
