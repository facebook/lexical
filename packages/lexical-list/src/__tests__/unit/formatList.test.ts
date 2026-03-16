/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {
  $createListItemNode,
  $createListNode,
  $insertList,
  $isListItemNode,
  $isListNode,
  ListItemNode,
  ListNode,
  ListType,
  registerList,
} from '@lexical/list';
import {registerRichText} from '@lexical/rich-text';
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  TableCellNode,
  TableNode,
  TableRowNode,
} from '@lexical/table';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  $nodesOfType,
  $selectAll,
  INSERT_PARAGRAPH_COMMAND,
  LexicalNode,
} from 'lexical';
import {
  $createTestDecoratorNode,
  initializeUnitTest,
} from 'lexical/src/__tests__/utils';
import {describe, expect, test} from 'vitest';

import {$handleIndent, $handleOutdent} from '../../formatList';

class ExtendedTestListNode extends ListNode {
  $config() {
    return this.config('extended-test-list', {extends: ListNode});
  }
}

function $createExtendedTestListNode(listType: ListType): ExtendedTestListNode {
  return new ExtendedTestListNode(listType);
}

function $isExtendedTestListNode(node?: LexicalNode | null) {
  return node instanceof ExtendedTestListNode;
}

class ExtendedTestListItemNode extends ListItemNode {
  $config() {
    return this.config('extended-test-list-item', {extends: ListItemNode});
  }
}

function $createExtendedTestListItemNode(): ExtendedTestListItemNode {
  return new ExtendedTestListItemNode();
}

function $isExtendedTestListItemNode(node?: LexicalNode | null) {
  return node instanceof ExtendedTestListItemNode;
}

const initOptions = {
  nodes: [ExtendedTestListNode, ExtendedTestListItemNode],
};

describe('insertList', () => {
  initializeUnitTest((testEnv) => {
    test('inserting with empty root selection', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        $getRoot().select();
      });

      await editor.update(() => {
        $insertList('number');
      });

      editor.read(() => {
        const root = $getRoot();

        expect(root.getChildrenSize()).toBe(1);

        const firstChild = root.getFirstChildOrThrow();

        expect($isListNode(firstChild)).toBe(true);
      });
    });

    test('inserting in root selection with existing child', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        $getRoot().select();
        $getRoot().append(
          $createParagraphNode().append($createTextNode('hello')),
        );
      });

      await editor.update(() => {
        $insertList('number');
      });

      editor.read(() => {
        const root = $getRoot();

        expect(root.getChildrenSize()).toBe(1);

        const firstChild = root.getFirstChildOrThrow();

        expect($isListNode(firstChild)).toBe(true);
      });
    });

    test('inserting with empty shadow root selection', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const table = $createTableNode();
        const row = $createTableRowNode();
        const cell = $createTableCellNode();
        $getRoot().append(table.append(row.append(cell)));
        cell.select();
      });

      await editor.update(() => {
        $insertList('number');
      });

      editor.read(() => {
        const cell = $getRoot()
          .getFirstChildOrThrow<TableNode>()
          .getFirstChildOrThrow<TableRowNode>()
          .getFirstChildOrThrow<TableCellNode>();

        expect(cell.getChildrenSize()).toBe(1);

        const firstChild = cell.getFirstChildOrThrow();

        expect($isListNode(firstChild)).toBe(true);
      });
    });

    test('formatting empty list items', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        $getRoot().append(
          $createListNode('bullet').append(
            $createListItemNode().append($createTextNode('Level 1')),
            $createListItemNode().append(
              $createListNode('bullet').append($createListItemNode()),
            ),
          ),
        );
      });

      await editor.update(() => {
        $selectAll();
        $insertList('number');
      });

      editor.read(() => {
        const lists = $nodesOfType(ListNode).filter(
          (node) => node.getListType() === 'number',
        );
        expect(lists.length).toBe(2);
      });
    });

    test('preserves element-anchored selection when converting paragraph with linebreak to list', async () => {
      const {editor} = testEnv;

      // Create a paragraph with text followed by a linebreak node and select the paragraph
      await editor.update(() => {
        const paragraph = $createParagraphNode();
        const textNode = $createTextNode('Item 1');
        const lineBreak = $createLineBreakNode();

        paragraph.append(textNode, lineBreak);
        $getRoot().append(paragraph);

        paragraph.select();
      });

      // Convert to list
      await editor.update(() => {
        $insertList('bullet');
      });

      // Verify the list was created and selection is correctly preserved
      editor.read(() => {
        const selection = $getSelection();
        const list = $getRoot().getFirstChildOrThrow();

        expect($isListNode(list)).toBe(true);

        if ($isListNode(list)) {
          const listItem = list.getFirstChildOrThrow();
          expect($isListItemNode(listItem)).toBe(true);

          // Verify selection is valid and anchored to the listItem, not the list
          if ($isRangeSelection(selection)) {
            expect(selection.anchor.key).toBe(listItem.getKey());
            expect(selection.focus.key).toBe(listItem.getKey());
            expect(selection.anchor.offset).toBe(2);
            expect(selection.focus.offset).toBe(2);
            expect(selection.anchor.type).toBe('element');
            expect(selection.focus.type).toBe('element');
          }
        }
      });
    });
  });
});

