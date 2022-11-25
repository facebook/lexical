/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createParagraphNode, $createTextNode, $getRoot} from 'lexical';

import {EditorState} from '../../LexicalEditorState';
import {$createRootNode} from '../../nodes/LexicalRootNode';
import {initializeUnitTest} from '../utils';

describe('LexicalEditorState tests', () => {
  initializeUnitTest((testEnv) => {
    test('constructor', async () => {
      const root = $createRootNode();
      const nodeMap = new Map([['root', root]]);

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
        __children: ['1'],
        __dir: 'ltr',
        __first: null,
        __format: 0,
        __indent: 0,
        __key: 'root',
        __last: null,
        __next: null,
        __parent: null,
        __prev: null,
        __size: 0,
        __type: 'root',
      });
      expect(paragraph).toEqual({
        __children: ['2'],
        __dir: 'ltr',
        __first: null,
        __format: 0,
        __indent: 0,
        __key: '1',
        __last: null,
        __next: null,
        __parent: 'root',
        __prev: null,
        __size: 0,
        __type: 'paragraph',
      });
      expect(text).toEqual({
        __detail: 0,
        __format: 0,
        __key: '2',
        __mode: 0,
        __next: null,
        __parent: '1',
        __prev: null,
        __style: '',
        __text: 'foo',
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
        `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Hello world","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
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
              __children: [],
              __dir: null,
              __first: null,
              __format: 0,
              __indent: 0,
              __key: 'root',
              __last: null,
              __next: null,
              __parent: null,
              __prev: null,
              __size: 0,
              __type: 'root',
            },
          ],
        ]),
      );
    });
  });
});
