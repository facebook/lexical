/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {State} from 'outline';

import {createTextNode} from 'outline';
import {createParagraphNode} from 'outline/ParagraphNode';
import {isBlank2, textContent2} from 'outline/root';
import {initializeUnitTest} from '../../../__tests__/utils';

describe('OutlineRootHelpers tests', () => {
  initializeUnitTest((testEnv) => {
    it('textContent', async () => {
      const editor = testEnv.editor;
      expect(editor.getEditorState().read(textContent2)).toBe('');
      await editor.update((state: State) => {
        const root = state.getRoot();
        const paragraph = createParagraphNode();
        const text = createTextNode('foo');
        root.append(paragraph);
        paragraph.append(text);
        expect(textContent2(state)).toBe('foo');
      });
      expect(editor.getEditorState().read(textContent2)).toBe('foo');
    });

    it('isBlank', async () => {
      const editor = testEnv.editor;
      expect(
        editor
          .getEditorState()
          .read((state) => isBlank2(state, editor.isComposing())),
      ).toBe(true);
      await editor.update((state: State) => {
        const root = state.getRoot();
        const paragraph = createParagraphNode();
        const text = createTextNode('foo');
        root.append(paragraph);
        paragraph.append(text);
        expect(isBlank2(state, editor.isComposing())).toBe(false);
      });
      expect(
        editor
          .getEditorState()
          .read((state) => isBlank2(state, editor.isComposing())),
      ).toBe(false);
    });
  });
});
