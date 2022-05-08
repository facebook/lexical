/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {State} from 'lexical';

import {
  $isRootTextContentEmpty,
  $isRootTextContentEmptyCurry,
  $rootTextContentCurry,
} from '@lexical/text';
import {$createParagraphNode, $createTextNode, $getRoot} from 'lexical';

import {initializeUnitTest} from '../../../../lexical/src/__tests__/utils';

// No idea why we suddenly need to do this, but it fixes the tests
// with latest experimental React version.
global.IS_REACT_ACT_ENVIRONMENT = true;

describe('LexicalRootHelpers tests', () => {
  initializeUnitTest((testEnv) => {
    it('textContent', async () => {
      const editor = testEnv.editor;
      expect(editor.getEditorState().read($rootTextContentCurry)).toBe('');
      await editor.update((state: State) => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        const text = $createTextNode('foo');
        root.append(paragraph);
        paragraph.append(text);
        expect($rootTextContentCurry()).toBe('foo');
      });
      expect(editor.getEditorState().read($rootTextContentCurry)).toBe('foo');
    });

    it('isBlank', async () => {
      const editor = testEnv.editor;
      expect(
        editor
          .getEditorState()
          .read($isRootTextContentEmptyCurry(editor.isComposing())),
      ).toBe(true);
      await editor.update((state: State) => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        const text = $createTextNode('foo');
        root.append(paragraph);
        paragraph.append(text);
        expect($isRootTextContentEmpty(editor.isComposing())).toBe(false);
      });
      expect(
        editor
          .getEditorState()
          .read($isRootTextContentEmptyCurry(editor.isComposing())),
      ).toBe(false);
    });
  });
});
