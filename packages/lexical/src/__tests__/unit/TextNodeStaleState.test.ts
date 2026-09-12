/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {TextNode} from 'lexical';

import {$createParagraphNode, $createTextNode, $getRoot} from 'lexical';
import {describe, expect, test} from 'vitest';

import {initializeUnitTest} from '../utils';

describe('TextNode stale state readers', () => {
  initializeUnitTest(testEnv => {
    test('setTextContent can restore the original text through a stale reference', async () => {
      const {editor} = testEnv;
      let text!: TextNode;

      await editor.update(() => {
        text = $createTextNode('a');
        $getRoot().append($createParagraphNode().append(text));
      });

      await editor.update(() => {
        // setTextContent() goes through getWritable(), which in a later update
        // clones the node. `text` still points at the previous version, so an
        // early return that compares against stale state skips a real change.
        text.setTextContent('b');
        text.setTextContent('a');

        expect(text.getTextContent()).toBe('a');
      });
    });

    test('setMode can restore the original mode through a stale reference', async () => {
      const {editor} = testEnv;
      let text!: TextNode;

      await editor.update(() => {
        text = $createTextNode('a');
        $getRoot().append($createParagraphNode().append(text));
      });

      await editor.update(() => {
        text.setMode('token');
        text.setMode('normal');

        expect(text.getMode()).toBe('normal');
      });
    });

    test('isSimpleText reflects the latest mode', async () => {
      const {editor} = testEnv;
      let text!: TextNode;

      await editor.update(() => {
        text = $createTextNode('a');
        $getRoot().append($createParagraphNode().append(text));
      });

      await editor.update(() => {
        text.setMode('token');

        expect(text.isToken()).toBe(true);
        expect(text.isSimpleText()).toBe(false);
      });
    });
  });
});
