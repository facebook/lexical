/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {SerializedListItemNode} from './LexicalListItemNode';
import type {ListType, SerializedListNode} from './LexicalListNode';
import type {LexicalCommand, LexicalEditor} from 'lexical';

import {mergeRegister} from '@lexical/utils';
import {
  COMMAND_PRIORITY_LOW,
  createCommand,
  INSERT_PARAGRAPH_COMMAND,
} from 'lexical';

import {$handleListInsertParagraph, insertList, removeList} from './formatList';
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
  insertList,
  ListItemNode,
  ListNode,
  ListType,
  removeList,
  SerializedListItemNode,
  SerializedListNode,
};

export const INSERT_UNORDERED_LIST_COMMAND: LexicalCommand<void> =
  createCommand('INSERT_UNORDERED_LIST_COMMAND');
export const INSERT_ORDERED_LIST_COMMAND: LexicalCommand<void> = createCommand(
  'INSERT_ORDERED_LIST_COMMAND',
);
export const INSERT_CHECK_LIST_COMMAND: LexicalCommand<void> = createCommand(
  'INSERT_CHECK_LIST_COMMAND',
);
export const REMOVE_LIST_COMMAND: LexicalCommand<void> = createCommand(
  'REMOVE_LIST_COMMAND',
);

export function registerList(editor: LexicalEditor): () => void {
  const removeListener = mergeRegister(
    editor.registerCommand(
      INSERT_ORDERED_LIST_COMMAND,
      () => {
        insertList(editor, 'number');
        return true;
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      INSERT_UNORDERED_LIST_COMMAND,
      () => {
        insertList(editor, 'bullet');
        return true;
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      REMOVE_LIST_COMMAND,
      () => {
        removeList(editor);
        return true;
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      INSERT_PARAGRAPH_COMMAND,
      () => {
        const hasHandledInsertParagraph = $handleListInsertParagraph();

        if (hasHandledInsertParagraph) {
          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_LOW,
    ),
  );
  return removeListener;
}