describe('$handleListInsertParagraph', () => {
  initializeUnitTest((testEnv) => {
    test('exits list when list item is completely empty', async () => {
      const {editor} = testEnv;
      registerList(editor);

      let emptyListItemKey: string;
      await editor.update(() => {
        const listItemWithContent = $createListItemNode();
        const listItemEmpty = $createListItemNode();
        emptyListItemKey = listItemEmpty.getKey();
        const listNode = $createListNode('bullet');
        listItemWithContent.append($createTextNode('item'));
        listNode.append(listItemWithContent, listItemEmpty);
        $getRoot().append(listNode);
        listItemEmpty.select();
        editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND, undefined);
      });

      editor.read(() => {
        const children = $getRoot().getChildren();
        expect(children.length).toBe(2);
        expect($isListNode(children[0])).toBe(true);
        expect($isParagraphNode(children[1])).toBe(true);
        expect((children[0] as ListNode).getChildrenSize()).toBe(1);
        expect($getNodeByKey(emptyListItemKey)).toBeNull();
      });
    });

    test('exits list when list item contains only whitespace', async () => {
      const {editor} = testEnv;
      registerList(editor);

      let whitespaceListItemKey: string;
      await editor.update(() => {
        const listItemWithContent = $createListItemNode();
        const listItemWhitespace = $createListItemNode();
        whitespaceListItemKey = listItemWhitespace.getKey();
        const whitespaceTextNode = $createTextNode(' ');
        const listNode = $createListNode('bullet');
        listItemWithContent.append($createTextNode('item'));
        listItemWhitespace.append(whitespaceTextNode);
        listNode.append(listItemWithContent, listItemWhitespace);
        $getRoot().append(listNode);
        whitespaceTextNode.select();
        editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND, undefined);
      });

      editor.read(() => {
        const children = $getRoot().getChildren();
        expect(children.length).toBe(2);
        expect($isListNode(children[0])).toBe(true);
        expect($isParagraphNode(children[1])).toBe(true);
        expect((children[0] as ListNode).getChildrenSize()).toBe(1);
        expect($getNodeByKey(whitespaceListItemKey)).toBeNull();
      });
    });

    test('extends list when list item contains non-whitespace content', async () => {
      const {editor} = testEnv;
      registerRichText(editor);
      registerList(editor);

      await editor.update(() => {
        const listItem1 = $createListItemNode();
        listItem1.append($createTextNode('item 1'));
        const listItem2 = $createListItemNode();
        const textNode = $createTextNode('item 2');
        listItem2.append(textNode);
        const listNode = $createListNode('bullet');
        listNode.append(listItem1, listItem2);
        $getRoot().append(listNode);
        textNode.selectEnd();
        editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND, undefined);
      });

      editor.read(() => {
        const children = $getRoot().getChildren();
        expect(children.length).toBe(1);
        expect($isListNode(children[0])).toBe(true);
        expect((children[0] as ListNode).getChildrenSize()).toBe(3);
      });
    });

    test('extends list when list item contains a decorator node', async () => {
      const {editor} = testEnv;
      registerRichText(editor);
      registerList(editor);

      await editor.update(() => {
        const listItem1 = $createListItemNode();
        listItem1.append($createTextNode('item 1'));
        const listItem2 = $createListItemNode();
        const decoratorNode = $createTestDecoratorNode();
        listItem2.append(decoratorNode);
        const listNode = $createListNode('bullet');
        listNode.append(listItem1, listItem2);
        $getRoot().append(listNode);
        listItem2.select();
        editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND, undefined);
      });

      editor.read(() => {
        const children = $getRoot().getChildren();
        expect(children.length).toBe(1);
        expect($isListNode(children[0])).toBe(true);
        expect((children[0] as ListNode).getChildrenSize()).toBe(3);
      });
    });

    test('splits list when the empty element is not the last one', async () => {
      const {editor} = testEnv;
      registerList(editor);

      let emptyListItemKey: string;
      await editor.update(() => {
        const firstListItemWithContent = $createExtendedTestListItemNode();
        const secondListItemWithContent = $createExtendedTestListItemNode();
        const listItemEmpty = $createExtendedTestListItemNode();
        emptyListItemKey = listItemEmpty.getKey();
        const listNode = $createExtendedTestListNode('bullet');
        firstListItemWithContent.append($createTextNode('item1'));
        secondListItemWithContent.append($createTextNode('item2'));
        listNode.append(
          firstListItemWithContent,
          listItemEmpty,
          secondListItemWithContent,
        );
        $getRoot().append(listNode);
        listItemEmpty.select();
        editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND, undefined);
      });

      editor.read(() => {
        const children = $getRoot().getChildren();
        const firstList = children[0] as ExtendedTestListNode;
        const secondList = children[2] as ExtendedTestListNode;

        expect(children.length).toBe(3);
        expect($isListNode(children[0])).toBe(true);
        expect($isParagraphNode(children[1])).toBe(true);
        expect($isListNode(children[2])).toBe(true);
        expect(firstList.getChildrenSize()).toBe(1);
        expect(secondList.getChildrenSize()).toBe(1);
        expect($getNodeByKey(emptyListItemKey)).toBeNull();
        // check that the new list is of the same type
        expect(secondList).toBeInstanceOf(firstList.constructor);
        expect(firstList.getListType()).toBe(secondList.getListType());
      });
    });
  }, initOptions);
});

