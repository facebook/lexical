/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {ListNode, createListNode, isListNode} from 'outline/ListNode';
import {TextNode} from 'outline';
import {initializeUnitTest} from '../utils';

const editorThemeClasses = Object.freeze({
  list: {
    ul: 'my-ul-list-class',
    ol: 'my-ol-list-class',
  },
});

describe('OutlineListNode tests', () => {
  initializeUnitTest((testEnv) => {
    test('ListNode.constructor', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const listNode = new ListNode('ul');
        expect(listNode.getFlags()).toBe(0);
        expect(listNode.getType()).toBe('list');
        expect(listNode.getTag()).toBe('ul');
        expect(listNode.getTextContent()).toBe('');
      });
      expect(() => new ListNode()).toThrow();
    });

    test('ListNode.clone()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const listNode = new ListNode();
        const textNode = new TextNode('foo');
        listNode.append(textNode);
        const listNodeClone = listNode.clone();
        expect(listNodeClone).not.toBe(listNode);
        expect(listNode.__type).toEqual(listNodeClone.__type);
        expect(listNode.__flags).toEqual(listNodeClone.__flags);
        expect(listNode.__parent).toEqual(listNodeClone.__parent);
        expect(listNode.__children).toEqual(listNodeClone.__children);
        expect(listNode.__key).toEqual(listNodeClone.__key);
        expect(listNode.getTextContent()).toEqual(
          listNodeClone.getTextContent(),
        );
      });
    });

    test('ListNode.getTag()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const ulListNode = new ListNode('ul');
        expect(ulListNode.getTag()).toBe('ul');
        const olListNode = new ListNode('ol');
        expect(olListNode.getTag()).toBe('ol');
      });
    });

    test('ListNode.createDOM()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const listNode = new ListNode('ul');
        expect(listNode.createDOM(editorThemeClasses).outerHTML).toBe(
          '<ul class="my-ul-list-class"></ul>',
        );
        expect(listNode.createDOM({list: {}}).outerHTML).toBe('<ul></ul>');
        expect(listNode.createDOM({}).outerHTML).toBe('<ul></ul>');
      });
    });

    test('ListNode.updateDOM()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const listNode = new ListNode('ul');
        const domElement = listNode.createDOM(editorThemeClasses);
        expect(domElement.outerHTML).toBe('<ul class="my-ul-list-class"></ul>');
        const newListNode = new ListNode();
        const result = newListNode.updateDOM(listNode, domElement);
        expect(result).toBe(false);
        expect(domElement.outerHTML).toBe('<ul class="my-ul-list-class"></ul>');
      });
    });

    test('ListNode.canInsertTab()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const listNode = new ListNode();
        expect(listNode.canInsertTab()).toBe(false);
      });
    });

    test('createListNode()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const listNode = new ListNode('ul');
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
        const listNode = new ListNode();
        expect(isListNode(listNode)).toBe(true);
      });
    });
  });
});
