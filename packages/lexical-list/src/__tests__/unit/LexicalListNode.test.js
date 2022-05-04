/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createListItemNode,
  $createListNode,
  $isListItemNode,
  $isListNode,
  ListItemNode,
  ListNode,
} from '@lexical/list';
import {ParagraphNode, TextNode} from 'lexical';

import {initializeUnitTest} from '../../../../lexical/src/__tests__/utils';

// No idea why we suddenly need to do this, but it fixes the tests
// with latest experimental React version.
global.IS_REACT_ACT_ENVIRONMENT = true;

const editorConfig = Object.freeze({
  theme: {
    list: {
      ol: 'my-ol-list-class',
      olDepth: [
        'my-ol-list-class-1',
        'my-ol-list-class-2',
        'my-ol-list-class-3',
        'my-ol-list-class-4',
        'my-ol-list-class-5',
        'my-ol-list-class-6',
        'my-ol-list-class-7',
      ],
      ul: 'my-ul-list-class',
      ulDepth: [
        'my-ul-list-class-1',
        'my-ul-list-class-2',
        'my-ul-list-class-3',
        'my-ul-list-class-4',
        'my-ul-list-class-5',
        'my-ul-list-class-6',
        'my-ul-list-class-7',
      ],
    },
  },
});

describe('LexicalListNode tests', () => {
  initializeUnitTest((testEnv) => {
    test('ListNode.constructor', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const listNode = $createListNode('ul', 1);
        expect(listNode.getType()).toBe('list');
        expect(listNode.getTag()).toBe('ul');
        expect(listNode.getTextContent()).toBe('');
      });
      expect(() => $createListNode()).toThrow();
    });

    test('ListNode.getTag()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const ulListNode = $createListNode('bullet', 1);
        expect(ulListNode.getTag()).toBe('ul');
        const olListNode = $createListNode('number', 1);
        expect(olListNode.getTag()).toBe('ol');
        const checkListNode = $createListNode('check', 1);
        expect(checkListNode.getTag()).toBe('ul');
      });
    });

    test('ListNode.createDOM()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const listNode = $createListNode('ul', 1);
        expect(listNode.createDOM(editorConfig).outerHTML).toBe(
          '<ul class="my-ul-list-class my-ul-list-class-1"></ul>',
        );
        expect(listNode.createDOM({theme: {list: {}}}).outerHTML).toBe(
          '<ul></ul>',
        );
        expect(listNode.createDOM({theme: {}}).outerHTML).toBe('<ul></ul>');
      });
    });

    test('ListNode.createDOM() correctly applies classes to a nested ListNode', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const listNode1 = $createListNode('ul');
        const listNode2 = $createListNode('ul');
        const listNode3 = $createListNode('ul');
        const listNode4 = $createListNode('ul');
        const listNode5 = $createListNode('ul');
        const listNode6 = $createListNode('ul');
        const listNode7 = $createListNode('ul');
        const listItem1 = $createListItemNode();
        const listItem2 = $createListItemNode();
        const listItem3 = $createListItemNode();
        const listItem4 = $createListItemNode();
        listNode1.append(listItem1);
        listItem1.append(listNode2);
        listNode2.append(listItem2);
        listItem2.append(listNode3);
        listNode3.append(listItem3);
        listItem3.append(listNode4);
        listNode4.append(listItem4);
        listNode4.append(listNode5);
        listNode5.append(listNode6);
        listNode6.append(listNode7);
        expect(listNode1.createDOM(editorConfig).outerHTML).toBe(
          '<ul class="my-ul-list-class my-ul-list-class-1"></ul>',
        );
        expect(listNode1.createDOM({theme: {list: {}}}).outerHTML).toBe(
          '<ul></ul>',
        );
        expect(listNode1.createDOM({theme: {}}).outerHTML).toBe('<ul></ul>');
        expect(listNode2.createDOM(editorConfig).outerHTML).toBe(
          '<ul class="my-ul-list-class my-ul-list-class-2"></ul>',
        );
        expect(listNode3.createDOM(editorConfig).outerHTML).toBe(
          '<ul class="my-ul-list-class my-ul-list-class-3"></ul>',
        );
        expect(listNode4.createDOM(editorConfig).outerHTML).toBe(
          '<ul class="my-ul-list-class my-ul-list-class-4"></ul>',
        );
        expect(listNode5.createDOM(editorConfig).outerHTML).toBe(
          '<ul class="my-ul-list-class my-ul-list-class-5"></ul>',
        );
        expect(listNode6.createDOM(editorConfig).outerHTML).toBe(
          '<ul class="my-ul-list-class my-ul-list-class-6"></ul>',
        );
        expect(listNode7.createDOM(editorConfig).outerHTML).toBe(
          '<ul class="my-ul-list-class my-ul-list-class-7"></ul>',
        );
        expect(
          listNode5.createDOM({
            theme: {
              list: {
                ...editorConfig.theme.list,
                ulDepth: [
                  'my-ul-list-class-1',
                  'my-ul-list-class-2',
                  'my-ul-list-class-3',
                ],
              },
            },
          }).outerHTML,
        ).toBe('<ul class="my-ul-list-class my-ul-list-class-2"></ul>');
      });
    });

    test('ListNode.updateDOM()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const listNode = $createListNode('ul', 1);
        const domElement = listNode.createDOM(editorConfig);
        expect(domElement.outerHTML).toBe(
          '<ul class="my-ul-list-class my-ul-list-class-1"></ul>',
        );
        const newListNode = $createListNode('ol', 1);
        const result = newListNode.updateDOM(
          listNode,
          domElement,
          editorConfig,
        );
        expect(result).toBe(true);
        expect(domElement.outerHTML).toBe(
          '<ul class="my-ul-list-class my-ul-list-class-1"></ul>',
        );
      });
    });

    test('ListNode.canInsertTab()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const listNode = $createListNode();
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
        expect($isListItemNode(listNode.getFirstChild())).toBe(true);
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
        expect($isListItemNode(listNode.getFirstChild())).toBe(true);
        expect(listNode.getFirstChild()?.getTextContent()).toBe('Hello');
      });
    });

    test('$createListNode()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const listNode = $createListNode('ul', 1);
        const createdListNode = $createListNode('ul');
        expect(listNode.__type).toEqual(createdListNode.__type);
        expect(listNode.__parent).toEqual(createdListNode.__parent);
        expect(listNode.__tag).toEqual(createdListNode.__tag);
        expect(listNode.__key).not.toEqual(createdListNode.__key);
      });
    });

    test('$isListNode()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const listNode = $createListNode();
        expect($isListNode(listNode)).toBe(true);
      });
    });

    test('$createListNode() with tag name', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const numberList = $createListNode('ol', 1);
        const bulletList = $createListNode('ul', 1);
        expect(numberList.__listType).toBe('number');
        expect(bulletList.__listType).toBe('bullet');
      });
    });
  });
});
