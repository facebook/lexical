/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ElementNode, LexicalEditor} from 'lexical';

import {$generateHtmlFromNodes, $generateNodesFromDOM} from '@lexical/html';
import {$getRoot, $isElementNode} from 'lexical';
import {createTestEditor} from 'lexical/src/__tests__/utils';

import {$splitNode} from '../../index';

describe('LexicalUtils#splitNode', () => {
  let editor: LexicalEditor;

  const update = async (updateFn: () => void) => {
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
    splitPath: Array<number>;
    splitOffset: number;
    only?: boolean;
  }> = [
    {
      _: 'split paragraph in between two text nodes',
      expectedHtml:
        '<p><span style="white-space: pre-wrap;">Hello</span></p><p><span style="white-space: pre-wrap;">world</span></p>',
      initialHtml: '<p><span>Hello</span><span>world</span></p>',
      splitOffset: 1,
      splitPath: [0],
    },
    {
      _: 'split paragraph before the first text node',
      expectedHtml:
        '<p><br></p><p><span style="white-space: pre-wrap;">Hello</span><span style="white-space: pre-wrap;">world</span></p>',
      initialHtml: '<p><span>Hello</span><span>world</span></p>',
      splitOffset: 0,
      splitPath: [0],
    },
    {
      _: 'split paragraph after the last text node',
      expectedHtml:
        '<p><span style="white-space: pre-wrap;">Hello</span><span style="white-space: pre-wrap;">world</span></p><p><br></p>',
      initialHtml: '<p><span>Hello</span><span>world</span></p>',
      splitOffset: 2, // Any offset that is higher than children size
      splitPath: [0],
    },
    {
      _: 'split list items between two text nodes',
      expectedHtml:
        '<ul><li><span style="white-space: pre-wrap;">Hello</span></li></ul>' +
        '<ul><li><span style="white-space: pre-wrap;">world</span></li></ul>',
      initialHtml: '<ul><li><span>Hello</span><span>world</span></li></ul>',
      splitOffset: 1, // Any offset that is higher than children size
      splitPath: [0, 0],
    },
    {
      _: 'split list items before the first text node',
      expectedHtml:
        '<ul><li></li></ul>' +
        '<ul><li><span style="white-space: pre-wrap;">Hello</span><span style="white-space: pre-wrap;">world</span></li></ul>',
      initialHtml: '<ul><li><span>Hello</span><span>world</span></li></ul>',
      splitOffset: 0, // Any offset that is higher than children size
      splitPath: [0, 0],
    },
    {
      _: 'split nested list items',
      expectedHtml:
        '<ul>' +
        '<li><span style="white-space: pre-wrap;">Before</span></li>' +
        '<li><ul><li><span style="white-space: pre-wrap;">Hello</span></li></ul></li>' +
        '</ul>' +
        '<ul>' +
        '<li><ul><li><span style="white-space: pre-wrap;">world</span></li></ul></li>' +
        '<li><span style="white-space: pre-wrap;">After</span></li>' +
        '</ul>',
      initialHtml:
        '<ul>' +
        '<li><span>Before</span></li>' +
        '<ul><li><span>Hello</span><span>world</span></li></ul>' +
        '<li><span>After</span></li>' +
        '</ul>',
      splitOffset: 1, // Any offset that is higher than children size
      splitPath: [0, 1, 0, 0],
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

        let nodeToSplit: ElementNode = $getRoot();
        for (const index of testCase.splitPath) {
          nodeToSplit = nodeToSplit.getChildAtIndex(index)!;
          if (!$isElementNode(nodeToSplit)) {
            throw new Error('Expected node to be element');
          }
        }

        $splitNode(nodeToSplit, testCase.splitOffset);

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

  it('throws when splitting root', async () => {
    await update(() => {
      expect(() => $splitNode($getRoot(), 0)).toThrow();
    });
  });
});