describe('$handleIndent', () => {
  initializeUnitTest(
    (testEnv) => {
      test('creates a new nested sublist', async () => {
        const {editor} = testEnv;

        await editor.update(() => {
          const root = $getRoot();
          const listNode = $createExtendedTestListNode('bullet');
          const listItem1 = $createExtendedTestListItemNode();
          const listItem2 = $createExtendedTestListItemNode();

          listNode.append(listItem1, listItem2);
          root.append(listNode);

          $handleIndent(listItem2);

          // new item keeps the same type
          const newListItem2 =
            listNode.getChildren()[1] as ExtendedTestListItemNode;
          expect($isExtendedTestListItemNode(newListItem2)).toBe(true);
          expect(newListItem2.getChildren().length).toBe(1);

          // nested list contains the original list item
          const nestedList =
            newListItem2.getChildren()[0] as ExtendedTestListNode;
          expect($isExtendedTestListNode(nestedList)).toBe(true);
          expect(nestedList.getChildren().length).toBe(1);
          expect(nestedList.getChildren()[0].is(listItem2)).toBe(true);
        });
      });
    },
    {nodes: [ExtendedTestListNode, ExtendedTestListItemNode]},
  );
});

describe('$handleOutdent', () => {
  initializeUnitTest((testEnv) => {
    test('removes the nested list and replaces list item', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const root = $getRoot();
        const listNode = $createExtendedTestListNode('bullet');
        const listItem1 = $createExtendedTestListItemNode();
        const listItem2 = $createExtendedTestListItemNode();
        const indentedListItem = $createExtendedTestListItemNode();

        listNode.append(
          listItem1,
          listItem2.append(
            $createExtendedTestListNode('bullet').append(indentedListItem),
          ),
        );
        root.append(listNode);

        $handleOutdent(indentedListItem);

        const children = listNode.getChildren();
        // item is outdented and doesn't have nested list
        expect(children.length).toBe(2);
        expect(children[1].is(indentedListItem)).toBe(true);
        expect(indentedListItem.getChildren().length).toBe(0);
      });
    });
  }, initOptions);
});
