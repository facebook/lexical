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
          assert(
            $isTextNode(firstChild),
            'Expected first child to be a TextNode.',
          );
          firstChild.select(0, 3);
        },
        {discrete: true},
      );

      clearFormatting(editor);

      editor.getEditorState().read(() => {
        const paragraph = $getNodeByKey(paragraphKey);
        assert(
          $isParagraphNode(paragraph),
          'Expected to find a ParagraphNode.',
        );
        expect(paragraph.getFormatType()).toBe('center');
      });
    });

    it('does nothing when the paragraph has no text nodes', () => {
      const {editor} = testEnv;
      let paragraphKey = '';

      editor.update(
        () => {
          const paragraph = $createParagraphNode();
          paragraph.setFormat('right');
          paragraphKey = paragraph.getKey();
          $getRoot().clear().append(paragraph);
          // Select the empty paragraph (collapsed at element level)
          paragraph.select();
        },
        {discrete: true},
      );

      clearFormatting(editor);

      editor.getEditorState().read(() => {
        const paragraph = $getNodeByKey(paragraphKey);
        assert(
          $isParagraphNode(paragraph),
          'Expected to find a ParagraphNode.',
        );
        // No text nodes to process, so block format must be untouched.
        expect(paragraph.getFormatType()).toBe('right');
      });
    });

    it('does nothing when the selection is collapsed', () => {
      const {editor} = testEnv;
      let paragraphKey = '';

      editor.update(
        () => {
          const paragraph = $createParagraphNode();
          paragraph.setFormat('center');
          const text = $createTextNode('Hello World');
          text.setFormat('bold');
          paragraph.append(text);
          paragraphKey = paragraph.getKey();
          $getRoot().clear().append(paragraph);

          // Place a collapsed cursor in the middle of the text.
          text.select(5, 5);
        },
        {discrete: true},
      );

      clearFormatting(editor);

      editor.getEditorState().read(() => {
        const paragraph = $getNodeByKey(paragraphKey);
        assert(
          $isParagraphNode(paragraph),
          'Expected to find a ParagraphNode.',
        );
        // Collapsed selection — nothing should have been cleared.
        expect(paragraph.getFormatType()).toBe('center');
        const textNode = paragraph.getFirstChild();
        assert($isTextNode(textNode), 'Expected first child to be a TextNode.');
        expect(textNode.hasFormat('bold')).toBe(true);
      });
    });
  });
});
