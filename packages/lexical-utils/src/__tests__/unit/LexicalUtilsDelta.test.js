/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$insertGeneratedNodes} from '@lexical/clipboard';
import {CodeNode} from '@lexical/code';
import {createHeadlessEditor} from '@lexical/headless';
import {$generateNodesFromDOM} from '@lexical/html';
import {ListItemNode, ListNode} from '@lexical/list';
import {HeadingNode} from '@lexical/rich-text';
import {TableCellNode, TableNode, TableRowNode} from '@lexical/table';
import {$createRangeSelection, LexicalEditor} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';

import testMany from '../../../../lexical/src/__tests__/utils/testMany';
import {$applyDelta} from '../../delta';

async function updateFromHTML(editor: LexicalEditor, html: string) {
  const parser = new DOMParser();
  const dom = parser.parseFromString(html, 'text/html');
  await editor.update(() => {
    const nodes = $generateNodesFromDOM(editor, dom);
    $insertGeneratedNodes(editor, nodes, $createRangeSelection());
  });
}

describe('LexicalUtilsDelta tests', () => {
  initializeUnitTest((testEnv) => {
    testMany(
      [
        {
          a: '<p>1</p>',
          b: '<p>1</p>',
          expectedDirtyElements: 0,
        },
        {
          a: '<p>1</p><p>2</p>',
          b: '<p>1</p><p>2</p><p>3</p>',
          expectedDirtyElements: 3,
        },
        {
          a: '<p>1</p><p>2</p>',
          b: '<p>1</p><p>3</p>',
          expectedDirtyElements: 4,
        },
        {
          a: '<p>1</p><p>2</p>',
          b: '<p>1</p>',
          expectedDirtyElements: 3,
        },
      ],
      async ({a, b, expectedDirtyElements}) => {
        const {editor} = testEnv;
        const tempEditor = createHeadlessEditor([
          HeadingNode,
          ListNode,
          ListItemNode,
          TableNode,
          TableRowNode,
          TableCellNode,
          CodeNode,
        ]);
        await updateFromHTML(editor, a);
        await updateFromHTML(tempEditor, b);
        let dirtyElementsCount = 0;
        editor.registerUpdateListener(({dirtyElements}) => {
          dirtyElementsCount = dirtyElements.size;
        });
        await editor.update(() => {
          $applyDelta(tempEditor.getEditorState().toJSON());
        });
        expect(editor.toJSON()).toEqual(tempEditor.toJSON());
        expect(dirtyElementsCount).toBe(expectedDirtyElements);
      },
    );
  });
});
