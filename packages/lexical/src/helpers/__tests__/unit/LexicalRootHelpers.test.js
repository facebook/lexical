/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {State} from 'lexical';

import {$createTextNode, $getRoot} from 'lexical';
import {$createParagraphNode} from 'lexical/ParagraphNode';
import {
  $isTextContentEmpty,
  $isTextContentEmptyCurry,
  $textContent,
  $textContentCurry,
} from 'lexical/root';
import {initializeUnitTest} from '../../../__tests__/utils';

describe('LexicalRootHelpers tests', () => {
  initializeUnitTest((testEnv) => {
    it('textContent', async () => {
      const editor = testEnv.editor;
      expect(editor.getEditorState().read($textContentCurry)).toBe('');
      await editor.update((state: State) => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        const text = $createTextNode('foo');
        root.append(paragraph);
        paragraph.append(text);
        expect($textContent()).toBe('foo');
      });
      expect(editor.getEditorState().read($textContentCurry)).toBe('foo');
    });

    it('isBlank', async () => {
      const editor = testEnv.editor;
      expect(
        editor
          .getEditorState()
          .read($isTextContentEmptyCurry(editor.isComposing())),
      ).toBe(true);
      await editor.update((state: State) => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        const text = $createTextNode('foo');
        root.append(paragraph);
        paragraph.append(text);
        expect($isTextContentEmpty(editor.isComposing())).toBe(false);
      });
      expect(
        editor
          .getEditorState()
          .read($isTextContentEmptyCurry(editor.isComposing())),
      ).toBe(false);
    });
  });
});
