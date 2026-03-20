/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isParagraphNode,
  $isTextNode,
} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';
import {describe, expect, it} from 'vitest';

import {clearFormatting} from '../../src/plugins/ToolbarPlugin/utils';

describe('ToolbarPlugin clearFormatting', () => {
  initializeUnitTest((testEnv) => {
    it('does NOT clear block alignment for a collapsed selection without full selection', () => {
      const {editor} = testEnv;

      editor.update(
        () => {
          const paragraph = $createParagraphNode();
          paragraph.setFormat('center');
          paragraph.setIndent(2);

          const text = $createTextNode('Hello');
          paragraph.append(text);
          $getRoot().append(paragraph);

          // collapsed cursor (not full selection)
          text.select(1, 1);
        },
        {discrete: true},
      );

      clearFormatting(editor);

      editor.read(() => {
        const paragraph = $getRoot().getFirstChild();
        expect(paragraph).not.toBeNull();
        if (!paragraph || !$isParagraphNode(paragraph)) {
          return;
        }

        // ✅ Block formatting should remain
        expect(paragraph.getFormatType()).toBe('center');
        expect(paragraph.getIndent()).toBe(2);

        const text = paragraph.getFirstChild();
        expect(text).not.toBeNull();
        if ($isTextNode(text)) {
          // ✅ No text formatting to clear anyway
          expect(text.getFormat()).toBe(0);
          expect(text.getStyle()).toBe('');
        }
      });
    });
  });
});
