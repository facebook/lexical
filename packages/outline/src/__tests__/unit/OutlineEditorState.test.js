/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {createRootNode, createTextNode} from 'outline';
import {createParagraphNode} from 'outline/ParagraphNode';
import {EditorState} from '../../core/OutlineEditorState';
import {initializeUnitTest} from '../utils';

describe('OutlineEditorState tests', () => {
  initializeUnitTest((testEnv) => {
    test('constructor', async () => {
      const root = createRootNode();
      const nodeMap = {root};
      const editorState = new EditorState(nodeMap);
      expect(editorState._nodeMap).toBe(nodeMap);
      expect(editorState._selection).toBe(null);
    });

    test('read()', async () => {
      const {editor} = testEnv;

      await editor.update((view) => {
        const paragraph = createParagraphNode();
        const text = createTextNode('foo');
        paragraph.append(text);
        view.getRoot().append(paragraph);
      });

      let root = null;
      let paragraph = null;
      let text = null;
      editor.getEditorState().read((view) => {
        root = view.getRoot();
        paragraph = root.getFirstChild();
        text = paragraph.getFirstChild();
      });

      expect(root).toEqual({
        __cachedText: 'foo',
        __children: ['0'],
        __flags: 0,
        __key: 'root',
        __parent: null,
        __type: 'root',
      });
      expect(paragraph).toEqual({
        __children: ['1'],
        __flags: 0,
        __key: '0',
        __parent: 'root',
        __type: 'paragraph',
      });
      expect(text).toEqual({
        __text: 'foo',
        __format: 0,
        __flags: 0,
        __key: '1',
        __parent: '0',
        __style: '',
        __type: 'text',
      });
    });

    test('stringify()', async () => {
      const {editor} = testEnv;
      await editor.update((view) => {
        const paragraph = createParagraphNode();
        const text = createTextNode('Hello world');
        text.select(6, 11);
        paragraph.append(text);
        view.getRoot().append(paragraph);
      });
      expect(editor.getEditorState().stringify()).toEqual(
        `{\"_nodeMap\":[[\"root\",{\"__type\":\"root\",\"__flags\":0,\"__key\":\"root\",\"__parent\":null,\"__children\":[\"0\"],\"__cachedText\":\"Hello world\"}],[\"0\",{\"__type\":\"paragraph\",\"__flags\":0,\"__key\":\"0\",\"__parent\":\"root\",\"__children\":[\"1\"]}],[\"1\",{\"__type\":\"text\",\"__flags\":0,\"__key\":\"1\",\"__parent\":\"0\",\"__text\":\"Hello world\",\"__format\":0,\"__style\":\"\"}]],\"_selection\":{\"anchor\":{\"key\":\"1\",\"offset\":6,\"type\":\"text\"},\"focus\":{\"key\":\"1\",\"offset\":11,\"type\":\"text\"}}}`,
      );
      expect(editor.getEditorState().stringify(2)).toEqual(
        `{
  "_nodeMap": [
    [
      "root",
      {
        "__type": "root",
        "__flags": 0,
        "__key": "root",
        "__parent": null,
        "__children": [
          "0"
        ],
        "__cachedText": "Hello world"
      }
    ],
    [
      "0",
      {
        "__type": "paragraph",
        "__flags": 0,
        "__key": "0",
        "__parent": "root",
        "__children": [
          "1"
        ]
      }
    ],
    [
      "1",
      {
        "__type": "text",
        "__flags": 0,
        "__key": "1",
        "__parent": "0",
        "__text": "Hello world",
        "__format": 0,
        "__style": ""
      }
    ]
  ],
  "_selection": {
    "anchor": {
      "key": "1",
      "offset": 6,
      "type": "text"
    },
    "focus": {
      "key": "1",
      "offset": 11,
      "type": "text"
    }
  }
}`,
      );
    });

    test('ensure garbage collection works as expected', async () => {
      const {editor} = testEnv;
      await editor.update((view) => {
        const paragraph = createParagraphNode();
        const text = createTextNode('foo');
        paragraph.append(text);
        view.getRoot().append(paragraph);
      });

      // Remove the first node, which should cause a GC for everything
      await editor.update((view) => {
        view.getRoot().getFirstChild().remove();
      });

      expect(editor.getEditorState()._nodeMap).toEqual(
        new Map([
          [
            'root',
            {
              __cachedText: '',
              __children: [],
              __flags: 0,
              __key: 'root',
              __parent: null,
              __type: 'root',
            },
          ],
        ]),
      );
    });
  });
});
