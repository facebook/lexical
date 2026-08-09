/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createParagraphNode, $getRoot, $isTextNode} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';
import {assert, describe, expect, it} from 'vitest';

import {
  $createSpecialTextNode,
  SpecialTextNode,
} from '../../src/nodes/SpecialTextNode';

describe('SpecialTextNode', () => {
  initializeUnitTest(
    testEnv => {
      function $appendSpecialText(text: string): void {
        $getRoot()
          .clear()
          .append($createParagraphNode().append($createSpecialTextNode(text)));
      }

      function $getSpecialText(): SpecialTextNode {
        const node = $getRoot().getLastDescendant();
        assert(
          $isTextNode(node) && node instanceof SpecialTextNode,
          'SpecialTextNode',
        );
        return node;
      }

      function getRenderedText(): string {
        const dom = testEnv.container.querySelector('.PlaygroundSpecialText');
        expect(dom).not.toBe(null);
        return (dom as HTMLElement).textContent ?? '';
      }

      it('re-renders the text when it changes', async () => {
        const {editor} = testEnv;
        await editor.update(() => $appendSpecialText('foo'), {discrete: true});
        expect(getRenderedText()).toBe('foo');

        await editor.update(
          () => void $getSpecialText().setTextContent('bar'),
          {
            discrete: true,
          },
        );
        expect(getRenderedText()).toBe('bar');
      });

      it('renders the text verbatim when it is bracketed', async () => {
        const {editor} = testEnv;
        await editor.update(() => $appendSpecialText('[foo]'), {
          discrete: true,
        });
        expect(getRenderedText()).toBe('[foo]');

        await editor.update(
          () => void $getSpecialText().setTextContent('[bar]'),
          {discrete: true},
        );
        expect(getRenderedText()).toBe('[bar]');
      });
    },
    {
      namespace: 'test',
      nodes: [SpecialTextNode],
      theme: {specialText: 'PlaygroundSpecialText'},
    },
  );
});
