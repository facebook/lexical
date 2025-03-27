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

describe('LexicalReconciler', () => {
  initializeUnitTest((testEnv) => {
    test('Should use activeEditorDirection as the direction for a node with no directioned text', async () => {
      const {editor} = testEnv;

      editor.update(() => {
        const root = $getRoot().clear();
        root.append(
          $createParagraphNode().append($createTextNode('فرعي')),
          $createParagraphNode().append($createTextNode('Hello')),
          $createParagraphNode().append($createLineBreakNode()),
        );
      });

      // The third paragraph has no directioned text, so it should be set to the direction of the previous sibling.
      let para3Dir = editor.read(() => {
        return $getRoot().getChildAtIndex<ParagraphNode>(2)!.getDirection();
      });
      expect(para3Dir).toEqual('ltr');

      // Mark the first and third paragraphs as dirty to force the reconciler to run.
      editor.update(() => {
        $getRoot().getChildAtIndex<ParagraphNode>(0)!.markDirty();
        $getRoot().getChildAtIndex<ParagraphNode>(2)!.markDirty();
      });

      // Note: this is arguably a bug. It would be preferable for the node to keep its LTR direction. Added as a
      // test so that the behaviour is at least documented.
      para3Dir = editor.read(() => {
        return $getRoot().getChildAtIndex<ParagraphNode>(2)!.getDirection();
      });
      expect(para3Dir).toEqual('rtl');
    });
  });
});
