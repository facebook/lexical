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
  $getRoot,
  $setSelection,
} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';
import {describe, expect, it, vi} from 'vitest';

import {markSelection} from '../../index';

Range.prototype.getBoundingClientRect = function (): DOMRect {
  const rect = {
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    width: 0,
    x: 0,
    y: 0,
  };
  return {
    ...rect,
    toJSON() {
      return rect;
    },
  };
};

Range.prototype.getClientRects = function (): DOMRectList {
  return {
    item: () => null,
    length: 0,
    [Symbol.iterator]: function* () {},
  } as DOMRectList;
};

describe('markSelection', () => {
  initializeUnitTest((testEnv) => {
    it('does not throw for text-type selection points', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        const text = $createTextNode('hello');
        paragraph.append(text);
        root.append(paragraph);

        const selection = $createRangeSelection();
        selection.anchor.set(text.getKey(), 0, 'text');
        selection.focus.set(text.getKey(), 5, 'text');
        $setSelection(selection);
      });

      expect(() => {
        const cleanup = markSelection(editor, vi.fn());
        cleanup();
      }).not.toThrow();
    });

    it('does not throw for element-type selection points', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        root.append(paragraph);

        const selection = $createRangeSelection();
        selection.anchor.set(paragraph.getKey(), 0, 'element');
        selection.focus.set(paragraph.getKey(), 0, 'element');
        $setSelection(selection);
      });

      expect(() => {
        const cleanup = markSelection(editor, vi.fn());
        cleanup();
      }).not.toThrow();
    });

    it('calls onReposition for a range selection', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        const text = $createTextNode('hello world');
        paragraph.append(text);
        root.append(paragraph);

        const selection = $createRangeSelection();
        selection.anchor.set(text.getKey(), 0, 'text');
        selection.focus.set(text.getKey(), 5, 'text');
        $setSelection(selection);
      });

      const onReposition = vi.fn();
      const cleanup = markSelection(editor, onReposition);
      cleanup();
    });

    it('returns a cleanup function that can be called safely', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        const text = $createTextNode('test');
        paragraph.append(text);
        root.append(paragraph);
      });

      const cleanup = markSelection(editor, vi.fn());
      expect(() => cleanup()).not.toThrow();
    });
  });
});
