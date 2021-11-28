/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {createListNode, isListNode} from 'outline/ListNode';
import {initializeUnitTest} from '../utils';
import {isListItemNode, ListItemNode} from 'outline/ListItemNode';
import {TextNode} from 'outline';
import {ParagraphNode} from '../../extensions/OutlineParagraphNode';
import {ListNode} from '../../extensions/OutlineListNode';

const editorConfig = Object.freeze({
  theme: {
    list: {
      ul: 'my-ul-list-class',
      ol: 'my-ol-list-class',
    },
  },
});

describe('OutlineListNode tests', () => {
  initializeUnitTest((testEnv) => {
    test('ListNode.constructor', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const listNode = createListNode('ul', 1);
        expect(listNode.getFlags()).toBe(0);
        expect(listNode.getType()).toBe('list');
        expect(listNode.getTag()).toBe('ul');
        expect(listNode.getTextContent()).toBe('');
      });
      expect(() => createListNode()).toThrow();
    });

    test('ListNode.getTag()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const ulListNode = createListNode('ul', 1);
        expect(ulListNode.getTag()).toBe('ul');
        const olListNode = createListNode('ol', 1);
        expect(olListNode.getTag()).toBe('ol');
      });
    });

    test('ListNode.createDOM()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const listNode = createListNode('ul', 1);
        expect(listNode.createDOM(editorConfig).outerHTML).toBe(
          '<ul class="my-ul-list-class"></ul>',
        );
        expect(listNode.createDOM({theme: {list: {}}}).outerHTML).toBe(
          '<ul></ul>',
        );
        expect(listNode.createDOM({theme: {}}).outerHTML).toBe('<ul></ul>');
      });
    });

    test('ListNode.updateDOM()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const listNode = createListNode('ul', 1);
        const domElement = listNode.createDOM(editorConfig);
        expect(domElement.outerHTML).toBe('<ul class="my-ul-list-class"></ul>');
        const newListNode = new ListNode();
        const result = newListNode.updateDOM(
          listNode,
          domElement,
          editorConfig,
        );
        expect(result).toBe(false);
        expect(domElement.outerHTML).toBe('<ul class="my-ul-list-class"></ul>');
      });
    });

    test('ListNode.canInsertTab()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const listNode = createListNode();
        expect(listNode.canInsertTab()).toBe(false);
      });
    });

    test('ListNode.append() should properly transform a ListItemNode', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const listNode = new ListNode();
        const listItemNode = new ListItemNode();
        const textNode = new TextNode('Hello');
        listItemNode.append(textNode);
        const nodesToAppend = [listItemNode];
        expect(listNode.append(...nodesToAppend)).toBe(listNode);
        expect(listNode.getFirstChild()).toBe(listItemNode);
        expect(listNode.getFirstChild()?.getTextContent()).toBe('Hello');
      });
    });

    test('ListNode.append() should properly transform a ListNode', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const listNode = new ListNode();
        const nestedListNode = new ListNode();
        const listItemNode = new ListItemNode();
        const textNode = new TextNode('Hello');
        listItemNode.append(textNode);
        nestedListNode.append(listItemNode);
        const nodesToAppend = [nestedListNode];
        expect(listNode.append(...nodesToAppend)).toBe(listNode);
        expect(isListItemNode(listNode.getFirstChild())).toBe(true);
        expect(listNode.getFirstChild().getFirstChild()).toBe(nestedListNode);
      });
    });

    test('ListNode.append() should properly transform a ParagraphNode', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const listNode = new ListNode();
        const paragraph = new ParagraphNode();
        const textNode = new TextNode('Hello');
        paragraph.append(textNode);
        const nodesToAppend = [paragraph];
        expect(listNode.append(...nodesToAppend)).toBe(listNode);
        expect(isListItemNode(listNode.getFirstChild())).toBe(true);
        expect(listNode.getFirstChild()?.getTextContent()).toBe('Hello');
      });
    });

    test('createListNode()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const listNode = createListNode('ul', 1);
        const createdListNode = createListNode('ul');
        expect(listNode.__type).toEqual(createdListNode.__type);
        expect(listNode.__flags).toEqual(createdListNode.__flags);
        expect(listNode.__parent).toEqual(createdListNode.__parent);
        expect(listNode.__tag).toEqual(createdListNode.__tag);
        expect(listNode.__key).not.toEqual(createdListNode.__key);
      });
    });

    test('isListNode()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const listNode = createListNode();
        expect(isListNode(listNode)).toBe(true);
      });
    });
  });
});
