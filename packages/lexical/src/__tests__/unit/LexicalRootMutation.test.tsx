/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createParagraphNode, $getRoot} from 'lexical';
import {describe, expect, test} from 'vitest';

import {flushRootMutations} from '../../LexicalMutations';
import {clearNodeKeyOnDOMNode, getNodeKeyFromDOMNode} from '../../LexicalUtils';
import {initializeUnitTest} from '../utils';

describe('Root-targeted DOM mutation reconciliation (regression for #8588)', () => {
  initializeUnitTest(testEnv => {
    test('root element carries the __lexicalKey_* stash after mount', () => {
      const {editor} = testEnv;
      const rootElement = editor.getRootElement()!;
      expect(rootElement).not.toBeNull();
      expect(getNodeKeyFromDOMNode(rootElement, editor)).toBe('root');
    });

    test('a root-targeted childList mutation reverts foreign DOM even when the root key stash is absent', () => {
      const {editor} = testEnv;
      const rootElement = editor.getRootElement()!;

      editor.update(
        () => {
          $getRoot().clear().append($createParagraphNode());
        },
        {discrete: true},
      );

      // Reproduce the real-world condition: at the moment a DOM mutation
      // targets the root element directly (the browser mutating a fresh /
      // near-empty contenteditable while typing), the `__lexicalKey_*` stash
      // may not be observable on the mutation target. Clearing it here
      // simulates that window. Before the fix, the mutation resolved to no
      // managed node and was silently skipped — typed/foreign DOM was left in
      // place and the editor state never updated (word-count gate stuck at 0).
      clearNodeKeyOnDOMNode(rootElement, editor);
      expect(getNodeKeyFromDOMNode(rootElement, editor)).toBeUndefined();

      const stray = document.createTextNode(
        'hello world this is eleven words now',
      );
      rootElement.appendChild(stray);

      flushRootMutations(editor);

      // The root-targeted mutation must still resolve to the RootNode via the
      // restored rootElement fallback, so the foreign DOM is reverted.
      expect(rootElement.contains(stray)).toBe(false);
    });
  });
});
