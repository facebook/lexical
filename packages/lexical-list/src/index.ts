/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {SerializedListItemNode} from './LexicalListItemNode';
import type {
  ListNodeTagType,
  ListType,
  SerializedListNode,
} from './LexicalListNode';
import type {LexicalCommand, LexicalEditor, NodeKey} from 'lexical';

import {effect, namedSignals} from '@lexical/extension';
import {$findMatchingParent, mergeRegister} from '@lexical/utils';
import {
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  createCommand,
  defineExtension,
  INSERT_PARAGRAPH_COMMAND,
  safeCast,
  TextNode,
} from 'lexical';

import {INSERT_CHECK_LIST_COMMAND, registerCheckList} from './checkList';
import {
  $handleListInsertParagraph,
  $insertList,
  $removeList,
  updateChildrenListItemValue,
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
  INSERT_CHECK_LIST_COMMAND,
  ListItemNode,
  ListNode,
  ListNodeTagType,
  ListType,
  registerCheckList,
  SerializedListItemNode,
  SerializedListNode,
};

export const UPDATE_LIST_START_COMMAND: LexicalCommand<{
  listNodeKey: NodeKey;
  newStart: number;
}> = createCommand('UPDATE_LIST_START_COMMAND');
export const INSERT_UNORDERED_LIST_COMMAND: LexicalCommand<void> =
  createCommand('INSERT_UNORDERED_LIST_COMMAND');
export const INSERT_ORDERED_LIST_COMMAND: LexicalCommand<void> = createCommand(
  'INSERT_ORDERED_LIST_COMMAND',
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
      UPDATE_LIST_START_COMMAND,
      (payload) => {
        const {listNodeKey, newStart} = payload;
        const listNode = $getNodeByKey(listNodeKey);
        if (!$isListNode(listNode)) {
          return false;
        }
        if (listNode.getListType() === 'number') {
          listNode.setStart(newStart);
          updateChildrenListItemValue(listNode);
        }
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
      () => $handleListInsertParagraph(),
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerNodeTransform(ListItemNode, (node) => {
      const firstChild = node.getFirstChild();
      if (firstChild) {
        if ($isTextNode(firstChild)) {
          const style = firstChild.getStyle();
          const format = firstChild.getFormat();
          if (node.getTextStyle() !== style) {
            node.setTextStyle(style);
          }
          if (node.getTextFormat() !== format) {
            node.setTextFormat(format);
          }
        }
      } else {
        // If it's empty, check the selection
        const selection = $getSelection();
        if (
          $isRangeSelection(selection) &&
          (selection.style !== node.getTextStyle() ||
            selection.format !== node.getTextFormat()) &&
          selection.isCollapsed() &&
          node.is(selection.anchor.getNode())
        ) {
          node.setTextStyle(selection.style).setTextFormat(selection.format);
        }
      }
    }),
    editor.registerNodeTransform(TextNode, (node) => {
      const listItemParentNode = node.getParent();
      if (
        $isListItemNode(listItemParentNode) &&
        node.is(listItemParentNode.getFirstChild())
      ) {
        const style = node.getStyle();
        const format = node.getFormat();
        if (
          style !== listItemParentNode.getTextStyle() ||
          format !== listItemParentNode.getTextFormat()
        ) {
          listItemParentNode.setTextStyle(style).setTextFormat(format);
        }
      }
    }),
  );
  return removeListener;
}

export function registerListStrictIndentTransform(
  editor: LexicalEditor,
): () => void {
  const $formatListIndentStrict = (listItemNode: ListItemNode): void => {
    const listNode = listItemNode.getParent();
    if ($isListNode(listItemNode.getFirstChild()) || !$isListNode(listNode)) {
      return;
    }

    const startingListItemNode = $findMatchingParent(
      listItemNode,
      (node) =>
        $isListItemNode(node) &&
        $isListNode(node.getParent()) &&
        $isListItemNode(node.getPreviousSibling()),
    );

    if (startingListItemNode === null && listItemNode.getIndent() > 0) {
      listItemNode.setIndent(0);
    } else if ($isListItemNode(startingListItemNode)) {
      const prevListItemNode = startingListItemNode.getPreviousSibling();

      if ($isListItemNode(prevListItemNode)) {
        const endListItemNode = $findChildrenEndListItemNode(prevListItemNode);
        const endListNode = endListItemNode.getParent();

        if ($isListNode(endListNode)) {
          const prevDepth = $getListDepth(endListNode);
          const depth = $getListDepth(listNode);

          if (prevDepth + 1 < depth) {
            listItemNode.setIndent(prevDepth);
          }
        }
      }
    }
  };

  const $processListWithStrictIndent = (listNode: ListNode): void => {
    const queue: ListNode[] = [listNode];

    while (queue.length > 0) {
      const node = queue.shift();
      if (!$isListNode(node)) {
        continue;
      }

      for (const child of node.getChildren()) {
        if ($isListItemNode(child)) {
          $formatListIndentStrict(child);

          const firstChild = child.getFirstChild();
          if ($isListNode(firstChild)) {
            queue.push(firstChild);
          }
        }
      }
    }
  };

  return editor.registerNodeTransform(ListNode, $processListWithStrictIndent);
}

function $findChildrenEndListItemNode(
  listItemNode: ListItemNode,
): ListItemNode {
  let current = listItemNode;
  let firstChild = current.getFirstChild();

  while ($isListNode(firstChild)) {
    const lastChild = firstChild.getLastChild();

    if ($isListItemNode(lastChild)) {
      current = lastChild;
      firstChild = current.getFirstChild();
    } else {
      break;
    }
  }

  return current;
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

export interface ListConfig {
  /**
   * When `true`, enforces strict indentation rules for list items, ensuring consistent structure.
   * When `false` (default), indentation is more flexible.
   */
  hasStrictIndent: boolean;
}

/**
 * Configures {@link ListNode}, {@link ListItemNode} and registers
 * the strict indent transform if `hasStrictIndent` is true (default false).
 */
export const ListExtension = defineExtension({
  build(editor, config, state) {
    return namedSignals(config);
  },
  config: safeCast<ListConfig>({hasStrictIndent: false}),
  name: '@lexical/list/List',
  nodes: [ListNode, ListItemNode],
  register(editor, config, state) {
    const stores = state.getOutput();
    return mergeRegister(
      registerList(editor),
      effect(() =>
        stores.hasStrictIndent.value
          ? registerListStrictIndentTransform(editor)
          : undefined,
      ),
    );
  },
});

/**
 * Registers checklist functionality for {@link ListNode} and
 * {@link ListItemNode} with a
 * {@link INSERT_CHECK_LIST_COMMAND} listener and
 * the expected keyboard and mouse interactions for
 * checkboxes.
 */
export const CheckListExtension = defineExtension({
  dependencies: [ListExtension],
  name: '@lexical/list/CheckList',
  register: registerCheckList,
});
