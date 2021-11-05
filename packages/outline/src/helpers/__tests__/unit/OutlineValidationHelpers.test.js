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
import {isBlank, isBlankFromEditorState} from 'outline/root';
import {initializeUnitTest} from '../../../__tests__/utils';

describe('OutlineNodeHelpers tests', () => {
  initializeUnitTest((testEnv) => {
    it('isBlank', async () => {
      const editor = testEnv.editor;
      expect(
        isBlankFromEditorState(editor.getEditorState(), editor.isComposing()),
      ).toBe(true);
      await editor.update((state: State) => {
        expect(isBlank(state, editor.isComposing())).toBe(true);
        const root = state.getRoot();
        const paragraph = createParagraphNode();
        const text = createTextNode('foo');
        root.append(paragraph);
        paragraph.append(text);
        expect(isBlank(state, editor.isComposing())).toBe(false);
      });
      expect(
        isBlankFromEditorState(editor.getEditorState(), editor.isComposing()),
      ).toBe(false);
    });
  });
});
