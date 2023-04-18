/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createLinkNode} from '@lexical/link';
import {$createParagraphNode, $createTextNode, $getRoot} from 'lexical';

import {initializeUnitTest} from '../utils';

describe('LexicalSelection tests', () => {
  initializeUnitTest((testEnv) => {
    test('Can insert text after an inline element, using insertText', async () => {
      const {editor, container} = testEnv;

      if (!container) {
        throw new Error('Expected container to be truthy');
      }

      await editor.update(() => {
        const root = $getRoot();
        if (root.getFirstChild() !== null) {
          throw new Error('Expected root to be childless');
        }

        // Set up a paragraph holding a link side-by-side with a text node
        root.append(
          $createParagraphNode().append(
            $createLinkNode('https://', {}).append($createTextNode('a')),
            $createTextNode('b'),
          ),
        );
      });

      expect(container.innerHTML).toBe(
        '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><a href="https://" dir="ltr"><span data-lexical-text="true">a</span></a><span data-lexical-text="true">b</span></p></div>',
      );

      await editor.update(() => {
        const paragraph = $getRoot().getFirstChildOrThrow();
        const textNode = paragraph.getLastChildOrThrow();

        // Place the cursor between the link and the text node by selecting the
        // start of the text node
        const selection = textNode.select(0, 0);

        // Insert text (mirroring what LexicalClipboard does when pasting inline
        // plain text)
        selection.insertText('x');
      });

      expect(container.innerHTML).toBe(
        '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><a href="https://" dir="ltr"><span data-lexical-text="true">a</span></a><span data-lexical-text="true">xb</span></p></div>',
      );
    });

    // Fails: https://github.com/facebook/lexical/issues/4295
    test('Can insert text after an inline element, using insertNodes', async () => {
      const {editor, container} = testEnv;

      if (!container) {
        throw new Error('Expected container to be truthy');
      }

      await editor.update(() => {
        const root = $getRoot();
        if (root.getFirstChild() !== null) {
          throw new Error('Expected root to be childless');
        }

        // Set up a paragraph holding a link side-by-side with a text node
        root.append(
          $createParagraphNode().append(
            $createLinkNode('https://', {}).append($createTextNode('a')),
            $createTextNode('b'),
          ),
        );
      });

      expect(container.innerHTML).toBe(
        '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><a href="https://" dir="ltr"><span data-lexical-text="true">a</span></a><span data-lexical-text="true">b</span></p></div>',
      );

      await editor.update(() => {
        const paragraph = $getRoot().getFirstChildOrThrow();
        const textNode = paragraph.getLastChildOrThrow();

        // Place the cursor between the link and the text node by selecting the
        // start of the text node
        const selection = textNode.select(0, 0);

        // Insert a paragraph bearing a single text node (mirroring what
        // LexicalClipboard does when pasting inline rich text)
        selection.insertNodes([
          $createParagraphNode().append($createTextNode('x')),
        ]);
      });

      // Expected: As with the equivalent 'using insertText' test above, the 'x'
      // should be inserted after the link.
      //
      // Observed: the whole line becomes inserted into the link.
      expect(container.innerHTML).toBe(
        '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><a href="https://" dir="ltr"><span data-lexical-text="true">a</span></a><span data-lexical-text="true">xb</span></p></div>',
      );
    });
  });
});
