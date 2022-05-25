/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
} from '@lexical/table';
import {
  $createGridSelection,
  $createNodeSelection,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $setSelection,
} from 'lexical';

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
        __format: 0,
        __indent: 0,
        __key: 'root',
        __parent: null,
        __type: 'root',
      });
      expect(paragraph).toEqual({
        __children: ['2'],
        __dir: 'ltr',
        __format: 0,
        __indent: 0,
        __key: '1',
        __parent: 'root',
        __type: 'paragraph',
      });
      expect(text).toEqual({
        __detail: 0,
        __format: 0,
        __key: '2',
        __mode: 0,
        __parent: '1',
        __style: '',
        __text: 'foo',
        __type: 'text',
      });
    });

    test('toJSON() for range selection', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const paragraph = $createParagraphNode();
        const text = $createTextNode('Hello world');
        text.select(6, 11);
        paragraph.append(text);
        $getRoot().append(paragraph);
      });

      expect(JSON.stringify(editor.getEditorState().toJSON())).toEqual(
        `{"_nodeMap":[["root",{"__children":["1"],"__dir":"ltr","__format":0,"__indent":0,"__key":"root","__parent":null,"__type":"root"}],["1",{"__type":"paragraph","__parent":"root","__key":"1","__children":["2"],"__format":0,"__indent":0,"__dir":"ltr"}],["2",{"__type":"text","__parent":"1","__key":"2","__text":"Hello world","__format":0,"__style":"","__mode":0,"__detail":0}]],"_selection":{"anchor":{"key":"2","offset":6,"type":"text"},"focus":{"key":"2","offset":11,"type":"text"},"type":"range"}}`,
      );
    });

    test('toJSON() for node selection', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const paragraph = $createParagraphNode();
        const text = $createTextNode('Hello world');
        const selection = $createNodeSelection();
        selection.add(text.getKey());
        $setSelection(selection);
        paragraph.append(text);
        $getRoot().append(paragraph);
      });

      expect(JSON.stringify(editor.getEditorState().toJSON())).toEqual(
        '{"_nodeMap":[["root",{"__children":["1"],"__dir":"ltr","__format":0,"__indent":0,"__key":"root","__parent":null,"__type":"root"}],["1",{"__type":"paragraph","__parent":"root","__key":"1","__children":["2"],"__format":0,"__indent":0,"__dir":"ltr"}],["2",{"__type":"text","__parent":"1","__key":"2","__text":"Hello world","__format":0,"__style":"","__mode":0,"__detail":0}]],"_selection":{"nodes":["2"],"type":"node"}}',
      );
    });

    test('toJSON() for grid selection', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const table = $createTableNode();
        const tableRow = $createTableRowNode();
        const tableCell = $createTableCellNode(0);
        const selection = $createGridSelection();
        selection.set(table.getKey(), tableCell.getKey(), tableCell.getKey());
        $setSelection(selection);
        table.append(tableRow);
        tableRow.append(tableCell);
        $getRoot().append(table);
      });

      expect(JSON.stringify(editor.getEditorState().toJSON())).toEqual(
        '{"_nodeMap":[["root",{"__children":["1"],"__dir":null,"__format":0,"__indent":0,"__key":"root","__parent":null,"__type":"root"}],["1",{"__type":"table","__parent":"root","__key":"1","__children":["2"],"__format":0,"__indent":0,"__dir":null}],["2",{"__type":"tablerow","__parent":"1","__key":"2","__children":["3"],"__format":0,"__indent":0,"__dir":null}],["3",{"__type":"tablecell","__parent":"2","__key":"3","__children":[],"__format":0,"__indent":0,"__dir":null,"__colSpan":1,"__headerState":0}]],"_selection":{"anchor":{"key":"3","offset":0,"type":"element"},"focus":{"key":"3","offset":0,"type":"element"},"gridKey":"1","type":"grid"}}',
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
