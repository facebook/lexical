/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {ListNode} from 'outline/ListNode';
import {
  ListItemNode,
  createListItemNode,
  isListItemNode,
} from 'outline/ListItemNode';
import {TextNode} from 'outline';
import {initializeUnitTest} from '../utils';

const editorThemeClasses = Object.freeze({
  listitem: 'my-listItem-item-class',
});

describe('OutlineListItemNode tests', () => {
  initializeUnitTest((testEnv) => {
    test('ListItemNode.constructor', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const listItemNode = new ListItemNode();
        expect(listItemNode.getFlags()).toBe(0);
        expect(listItemNode.getType()).toBe('listitem');
        expect(listItemNode.getTextContent()).toBe('');
      });
      expect(() => new ListItemNode()).toThrow();
    });

    test('ListItemNode.clone()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const listItemNode = new ListItemNode();
        const textNode = new TextNode('foo');
        listItemNode.append(textNode);
        const listItemNodeClone = listItemNode.clone();
        expect(listItemNodeClone).not.toBe(listItemNode);
        expect(listItemNode.__type).toEqual(listItemNodeClone.__type);
        expect(listItemNode.__flags).toEqual(listItemNodeClone.__flags);
        expect(listItemNode.__parent).toEqual(listItemNodeClone.__parent);
        expect(listItemNode.__children).toEqual(listItemNodeClone.__children);
        expect(listItemNode.__key).toEqual(listItemNodeClone.__key);
        expect(listItemNode.getTextContent()).toEqual(
          listItemNodeClone.getTextContent(),
        );
      });
    });

    test('ListItemNode.createDOM()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const listItemNode = new ListItemNode();
        expect(listItemNode.createDOM(editorThemeClasses).outerHTML).toBe(
          '<li class="my-listItem-item-class"></li>',
        );
        expect(listItemNode.createDOM({}).outerHTML).toBe('<li></li>');
      });
    });

    test('ListItemNode.updateDOM()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const listItemNode = new ListItemNode('ul');
        const domElement = listItemNode.createDOM(editorThemeClasses);
        expect(domElement.outerHTML).toBe(
          '<li class="my-listItem-item-class"></li>',
        );
        const newListItemNode = new ListItemNode();
        const result = newListItemNode.updateDOM(listItemNode, domElement);
        expect(result).toBe(false);
        expect(domElement.outerHTML).toBe(
          '<li class="my-listItem-item-class"></li>',
        );
      });
    });

    describe('ListItemNode.replace()', () => {
      let listNode;
      let listItemNode1;
      let listItemNode2;
      let listItemNode3;

      beforeEach(async () => {
        const {editor} = testEnv;
        await editor.update((view) => {
          const root = view.getRoot();
          listNode = new ListNode('ul');
          listItemNode1 = new ListItemNode();
          listItemNode1.append(new TextNode('one'));
          listNode.append(listItemNode1);
          listItemNode2 = new ListItemNode();
          listItemNode2.append(new TextNode('two'));
          listNode.append(listItemNode2);
          listItemNode3 = new ListItemNode();
          listItemNode3.append(new TextNode('three'));
          listNode.append(listItemNode3);
          root.append(listNode);
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-outline-editor="true"><ul><li><span>one</span></li><li><span>two</span></li><li><span>three</span></li></ul></div>',
        );
      });

      test('', async () => {
        const {editor} = testEnv;
        let listItemNode;
        await editor.update(() => {
          listNode.remove();
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-outline-editor="true"></div>',
        );
        await editor.update((view) => {
          const root = view.getRoot();
          listItemNode = new ListItemNode();
          root.append(listItemNode);
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-outline-editor="true"><li></li></div>',
        );
        await editor.update(() => {
          const textNode = new TextNode('foo');
          listItemNode.replace(textNode);
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-outline-editor="true"><li></li></div>',
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
          '<div contenteditable="true" data-outline-editor="true"><ul><li><span>bar</span></li><li><span>two</span></li><li><span>three</span></li></ul></div>',
        );
      });

      test('first list item with a non list item node', async () => {
        const {editor} = testEnv;
        await editor.update(() => {});
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-outline-editor="true"><ul><li><span>one</span></li><li><span>two</span></li><li><span>three</span></li></ul></div>',
        );
        await editor.update(() => {
          const textNode = new TextNode('bar');
          listItemNode1.replace(textNode);
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-outline-editor="true"><span>bar</span><ul><li><span>two</span></li><li><span>three</span></li></ul></div>',
        );
      });

      test('last list item with a non list item node', async () => {
        const {editor} = testEnv;
        await editor.update(() => {
          const textNode = new TextNode('bar');
          listItemNode3.replace(textNode);
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-outline-editor="true"><ul><li><span>one</span></li><li><span>two</span></li></ul><span>bar</span></div>',
        );
      });

      test('middle list item with a non list item node', async () => {
        const {editor} = testEnv;
        await editor.update(() => {
          const textNode = new TextNode('bar');
          listItemNode2.replace(textNode);
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-outline-editor="true"><ul><li><span>one</span></li></ul><span>bar</span><ul><li><span>three</span></li></ul></div>',
        );
      });

      test('the only list item with a non list item node', async () => {
        const {editor} = testEnv;
        await editor.update(() => {
          listItemNode2.remove();
          listItemNode3.remove();
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-outline-editor="true"><ul><li><span>one</span></li></ul></div>',
        );
        await editor.update(() => {
          const textNode = new TextNode('bar');
          listItemNode1.replace(textNode);
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-outline-editor="true"><span>bar</span></div>',
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
        await editor.update((view) => {
          const root = view.getRoot();
          listNode = new ListNode('ul');
          listItemNode1 = new ListItemNode();
          listItemNode1.append(new TextNode('one'));
          listNode.append(listItemNode1);
          listItemNode2 = new ListItemNode();
          listItemNode2.append(new TextNode('two'));
          listNode.append(listItemNode2);
          listItemNode3 = new ListItemNode();
          listItemNode3.append(new TextNode('three'));
          listNode.append(listItemNode3);
          root.append(listNode);
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-outline-editor="true"><ul><li><span>one</span></li><li><span>two</span></li><li><span>three</span></li></ul></div>',
        );
      });

      test('first list item', async () => {
        const {editor} = testEnv;
        await editor.update(() => {
          listItemNode1.insertNewAfter();
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-outline-editor="true"><ul><li><span>one</span></li><li></li><li><span>two</span></li><li><span>three</span></li></ul></div>',
        );
      });

      test('last list item', async () => {
        const {editor} = testEnv;
        await editor.update(() => {
          listItemNode3.insertNewAfter();
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-outline-editor="true"><ul><li><span>one</span></li><li><span>two</span></li><li><span>three</span></li><li></li></ul></div>',
        );
      });

      test('middle list item', async () => {
        const {editor} = testEnv;
        await editor.update(() => {
          listItemNode3.insertNewAfter();
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-outline-editor="true"><ul><li><span>one</span></li><li><span>two</span></li><li><span>three</span></li><li></li></ul></div>',
        );
      });

      test('the only list item', async () => {
        const {editor} = testEnv;
        await editor.update(() => {
          listItemNode2.remove();
          listItemNode3.remove();
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-outline-editor="true"><ul><li><span>one</span></li></ul></div>',
        );
        await editor.update(() => {
          listItemNode1.insertNewAfter();
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-outline-editor="true"><ul><li><span>one</span></li><li></li></ul></div>',
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
        await editor.update((view) => {
          const root = view.getRoot();
          listNode = new ListNode('ul');
          listItemNode1 = new ListItemNode();
          listNode.append(listItemNode1);
          listItemNode2 = new ListItemNode();
          listNode.append(listItemNode2);
          listItemNode3 = new ListItemNode();
          listNode.append(listItemNode3);
          root.append(listNode);
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-outline-editor="true"><ul><li></li><li></li><li></li></ul></div>',
        );
      });

      test('first list item', async () => {
        const {editor} = testEnv;
        await editor.update(() => {
          listItemNode1.insertNewAfter();
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-outline-editor="true"><p></p><ul><li></li><li></li></ul></div>',
        );
      });

      test('last list item', async () => {
        const {editor} = testEnv;
        await editor.update(() => {
          listItemNode3.insertNewAfter();
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-outline-editor="true"><ul><li></li><li></li></ul><p></p></div>',
        );
      });

      test('middle list item', async () => {
        const {editor} = testEnv;
        await editor.update(() => {
          listItemNode3.insertNewAfter();
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-outline-editor="true"><ul><li></li><li></li></ul><p></p></div>',
        );
      });

      test('the only list item', async () => {
        const {editor} = testEnv;
        await editor.update(() => {
          listItemNode2.remove();
          listItemNode3.remove();
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-outline-editor="true"><ul><li></li></ul></div>',
        );
        await editor.update(() => {
          listItemNode1.insertNewAfter();
        });
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" data-outline-editor="true"><p></p></div>',
        );
      });
    });

    test('createListItemNode()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const listItemNode = new ListItemNode();
        const createdListItemNode = createListItemNode();
        expect(listItemNode.__type).toEqual(createdListItemNode.__type);
        expect(listItemNode.__flags).toEqual(createdListItemNode.__flags);
        expect(listItemNode.__parent).toEqual(createdListItemNode.__parent);
        expect(listItemNode.__key).not.toEqual(createdListItemNode.__key);
      });
    });

    test('isListItemNode()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const listItemNode = new ListItemNode();
        expect(isListItemNode(listItemNode)).toBe(true);
      });
    });
  });
});
