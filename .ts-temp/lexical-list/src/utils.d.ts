/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */
import type { LexicalNode } from 'lexical';
import { ListItemNode, ListNode } from './';
export declare function $getListDepth(listNode: ListNode): number;
export declare function $getTopListNode(listItem: LexicalNode): ListNode;
export declare function $isLastItemInList(listItem: ListItemNode): boolean;
export declare function $getAllListItems(node: ListNode): Array<ListItemNode>;
export declare function isNestedListNode(node: LexicalNode | null | undefined): boolean;
export declare function findNearestListItemNode(node: LexicalNode): ListItemNode | null;
export declare function getUniqueListItemNodes(nodeList: Array<LexicalNode>): Array<ListItemNode>;
export declare function $removeHighestEmptyListParent(sublist: ListItemNode | ListNode): void;
