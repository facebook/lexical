/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

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
});
