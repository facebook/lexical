/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $isRootTextContentEmpty,
  $isRootTextContentEmptyCurry,
  $rootTextContent,
} from '@lexical/text';
import {$createParagraphNode, $createTextNode, $getRoot} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';
import {describe, expect, it} from 'vitest';

describe('LexicalRootHelpers tests', () => {
  initializeUnitTest(testEnv => {
    it('textContent', async () => {
      const editor = testEnv.editor;

      expect(editor.read('latest', $rootTextContent)).toBe('');

      await editor.update(() => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        const text = $createTextNode('foo');
        root.append(paragraph);
        paragraph.append(text);

        expect($rootTextContent()).toBe('foo');
      });

      expect(editor.read('latest', $rootTextContent)).toBe('foo');
    });

    it('isBlank', async () => {
      const editor = testEnv.editor;

      expect(
        editor.read(
          'latest',
          $isRootTextContentEmptyCurry(editor.isComposing()),
        ),
      ).toBe(true);

      await editor.update(() => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        const text = $createTextNode('foo');
        root.append(paragraph);
        paragraph.append(text);

        expect($isRootTextContentEmpty(editor.isComposing())).toBe(false);
      });

      expect(
        editor.read(
          'latest',
          $isRootTextContentEmptyCurry(editor.isComposing()),
        ),
      ).toBe(false);
    });
  });
});
