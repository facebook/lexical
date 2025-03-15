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

      let para2Dir = editor.read(() => {
        return $getRoot().getChildAtIndex<ParagraphNode>(1)!.getDirection();
      });
      expect(para2Dir).toEqual('rtl');

      // Mark the second paragraph's child as dirty to force the reconciler to run.
      editor.update(() => {
        const pargraph = $getRoot().getChildAtIndex<ParagraphNode>(1)!;
        const lineBreak = pargraph.getFirstChildOrThrow();
        lineBreak.markDirty();
      });

      // There was no activeEditorDirection when processing this node, so direction should be set back to null.
      // Note: this is arguably a bug. It would be preferable for the node to keep its RTL direction. Added as a
      // test here so that the behaviour is at least documented.
      para2Dir = editor.read(() => {
        return $getRoot().getChildAtIndex<ParagraphNode>(1)!.getDirection();
      });
      expect(para2Dir).toBeNull();
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

      let para2Dir = editor.read(() => {
        return $getRoot().getChildAtIndex<ParagraphNode>(1)!.getDirection();
      });
      expect(para2Dir).toBeNull();

      // Mark the second paragraph's child as dirty to force the reconciler to run.
      editor.update(() => {
        const pargraph = $getRoot().getChildAtIndex<ParagraphNode>(1)!;
        const lineBreak = pargraph.getFirstChildOrThrow();
        lineBreak.markDirty();
      });

      para2Dir = editor.read(() => {
        return $getRoot().getChildAtIndex<ParagraphNode>(1)!.getDirection();
      });
      expect(para2Dir).toBeNull();
    });
  });
});
