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
  SKIP_DOM_SELECTION_TAG,
} from 'lexical';

import {KNOWN_UPDATE_TAGS} from '../../LexicalUpdateTags';
import {initializeUnitTest} from '../utils';

type TestEnv = {
  editor: LexicalEditor;
};

describe('LexicalUpdateTags tests', () => {
  initializeUnitTest((testEnv: TestEnv) => {
    test('All exported tags are in KNOWN_UPDATE_TAGS', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        for (const tag of KNOWN_UPDATE_TAGS) {
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

    test('Unknown tags trigger warning with validateTag', async () => {
      const {editor} = testEnv;
      const consoleSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});
      await editor.update(() => {
        $addUpdateTag('unknown-tag', true);
        expect(consoleSpy).toHaveBeenCalledWith(
          'Warning: "unknown-tag" is not a known update tag. This may be a typo. Known tags are: ' +
            Array.from(KNOWN_UPDATE_TAGS).join(', '),
        );
      });
      consoleSpy.mockRestore();
    });

    test('Update tags are cleared after update', async () => {
      const {editor} = testEnv;
      const tag = 'test-tag';
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
      const updateListener = jest.fn();
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
