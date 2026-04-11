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
  $getNodeByKey,
  $getRoot,
  $isParagraphNode,
  $isTextNode,
} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';
import {assert, describe, expect, it} from 'vitest';

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
          assert($isTextNode(firstChild), 'Expected first child to be a TextNode.');
          firstChild.select(0, 3);
        },
        {discrete: true},
      );

      clearFormatting(editor);

      editor.getEditorState().read(() => {
        const paragraph = $getNodeByKey(paragraphKey);
        assert($isParagraphNode(paragraph), 'Expected to find a ParagraphNode.');
        expect(paragraph.getFormatType()).toBe('center');
      });
    });
  });
});
