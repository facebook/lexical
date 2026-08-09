/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  type EditorThemeClasses,
} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';
import {describe, expect, it} from 'vitest';

import {$createKeywordNode, KeywordNode} from '../../src/nodes/KeywordNode';

const theme: EditorThemeClasses = {
  text: {
    bold: 'theme-bold',
    underline: 'theme-underline',
  },
};

describe('KeywordNode', () => {
  initializeUnitTest(
    testEnv => {
      function $appendKeyword(format: 'bold' | 'underline'): void {
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append(
              $createTextNode('hey '),
              $createKeywordNode('congrats').setFormat(format),
            ),
          );
      }

      function getKeywordDOM(): HTMLElement {
        const dom = testEnv.container.querySelector('.keyword');
        expect(dom).not.toBe(null);
        return dom as HTMLElement;
      }

      it('keeps the theme class of the text format it was created with', async () => {
        const {editor} = testEnv;
        await editor.update(() => $appendKeyword('underline'), {
          discrete: true,
        });

        const dom = getKeywordDOM();
        expect(Array.from(dom.classList).sort()).toEqual([
          'keyword',
          'theme-underline',
        ]);
      });

      it('keeps the theme class across a re-render of the keyword', async () => {
        const {editor} = testEnv;
        await editor.update(() => $appendKeyword('bold'), {discrete: true});
        // Re-create the node so that createDOM() runs again, which is what a
        // paste, an undo/redo across the node, or a reload does.
        await editor.update(() => $appendKeyword('bold'), {discrete: true});

        const dom = getKeywordDOM();
        expect(Array.from(dom.classList).sort()).toEqual([
          'keyword',
          'theme-bold',
        ]);
      });
    },
    {namespace: 'test', nodes: [KeywordNode], theme},
  );
});
