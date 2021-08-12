/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {getCommonAncestorFromNodeList} from '../../OutlineSelectionHelpers';
import {createListItemNode} from '../../../extensions/OutlineListItemNode';
import {createListNode} from '../../../extensions/OutlineListNode';
import {createEditor, createTextNode, TextNode} from 'outline';
import {createParagraphNode} from 'outline/ParagraphNode';
import {insertText} from 'outline/SelectionHelpers';

function createParagraphWithNodes(editor, nodes) {
  const paragraph = createParagraphNode();
  const nodeMap = editor._pendingViewModel._nodeMap;
  for (let i = 0; i < nodes.length; i++) {
    const key = nodes[i];
    const textNode = new TextNode(key, key);
    nodeMap.set(key, textNode);
    textNode.toggleUnmergeable();
    paragraph.append(textNode);
  }
  return paragraph;
}

function setAnchorPoint(view, point) {
  let selection = view.getSelection();
  if (selection === null) {
    const dummyTextNode = createTextNode();
    dummyTextNode.select();
    selection = view.getSelection();
  }
  const anchor = selection.anchor;
  anchor.type = point.type;
  anchor.offset = point.offset;
  anchor.key = point.key;
}

function setFocusPoint(view, point) {
  let selection = view.getSelection();
  if (selection === null) {
    const dummyTextNode = createTextNode();
    dummyTextNode.select();
    selection = view.getSelection();
  }
  const focus = selection.focus;
  focus.type = point.type;
  focus.offset = point.offset;
  focus.key = point.key;
}

/* root
 *   |- ul
 *       |- li
 *           |- text ('hello')
 *       |- li
 *           |- ul
 *              |- li
 *                  |- text ('hi')
 */
function createNestedList(editor): ListNode {
  const topLevelList = createListNode('ul');
  const topLevelListItem = createListItemNode();
  const topLevelListItemTwo = createListItemNode();
  const topLevelListItemText = new TextNode('hello', 'hello');
  const secondLevelList = createListNode('ul');
  const secondLevelListItem = createListItemNode();
  const secondLevelListItemText = new TextNode('hi', 'hi');
  editor._pendingViewModel?._nodeMap.set('hello', topLevelListItemText);
  editor._pendingViewModel?._nodeMap.set('hi', secondLevelListItemText);
  topLevelList.append(topLevelListItem);
  topLevelList.append(topLevelListItemTwo);
  topLevelListItem.append(topLevelListItemText);
  secondLevelList.append(secondLevelListItem);
  secondLevelListItem.append(secondLevelListItemText);
  topLevelListItemTwo.append(secondLevelList);
  return {
    topLevelList,
    topLevelListItem,
    topLevelListItemTwo,
    topLevelListItemText,
    secondLevelList,
    secondLevelListItem,
    secondLevelListItemText,
  };
}

describe('OutlineSelectionHelpers tests', () => {
  describe('Collapsed', () => {
    test('Can handle a character point', () => {
      const editor = createEditor({});

      editor.addListener('error', (error) => {
        throw error;
      });

      editor.update((view) => {
        const root = view.getRoot();
        const block = createParagraphWithNodes(editor, ['a', 'b', 'c']);
        root.append(block);
        setAnchorPoint(view, {
          type: 'character',
          offset: 0,
          key: 'a',
        });
        setFocusPoint(view, {
          type: 'character',
          offset: 0,
          key: 'a',
        });

        const selection = view.getSelection();

        // getNodes
        selection.anchor.getNode();
        expect(selection.getNodes()).toEqual([
          {
            __flags: 16,
            __format: 0,
            __key: 'a',
            __parent: '0',
            __type: 'text',
            __text: 'a',
          },
        ]);

        // insertText
        insertText(selection, 'Test');
        expect(view.getNodeByKey('a').getTextContent()).toBe('Testa');
        expect(selection.anchor).toEqual({
          type: 'character',
          offset: 4,
          key: 'a',
        });
        expect(selection.focus).toEqual({
          type: 'character',
          offset: 4,
          key: 'a',
        });
      });
    });
  });

  describe('getCommonAncestorFromNodeList', () => {
    test('Returns the correct common ancestor when selecting across levels', () => {
      const editor = createEditor({});

      editor.addListener('error', (error) => {
        throw error;
      });

      editor.update((view) => {
        const root = view.getRoot();
        const {topLevelList} = createNestedList(editor);
        root.append(topLevelList);
        setAnchorPoint(view, {
          type: 'character',
          offset: 0,
          key: 'hello',
        });
        setFocusPoint(view, {
          type: 'character',
          offset: 2,
          key: 'hi',
        });
        const nodes = view.getSelection()?.getNodes();
        const result = getCommonAncestorFromNodeList(nodes);
        expect(result).toBe(topLevelList);
      });
    });

    test('Returns the correct common ancestor when selecting a single node', () => {
      const editor = createEditor({});

      editor.addListener('error', (error) => {
        throw error;
      });

      editor.update((view) => {
        const root = view.getRoot();
        const {topLevelList, topLevelListItem} = createNestedList(editor);
        root.append(topLevelList);
        setAnchorPoint(view, {
          type: 'character',
          offset: 0,
          key: 'hello',
        });
        setFocusPoint(view, {
          type: 'character',
          offset: 5,
          key: 'hello',
        });
        const nodes = view.getSelection()?.getNodes();
        const result = getCommonAncestorFromNodeList(nodes);
        expect(result).toBe(topLevelListItem);
      });
    });
  });
});
