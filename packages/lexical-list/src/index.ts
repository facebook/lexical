/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {SerializedListItemNode} from './LexicalListItemNode';
import type {ListType, SerializedListNode} from './LexicalListNode';
import type {LexicalCommand, LexicalEditor, LexicalNode} from 'lexical';

import {mergeRegister} from '@lexical/utils';
import {
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  createCommand,
  INSERT_PARAGRAPH_COMMAND,
  TextNode,
} from 'lexical';

import {
  $handleListInsertParagraph,
  $insertList,
  $removeList,
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
  $insertList,
  $isListItemNode,
  $isListNode,
  $removeList,
  ListItemNode,
  ListNode,
  ListType,
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
        $insertList('number');
        return true;
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      INSERT_UNORDERED_LIST_COMMAND,
      () => {
        $insertList('bullet');
        return true;
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      REMOVE_LIST_COMMAND,
      () => {
        $removeList();
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
    editor.registerMutationListener(
      ListItemNode,
      (mutations) => {
        editor.update(() => {
          for (const [key, type] of mutations) {
            if (type !== 'destroyed') {
              const node = $getNodeByKey<ListItemNode>(key);
              const listItemElement = editor.getElementByKey(key);
              if (node && listItemElement) {
                const firstChild = node.getFirstChild<LexicalNode>();
                if (firstChild) {
                  const textElement = editor.getElementByKey(
                    firstChild.getKey(),
                  );
                  if (textElement) {
                    listItemElement.setAttribute(
                      'style',
                      textElement.style.cssText,
                    );
                  }
                } else {
                  const selection = $getSelection();
                  if ($isRangeSelection(selection)) {
                    listItemElement.setAttribute(
                      'style',
                      selection.style || '',
                    );
                  }
                }
              }
            }
          }
        });
      },
      {skipInitialization: false},
    ),
    editor.registerNodeTransform(TextNode, (node) => {
      const listItemParentNode = node.getParent();
      if ($isListItemNode(listItemParentNode)) {
        listItemParentNode.markDirty();
      }
    }),
  );
  return removeListener;
}

/**
 * @deprecated use {@link $insertList} from an update or command listener.
 *
 * Inserts a new ListNode. If the selection's anchor node is an empty ListItemNode and is a child of
 * the root/shadow root, it will replace the ListItemNode with a ListNode and the old ListItemNode.
 * Otherwise it will replace its parent with a new ListNode and re-insert the ListItemNode and any previous children.
 * If the selection's anchor node is not an empty ListItemNode, it will add a new ListNode or merge an existing ListNode,
 * unless the the node is a leaf node, in which case it will attempt to find a ListNode up the branch and replace it with
 * a new ListNode, or create a new ListNode at the nearest root/shadow root.
 * @param editor - The lexical editor.
 * @param listType - The type of list, "number" | "bullet" | "check".
 */
export function insertList(editor: LexicalEditor, listType: ListType): void {
  editor.update(() => $insertList(listType));
}

/**
 * @deprecated use {@link $removeList} from an update or command listener.
 *
 * Searches for the nearest ancestral ListNode and removes it. If selection is an empty ListItemNode
 * it will remove the whole list, including the ListItemNode. For each ListItemNode in the ListNode,
 * removeList will also generate new ParagraphNodes in the removed ListNode's place. Any child node
 * inside a ListItemNode will be appended to the new ParagraphNodes.
 * @param editor - The lexical editor.
 */
export function removeList(editor: LexicalEditor): void {
  editor.update(() => $removeList());
}
