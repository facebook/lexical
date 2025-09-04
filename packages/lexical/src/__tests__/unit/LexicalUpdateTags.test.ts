/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from 'lexical';

import {
  $addUpdateTag,
  $createParagraphNode,
  $getRoot,
  $hasUpdateTag,
  COLLABORATION_TAG,
  HISTORIC_TAG,
  HISTORY_MERGE_TAG,
  HISTORY_PUSH_TAG,
  SKIP_DOM_SELECTION_TAG,
  SKIP_SCROLL_INTO_VIEW_TAG,
} from 'lexical';
import {describe, expect, test, vi} from 'vitest';

import {initializeUnitTest} from '../utils';

type TestEnv = {
  editor: LexicalEditor;
};

describe('LexicalUpdateTags tests', () => {
  initializeUnitTest((testEnv: TestEnv) => {
    test('Built-in update tags work correctly', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const builtInTags = [
          HISTORIC_TAG,
          HISTORY_PUSH_TAG,
          HISTORY_MERGE_TAG,
          COLLABORATION_TAG,
          SKIP_DOM_SELECTION_TAG,
          SKIP_SCROLL_INTO_VIEW_TAG,
        ];

        for (const tag of builtInTags) {
          $addUpdateTag(tag);
          expect($hasUpdateTag(tag)).toBe(true);
        }
      });
    });

    test('$addUpdateTag and $hasUpdateTag work correctly', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const tag = 'test-tag';
        expect($hasUpdateTag(tag)).toBe(false);
        $addUpdateTag(tag);
        expect($hasUpdateTag(tag)).toBe(true);
      });
    });

    test('Multiple update tags can be added', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const tags = ['tag1', 'tag2', 'tag3'];
        for (const tag of tags) {
          $addUpdateTag(tag);
        }
        for (const tag of tags) {
          expect($hasUpdateTag(tag)).toBe(true);
        }
      });
    });

    test('Update tags via editor.update() options work', async () => {
      const {editor} = testEnv;
      const tag = 'test-tag';
      let hasTag = false;
      await editor.update(
        () => {
          hasTag = $hasUpdateTag(tag);
        },
        {tag},
      );
      expect(hasTag).toBe(true);
    });

    test('Update tags are cleared after update', async () => {
      const {editor} = testEnv;
      const tag = HISTORIC_TAG;
      await editor.update(() => {
        $addUpdateTag(tag);
        expect($hasUpdateTag(tag)).toBe(true);
      });

      let hasTag = false;
      await editor.update(() => {
        hasTag = $hasUpdateTag(tag);
      });
      expect(hasTag).toBe(false);
    });

    test('Update tags affect editor behavior', async () => {
      const {editor} = testEnv;

      // Test that skip-dom-selection prevents selection updates
      const updateListener = vi.fn();
      editor.registerUpdateListener(({tags}: {tags: Set<string>}) => {
        updateListener(Array.from(tags));
      });

      await editor.update(
        () => {
          const root = $getRoot();
          const paragraph = $createParagraphNode();
          root.append(paragraph);
        },
        {
          tag: SKIP_DOM_SELECTION_TAG,
        },
      );

      expect(updateListener).toHaveBeenCalledWith(
        expect.arrayContaining([SKIP_DOM_SELECTION_TAG]),
      );
    });
  });
});
