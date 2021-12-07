/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {State} from 'outline';

import {otlnCreateTextNode, otlnGetRoot} from 'outline';
import {otlnCreateParagraphNode} from 'outline/ParagraphNode';
import {isTextContentEmpty, textContent} from 'outline/root';
import {initializeUnitTest} from '../../../__tests__/utils';

describe('OutlineRootHelpers tests', () => {
  initializeUnitTest((testEnv) => {
    it('textContent', async () => {
      const editor = testEnv.editor;
      expect(editor.getEditorState().read(textContent)).toBe('');
      await editor.update((state: State) => {
        const root = otlnGetRoot();
        const paragraph = otlnCreateParagraphNode();
        const text = otlnCreateTextNode('foo');
        root.append(paragraph);
        paragraph.append(text);
        expect(textContent(state)).toBe('foo');
      });
      expect(editor.getEditorState().read(textContent)).toBe('foo');
    });

    it('isBlank', async () => {
      const editor = testEnv.editor;
      expect(
        editor
          .getEditorState()
          .read((state) => isTextContentEmpty(state, editor.isComposing())),
      ).toBe(true);
      await editor.update((state: State) => {
        const root = otlnGetRoot();
        const paragraph = otlnCreateParagraphNode();
        const text = otlnCreateTextNode('foo');
        root.append(paragraph);
        paragraph.append(text);
        expect(isTextContentEmpty(state, editor.isComposing())).toBe(false);
      });
      expect(
        editor
          .getEditorState()
          .read((state) => isTextContentEmpty(state, editor.isComposing())),
      ).toBe(false);
    });
  });
});
