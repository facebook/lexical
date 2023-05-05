/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor, LexicalNode} from 'lexical';

import {$generateHtmlFromNodes, $generateNodesFromDOM} from '@lexical/html';
import {$getRoot, $isElementNode, $setSelection} from 'lexical';
import {$createRangeSelection} from 'lexical/src';
import {
  $createTestDecoratorNode,
  createTestEditor,
} from 'lexical/src/__tests__/utils';

import {$insertNodeToNearestRoot} from '../..';

describe('LexicalUtils#insertNodeToNearestRoot', () => {
  let editor: LexicalEditor;

  const update = async (updateFn) => {
    editor.update(updateFn);
    await Promise.resolve();
  };

  beforeEach(async () => {
    editor = createTestEditor();
    editor._headless = true;
  });

  const testCases: Array<{
    _: string;
    expectedHtml: string;
    initialHtml: string;
    selectionPath: Array<number>;
    selectionOffset: number;
    only?: boolean;
  }> = [
    {
      _: 'insert into paragraph in between two text nodes',
      expectedHtml:
        '<p><span>Hello</span></p><test-decorator></test-decorator><p><span>world</span></p>',
      initialHtml: '<p><span>Helloworld</span></p>',
      selectionOffset: 5, // Selection on text node after "Hello" world
      selectionPath: [0, 0],
    },
    {
      _: 'insert into nested list items',
      expectedHtml:
        '<ul>' +
        '<li><span>Before</span></li>' +
        '<li><ul><li><span>Hello</span></li></ul></li>' +
        '</ul>' +
        '<test-decorator></test-decorator>' +
        '<ul>' +
        '<li><ul><li><span>world</span></li></ul></li>' +
        '<li><span>After</span></li>' +
        '</ul>',
      initialHtml:
        '<ul>' +
        '<li><span>Before</span></li>' +
        '<ul><li><span>Helloworld</span></li></ul>' +
        '<li><span>After</span></li>' +
        '</ul>',
      selectionOffset: 5, // Selection on text node after "Hello" world
      selectionPath: [0, 1, 0, 0, 0],
    },
    {
      _: 'insert into empty paragraph',
      expectedHtml: '<p><br></p><test-decorator></test-decorator><p><br></p>',
      initialHtml: '<p></p>',
      selectionOffset: 0, // Selection on text node after "Hello" world
      selectionPath: [0],
    },
    {
      _: 'insert in the end of paragraph',
      expectedHtml:
        '<p><span>Hello world</span></p>' +
        '<test-decorator></test-decorator>' +
        '<p><br></p>',
      initialHtml: '<p>Hello world</p>',
      selectionOffset: 12, // Selection on text node after "Hello" world
      selectionPath: [0, 0],
    },
    {
      _: 'insert in the beginning of paragraph',
      expectedHtml:
        '<p><br></p>' +
        '<test-decorator></test-decorator>' +
        '<p><span>Hello world</span></p>',
      initialHtml: '<p>Hello world</p>',
      selectionOffset: 0, // Selection on text node after "Hello" world
      selectionPath: [0, 0],
    },
    {
      _: 'insert with selection on root start',
      expectedHtml:
        '<test-decorator></test-decorator>' +
        '<test-decorator></test-decorator>' +
        '<p><span>Before</span></p>' +
        '<p><span>After</span></p>',
      initialHtml:
        '<test-decorator></test-decorator>' +
        '<p><span>Before</span></p>' +
        '<p><span>After</span></p>',
      selectionOffset: 0,
      selectionPath: [],
    },
    {
      _: 'insert with selection on root child',
      expectedHtml:
        '<p><span>Before</span></p>' +
        '<test-decorator></test-decorator>' +
        '<p><span>After</span></p>',
      initialHtml: '<p>Before</p><p>After</p>',
      selectionOffset: 1,
      selectionPath: [],
    },
    {
      _: 'insert with selection on root end',
      expectedHtml:
        '<p><span>Before</span></p>' + '<test-decorator></test-decorator>',
      initialHtml: '<p>Before</p>',
      selectionOffset: 1,
      selectionPath: [],
    },
  ];

  for (const testCase of testCases) {
    it(testCase._, async () => {
      await update(() => {
        // Running init, update, assert in the same update loop
        // to skip text nodes normalization (then separate text
        // nodes will still be separate and represented by its own
        // spans in html output) and make assertions more precise
        const parser = new DOMParser();
        const dom = parser.parseFromString(testCase.initialHtml, 'text/html');
        const nodesToInsert = $generateNodesFromDOM(editor, dom);
        $getRoot()
          .clear()
          .append(...nodesToInsert);

        let selectionNode: LexicalNode = $getRoot();
        for (const index of testCase.selectionPath) {
          if (!$isElementNode(selectionNode)) {
            throw new Error(
              'Expected node to be element (to traverse the tree)',
            );
          }
          selectionNode = selectionNode.getChildAtIndex(index);
        }

        // Calling selectionNode.select() would "normalize" selection and move it
        // to text node (if available), while for the purpose of the test we'd want
        // to use whatever was passed (e.g. keep selection on root node)
        const selection = $createRangeSelection();
        const type = $isElementNode(selectionNode) ? 'element' : 'text';
        selection.anchor.key = selection.focus.key = selectionNode.getKey();
        selection.anchor.offset = selection.focus.offset =
          testCase.selectionOffset;
        selection.anchor.type = selection.focus.type = type;
        $setSelection(selection);

        $insertNodeToNearestRoot($createTestDecoratorNode());

        // Cleaning up list value attributes as it's not really needed in this test
        // and it clutters expected output
        const actualHtml = $generateHtmlFromNodes(editor).replace(
          /\svalue="\d{1,}"/g,
          '',
        );
        expect(actualHtml).toEqual(testCase.expectedHtml);
      });
    });
  }
});
