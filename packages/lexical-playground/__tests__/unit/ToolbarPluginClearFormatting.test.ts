/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $isParagraphNode,
  $isTextNode,
  $setSelection,
} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';
import {describe, expect, it} from 'vitest';

import {clearFormatting} from '../../src/plugins/ToolbarPlugin/utils';

describe('ToolbarPlugin clearFormatting', () => {
  initializeUnitTest((testEnv) => {
    it('keeps block format when selection is partial', () => {
      const {editor} = testEnv;
      let paragraphKey = '';

      editor.update(
        () => {
          const paragraph = $createParagraphNode();
          paragraph.setFormat('center');
          paragraph.append($createTextNode('Hello'), $createTextNode('World'));
          paragraphKey = paragraph.getKey();
          $getRoot().clear().append(paragraph);

          const firstChild = paragraph.getFirstChild();
          if (!$isTextNode(firstChild)) {
            throw new Error('Expected first child to be a TextNode.');
          }
          const selection = $createRangeSelection();
          selection.setTextNodeRange(firstChild, 0, firstChild, 3);
          $setSelection(selection);
        },
        {discrete: true},
      );

      clearFormatting(editor);

      editor.getEditorState().read(() => {
        const paragraph = $getNodeByKey(paragraphKey);
        if (!$isParagraphNode(paragraph)) {
          throw new Error('Expected a ParagraphNode.');
        }
        expect(paragraph.getFormatType()).toBe('center');
      });
    });
  });
});
