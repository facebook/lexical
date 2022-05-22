/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {ListNodeTagType} from './src/LexicalListNode';

import {
  ElementNode,
  LexicalNode,
  LexicalEditor,
  ParagraphNode,
  RangeSelection,
  LexicalCommand,
  SerializedElementNode,
} from 'lexical';
import {Spread} from 'libdefs/globals';

export type ListType = 'number' | 'bullet' | 'check';
export function $createListItemNode(checked?: boolean | void): ListItemNode;
export function $createListNode(listType: ListType, start?: number): ListNode;
export function $getListDepth(listNode: ListNode): number;
export function $handleListInsertParagraph(): boolean;
export function $isListItemNode(node?: LexicalNode): node is ListItemNode;
export function $isListNode(node?: LexicalNode): node is ListNode;
export function indentList(): void;
export function insertList(editor: LexicalEditor, listType: ListType): void;
export declare class ListItemNode extends ElementNode {
  append(...nodes: LexicalNode[]): ListItemNode;
  replace<N extends LexicalNode>(replaceWithNode: N): N;
  insertAfter(node: LexicalNode): LexicalNode;
  insertNewAfter(): ListItemNode | ParagraphNode;
  collapseAtStart(selection: RangeSelection): true;
  getIndent(): number;
  setIndent(indent: number): this;
  insertBefore(nodeToInsert: LexicalNode): LexicalNode;
  canInsertAfter(node: LexicalNode): boolean;
  canReplaceWith(replacement: LexicalNode): boolean;
  canMergeWith(node: LexicalNode): boolean;
  getChecked(): boolean | void;
  setChecked(boolean): this;
  toggleChecked(): void;
  static importJSON(serializedNode: SerializedListItemNode): ListItemNode;
  exportJSON(): SerializedListItemNode;
}
export declare class ListNode extends ElementNode {
  canBeEmpty(): false;
  append(...nodesToAppend: LexicalNode[]): ListNode;
  getTag(): ListNodeTagType;
  getStart(): number;
  getListType(): ListType;
  static importJSON(serializedNode: SerializedListNode): ListNode;
  exportJSON(): SerializedListNode;
}

export function outdentList(): void;
export function removeList(editor: LexicalEditor): boolean;

export var INSERT_UNORDERED_LIST_COMMAND: LexicalCommand<void>;
export var INSERT_ORDERED_LIST_COMMAND: LexicalCommand<void>;
export var INSERT_CHECK_LIST_COMMAND: LexicalCommand<void>;
export var REMOVE_LIST_COMMAND: LexicalCommand<void>;

export type SerializedListItemNode = Spread<
  {
    checked: boolean | void;
    value: number;
    type: 'listitem';
  },
  SerializedElementNode
>;

export type SerializedListNode = Spread<
  {
    listType: ListType;
    start: number;
    tag: ListNodeTagType;
    type: 'list';
  },
  SerializedElementNode
>;
