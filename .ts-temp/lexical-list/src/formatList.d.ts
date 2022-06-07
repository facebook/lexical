/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { LexicalEditor, LexicalNode } from 'lexical';
import { ListItemNode, ListNode } from './';
import { ListType } from './LexicalListNode';
export declare function insertList(editor: LexicalEditor, listType: ListType): void;
export declare function removeList(editor: LexicalEditor): void;
export declare function updateChildrenListItemValue(list: ListNode, children?: Array<LexicalNode>): void;
export declare function $handleIndent(listItemNodes: Array<ListItemNode>): void;
export declare function $handleOutdent(listItemNodes: Array<ListItemNode>): void;
export declare function indentList(): void;
export declare function outdentList(): void;
export declare function $handleListInsertParagraph(): boolean;
