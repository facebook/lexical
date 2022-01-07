/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createTextNode, $getRoot} from '@lexical/core';
import {$createParagraphNode} from '@lexical/core/ParagraphNode';
import {EditorState} from '../../LexicalEditorState';
import {initializeUnitTest} from '../utils';
import {$createRootNode} from '../../nodes/base/LexicalRootNode';

describe('LexicalEditorState tests', () => {
  initializeUnitTest((testEnv) => {
    test('constructor', async () => {
      const root = $createRootNode();
      const nodeMap = {root};
      const editorState = new EditorState(nodeMap);
      expect(editorState._nodeMap).toBe(nodeMap);
      expect(editorState._selection).toBe(null);
    });

    test('read()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const paragraph = $createParagraphNode();
        const text = $createTextNode('foo');
        paragraph.append(text);
        $getRoot().append(paragraph);
      });

      let root = null;
      let paragraph = null;
      let text = null;
      editor.getEditorState().read(() => {
        root = $getRoot();
        paragraph = root.getFirstChild();
        text = paragraph.getFirstChild();
      });

      expect(root).toEqual({
        __cachedText: 'foo',
        __format: 0,
        __indent: 0,
        __children: ['1'],
        __dir: 'ltr',
        __key: 'root',
        __parent: null,
        __type: 'root',
      });
      expect(paragraph).toEqual({
        __children: ['2'],
        __format: 0,
        __indent: 0,
        __dir: 'ltr',
        __key: '1',
        __parent: 'root',
        __type: 'paragraph',
      });
      expect(text).toEqual({
        __detail: 0,
        __mode: 0,
        __text: 'foo',
        __format: 0,
        __key: '2',
        __parent: '1',
        __style: '',
        __type: 'text',
      });
    });

    test('toJSON()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const paragraph = $createParagraphNode();
        const text = $createTextNode('Hello world');
        text.select(6, 11);
        paragraph.append(text);
        $getRoot().append(paragraph);
      });
      expect(JSON.stringify(editor.getEditorState().toJSON())).toEqual(
        `{\"_nodeMap\":[[\"root\",{\"__type\":\"root\",\"__key\":\"root\",\"__parent\":null,\"__children\":[\"1\"],\"__format\":0,\"__indent\":0,\"__dir\":\"ltr\",\"__cachedText\":\"Hello world\"}],[\"1\",{\"__type\":\"paragraph\",\"__key\":\"1\",\"__parent\":\"root\",\"__children\":[\"2\"],\"__format\":0,\"__indent\":0,\"__dir\":\"ltr\"}],[\"2\",{\"__type\":\"text\",\"__key\":\"2\",\"__parent\":\"1\",\"__text\":\"Hello world\",\"__format\":0,\"__style\":\"\",\"__mode\":0,\"__detail\":0}]],\"_selection\":{\"anchor\":{\"key\":\"2\",\"offset\":6,\"type\":\"text\"},\"focus\":{\"key\":\"2\",\"offset\":11,\"type\":\"text\"}}}`,
      );
    });

    test('ensure garbage collection works as expected', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const paragraph = $createParagraphNode();
        const text = $createTextNode('foo');
        paragraph.append(text);
        $getRoot().append(paragraph);
      });

      // Remove the first node, which should cause a GC for everything
      await editor.update(() => {
        $getRoot().getFirstChild().remove();
      });

      expect(editor.getEditorState()._nodeMap).toEqual(
        new Map([
          [
            'root',
            {
              __cachedText: '',
              __dir: null,
              __children: [],
              __format: 0,
              __indent: 0,
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
