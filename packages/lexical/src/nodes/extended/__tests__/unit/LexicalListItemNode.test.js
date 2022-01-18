/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {ListNode} from 'lexical/ListNode';
import {
  ListItemNode,
  $createListItemNode,
  $isListItemNode,
} from 'lexical/ListItemNode';
import {TextNode, $getRoot} from 'lexical';
import {initializeUnitTest} from '../../../../../../lexical/src/__tests__/utils';

const editorConfig = Object.freeze({
  theme: {
    list: {
      listitem: 'my-listItem-item-class',
      nested: {
        listitem: 'my-nested-list-listItem-class',
      },
    },
  },
});

describe('LexicalListItemNode tests', () => {
  initializeUnitTest((testEnv) => {
    test('ListItemNode.constructor', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const listItemNode = new ListItemNode();
        expect(listItemNode.getType()).toBe('listitem');
        expect(listItemNode.getTextContent()).toBe('');
      });
      expect(() => new ListItemNode()).toThrow();
    });

    test('ListItemNode.createDOM()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const listItemNode = new ListItemNode();
        expect(listItemNode.createDOM(editorConfig).outerHTML).toBe(
          '<li value="1" class="my-listItem-item-class"></li>',
        );
        expect(listItemNode.createDOM({theme: {}}).outerHTML).toBe(
          '<li value="1"></li>',
        );
      });
    });

    describe('ListItemNode.updateDOM()', () => {
      test('base', async () => {
        const {editor} = testEnv;
        await editor.update(() => {
          const listItemNode = new ListItemNode();
          const domElement = listItemNode.createDOM(editorConfig);
          expect(domElement.outerHTML).toBe(
            '<li value="1" class="my-listItem-item-class"></li>',
          );
          const newListItemNode = new ListItemNode();
          const result = newListItemNode.updateDOM(
            listItemNode,
            domElement,
            editorConfig,
          );
          expect(result).toBe(false);
          expect(domElement.outerHTML).toBe(
            '<li value="1" class="my-listItem-item-class"></li>',
          );
        });
      });

      test('nested list', async () => {
        const {editor} = testEnv;
        await editor.update(() => {
          const parentListNode = new ListNode('ul', 1);
          const parentlistItemNode = new ListItemNode();
          parentListNode.append(parentlistItemNode);
          const domElement = parentlistItemNode.createDOM(editorConfig);
          expect(domElement.outerHTML).toBe(
            '<li value="1" class="my-listItem-item-class"></li>',
          );
          const nestedListNode = new ListNode('ul', 1);
          nestedListNode.append(new ListItemNode());
          parentlistItemNode.append(nestedListNode);
          const result = parentlistItemNode.updateDOM(
            parentlistItemNode,
            domElement,
            editorConfig,
          );
          expect(result).toBe(false);
          expect(domElement.outerHTML).toBe(
            '<li value="1" class="my-listItem-item-class my-nested-list-listItem-class"></li>',
          );
        });
      });
    });

    describe('ListItemNode.replace()', () => {
      let listNode;
      let listItemNode1;
      let listItemNode2;
      let listItemNode3;

      beforeEach(async () => {
        const {editor} = testEnv;
        await editor.update(() => {
          const root = $getRoot();
          listNode = new ListNode('ul', 1);
          listItemNode1 = new ListItemNode();
          listItemNode1.append(new TextNode('one'));
          listItemNode2 = new ListItemNode();
          listItemNode2.append(new TextNode('two'));
          listItemNode3 = new ListItemNode();
          listItemNode3.append(new TextNode('three'));
          root.append(listNode);
          listNode.append(listItemNode1, listItemNode2, listItemNode3);
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-lexical-editor="true"><ul><li value="1" dir="ltr"><span data-lexical-text="true">one</span></li><li value="2" dir="ltr"><span data-lexical-text="true">two</span></li><li value="3" dir="ltr"><span data-lexical-text="true">three</span></li></ul></div>',
        );
      });

      test('another list item node', async () => {
        const {editor} = testEnv;
        await editor.update(() => {
          const newListItemNode = new ListItemNode();
          newListItemNode.append(new TextNode('bar'));
          listItemNode1.replace(newListItemNode);
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-lexical-editor="true"><ul><li value="1" dir="ltr"><span data-lexical-text="true">bar</span></li><li value="2" dir="ltr"><span data-lexical-text="true">two</span></li><li value="3" dir="ltr"><span data-lexical-text="true">three</span></li></ul></div>',
        );
      });

      test('first list item with a non list item node', async () => {
        const {editor} = testEnv;
        await editor.update(() => {});
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-lexical-editor="true"><ul><li value="1" dir="ltr"><span data-lexical-text="true">one</span></li><li value="2" dir="ltr"><span data-lexical-text="true">two</span></li><li value="3" dir="ltr"><span data-lexical-text="true">three</span></li></ul></div>',
        );
        await editor.update(() => {
          const textNode = new TextNode('bar');
          listItemNode1.replace(textNode);
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-lexical-editor="true"><span data-lexical-text="true">bar</span><ul><li value="1" dir="ltr"><span data-lexical-text="true">two</span></li><li value="3" dir="ltr"><span data-lexical-text="true">three</span></li></ul></div>',
        );
      });

      test('last list item with a non list item node', async () => {
        const {editor} = testEnv;
        await editor.update(() => {
          const textNode = new TextNode('bar');
          listItemNode3.replace(textNode);
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-lexical-editor="true"><ul><li value="1" dir="ltr"><span data-lexical-text="true">one</span></li><li value="2" dir="ltr"><span data-lexical-text="true">two</span></li></ul><span data-lexical-text="true">bar</span></div>',
        );
      });

      test('middle list item with a non list item node', async () => {
        const {editor} = testEnv;
        await editor.update(() => {
          const textNode = new TextNode('bar');
          listItemNode2.replace(textNode);
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-lexical-editor="true"><ul><li value="1" dir="ltr"><span data-lexical-text="true">one</span></li></ul><span data-lexical-text="true">bar</span><ul><li value="1" dir="ltr"><span data-lexical-text="true">three</span></li></ul></div>',
        );
      });

      test('the only list item with a non list item node', async () => {
        const {editor} = testEnv;
        await editor.update(() => {
          listItemNode2.remove();
          listItemNode3.remove();
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-lexical-editor="true"><ul><li value="1" dir="ltr"><span data-lexical-text="true">one</span></li></ul></div>',
        );
        await editor.update(() => {
          const textNode = new TextNode('bar');
          listItemNode1.replace(textNode);
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-lexical-editor="true"><span data-lexical-text="true">bar</span></div>',
        );
      });
    });

    describe('ListItemNode.insertNewAfter(): non-empty list items', () => {
      let listNode;
      let listItemNode1;
      let listItemNode2;
      let listItemNode3;

      beforeEach(async () => {
        const {editor} = testEnv;
        await editor.update(() => {
          const root = $getRoot();
          listNode = new ListNode('ul', 1);
          listItemNode1 = new ListItemNode();
          listItemNode2 = new ListItemNode();
          listItemNode3 = new ListItemNode();
          root.append(listNode);
          listNode.append(listItemNode1, listItemNode2, listItemNode3);
          listItemNode1.append(new TextNode('one'));
          listItemNode2.append(new TextNode('two'));
          listItemNode3.append(new TextNode('three'));
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-lexical-editor="true"><ul><li value="1" dir="ltr"><span data-lexical-text="true">one</span></li><li value="2" dir="ltr"><span data-lexical-text="true">two</span></li><li value="3" dir="ltr"><span data-lexical-text="true">three</span></li></ul></div>',
        );
      });

      test('first list item', async () => {
        const {editor} = testEnv;
        await editor.update(() => {
          listItemNode1.insertNewAfter();
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-lexical-editor="true"><ul><li value="1" dir="ltr"><span data-lexical-text="true">one</span></li><li value="2"><br></li><li value="3" dir="ltr"><span data-lexical-text="true">two</span></li><li value="4" dir="ltr"><span data-lexical-text="true">three</span></li></ul></div>',
        );
      });

      test('last list item', async () => {
        const {editor} = testEnv;
        await editor.update(() => {
          listItemNode3.insertNewAfter();
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-lexical-editor="true"><ul><li value="1" dir="ltr"><span data-lexical-text="true">one</span></li><li value="2" dir="ltr"><span data-lexical-text="true">two</span></li><li value="3" dir="ltr"><span data-lexical-text="true">three</span></li><li value="4"><br></li></ul></div>',
        );
      });

      test('middle list item', async () => {
        const {editor} = testEnv;
        await editor.update(() => {
          listItemNode3.insertNewAfter();
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-lexical-editor="true"><ul><li value="1" dir="ltr"><span data-lexical-text="true">one</span></li><li value="2" dir="ltr"><span data-lexical-text="true">two</span></li><li value="3" dir="ltr"><span data-lexical-text="true">three</span></li><li value="4"><br></li></ul></div>',
        );
      });

      test('the only list item', async () => {
        const {editor} = testEnv;
        await editor.update(() => {
          listItemNode2.remove();
          listItemNode3.remove();
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-lexical-editor="true"><ul><li value="1" dir="ltr"><span data-lexical-text="true">one</span></li></ul></div>',
        );
        await editor.update(() => {
          listItemNode1.insertNewAfter();
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-lexical-editor="true"><ul><li value="1" dir="ltr"><span data-lexical-text="true">one</span></li><li value="2"><br></li></ul></div>',
        );
      });
    });

    describe('ListItemNode.insertNewAfter(): empty list items', () => {
      let listNode;
      let listItemNode1;
      let listItemNode2;
      let listItemNode3;

      beforeEach(async () => {
        const {editor} = testEnv;
        await editor.update(() => {
          const root = $getRoot();
          listNode = new ListNode('ul', 1);
          listItemNode1 = new ListItemNode();
          listItemNode2 = new ListItemNode();
          listItemNode3 = new ListItemNode();
          root.append(listNode);
          listNode.append(listItemNode1, listItemNode2, listItemNode3);
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-lexical-editor="true"><ul><li value="1"><br></li><li value="2"><br></li><li value="3"><br></li></ul></div>',
        );
      });

      test('first list item', async () => {
        const {editor} = testEnv;
        await editor.update(() => {
          listItemNode1.insertNewAfter();
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-lexical-editor="true"><ul><li value="1"><br></li><li value="2"><br></li><li value="3"><br></li><li value="4"><br></li></ul></div>',
        );
      });

      test('last list item', async () => {
        const {editor} = testEnv;
        await editor.update(() => {
          listItemNode3.insertNewAfter();
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-lexical-editor="true"><ul><li value="1"><br></li><li value="2"><br></li></ul><p><br></p></div>',
        );
      });

      test('middle list item', async () => {
        const {editor} = testEnv;
        await editor.update(() => {
          listItemNode3.insertNewAfter();
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-lexical-editor="true"><ul><li value="1"><br></li><li value="2"><br></li></ul><p><br></p></div>',
        );
      });

      test('the only list item', async () => {
        const {editor} = testEnv;
        await editor.update(() => {
          listItemNode2.remove();
          listItemNode3.remove();
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-lexical-editor="true"><ul><li value="1"><br></li></ul></div>',
        );
        await editor.update(() => {
          listItemNode1.insertNewAfter();
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-lexical-editor="true"><p><br></p></div>',
        );
      });
    });

    test('$createListItemNode()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const listItemNode = new ListItemNode();
        const createdListItemNode = $createListItemNode();
        expect(listItemNode.__type).toEqual(createdListItemNode.__type);
        expect(listItemNode.__parent).toEqual(createdListItemNode.__parent);
        expect(listItemNode.__key).not.toEqual(createdListItemNode.__key);
      });
    });

    test('$isListItemNode()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const listItemNode = new ListItemNode();
        expect($isListItemNode(listItemNode)).toBe(true);
      });
    });
  });
});
