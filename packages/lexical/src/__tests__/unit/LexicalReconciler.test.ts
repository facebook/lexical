/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  ParagraphNode,
} from 'lexical';

import {initializeUnitTest} from '../utils';

describe('LexicalNode state', () => {
  initializeUnitTest((testEnv) => {
    test('Should set "rtl" direction if node has no directioned text and previous sibling is "rtl"', async () => {
      const {editor} = testEnv;
      const rtlText = '\u0591';

      // Add paragraph with RTL text, then another with a non-TextNode child
      editor.update(() => {
        const root = $getRoot().clear();
        root.append(
          $createParagraphNode().append($createTextNode(rtlText)),
          $createParagraphNode().append($createLineBreakNode()),
        );
      });

      const para2Dir = editor.read(() => {
        return $getRoot().getChildAtIndex<ParagraphNode>(1)!.getDirection();
      });
      expect(para2Dir).toEqual('rtl');
    });

    test('Should not set "ltr" direction if node has no directioned text and previous sibling is "ltr"', async () => {
      const {editor} = testEnv;
      const ltrText = 'Hello';

      editor.update(() => {
        const root = $getRoot().clear();
        root.append(
          $createParagraphNode().append($createTextNode(ltrText)),
          $createParagraphNode().append($createLineBreakNode()),
        );
      });

      const para2Dir = editor.read(() => {
        return $getRoot().getChildAtIndex<ParagraphNode>(1)!.getDirection();
      });
      expect(para2Dir).toBeNull();
    });

    test('Should use activeEditorDirection as the direction for a node with no directioned text', async () => {
      const {editor} = testEnv;
      const ltrText = 'Hello';
      const rtlText = '\u0591';

      editor.update(() => {
        const root = $getRoot().clear();
        root.append(
          $createParagraphNode().append($createTextNode(rtlText)),
          $createParagraphNode().append($createTextNode(ltrText)),
          $createParagraphNode().append($createLineBreakNode()),
        );
      });

      let para3Dir = editor.read(() => {
        return $getRoot().getChildAtIndex<ParagraphNode>(2)!.getDirection();
      });
      expect(para3Dir).toBeNull();

      editor.update(() => {
        $getRoot().getChildAtIndex<ParagraphNode>(0)!.markDirty();
        $getRoot().getChildAtIndex<ParagraphNode>(2)!.markDirty();
      });

      para3Dir = editor.read(() => {
        return $getRoot().getChildAtIndex<ParagraphNode>(2)!.getDirection();
      });
      expect(para3Dir).toEqual('rtl');
    });
  });
});
