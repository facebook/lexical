/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {OverflowNode} from '@lexical/overflow';

import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $createOverflowNode,
  $isOverflowNode,
  OverflowExtension,
} from '@lexical/overflow';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  $setSlot,
  type LexicalEditor,
} from 'lexical';
import {
  $createTestDecoratorNode,
  TestDecoratorNode,
} from 'lexical/src/__tests__/utils';
import {afterEach, describe, expect, test} from 'vitest';

import {
  $mergeNext,
  $mergePrevious,
  $wrapOverflowedNodes,
} from '../../shared/useCharacterLimit';

function makeEditor(): LexicalEditor {
  const editor = buildEditorFromExtensions({
    dependencies: [OverflowExtension],
    name: 'character-limit-test',
    nodes: [TestDecoratorNode],
    onError: e => {
      throw e;
    },
  });
  editor.setRootElement(document.createElement('div'));
  return editor;
}

function $setupLeftRightOverflow(): {
  overflowLeft: OverflowNode;
  overflowRight: OverflowNode;
  paragraph: ReturnType<typeof $createParagraphNode>;
} {
  const root = $getRoot();
  root.clear();
  const paragraph = $createParagraphNode();
  const overflowLeft = $createOverflowNode();
  const overflowRight = $createOverflowNode();
  root.append(paragraph);
  paragraph.append(overflowLeft, overflowRight);
  return {overflowLeft, overflowRight, paragraph};
}

describe('useCharacterLimit', () => {
  let editor: LexicalEditor;

  afterEach(() => {
    editor.setRootElement(null);
  });

  describe('$mergePrevious', () => {
    test('merges left overflow into right with selection in left', async () => {
      editor = makeEditor();

      await editor.update(() => {
        const {overflowLeft, overflowRight, paragraph} =
          $setupLeftRightOverflow();

        const text1 = $createTextNode('1');
        const text2 = $createTextNode('2');
        const text3 = $createTextNode('3');
        const text4 = $createTextNode('4');

        overflowLeft.append(text1, text2);
        text2.toggleFormat('bold');
        overflowRight.append(text3, text4);
        text4.toggleFormat('bold');

        text1.select(1, 1);

        $mergePrevious(overflowRight);

        expect(paragraph.getChildrenSize()).toBe(1);
        expect($isOverflowNode(paragraph.getFirstChild())).toBe(true);

        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          throw new Error('Lost selection');
        }

        expect(selection.anchor.key).toBe(text1.getKey());
        expect(selection.anchor.offset).toBe(1);
        expect(selection.focus.key).toBe(text1.getKey());
        expect(selection.focus.offset).toBe(1);
      });
    });

    test('merges with selection spanning both overflows', async () => {
      editor = makeEditor();

      await editor.update(() => {
        const {overflowLeft, overflowRight, paragraph} =
          $setupLeftRightOverflow();

        const text1 = $createTextNode('1');
        const text2 = $createTextNode('2');
        const text3 = $createTextNode('3');
        const text4 = $createTextNode('4');

        overflowLeft.append(text1, text2);
        text2.toggleFormat('bold');
        overflowRight.append(text3, text4);
        text4.toggleFormat('bold');

        const selection = text2.select(0, 0);
        selection.focus.set(text3.getKey(), 1, 'text');

        $mergePrevious(overflowRight);

        expect(paragraph.getChildrenSize()).toBe(1);

        const updatedSelection = $getSelection();
        if (!$isRangeSelection(updatedSelection)) {
          throw new Error('Lost selection');
        }

        expect(updatedSelection.anchor.key).toBe(text2.getKey());
        expect(updatedSelection.anchor.offset).toBe(0);
        expect(updatedSelection.focus.key).toBe(text3.getKey());
        expect(updatedSelection.focus.offset).toBe(1);
      });
    });
  });

  describe('$mergeNext', () => {
    test('merges right overflow into left with text-type selection', async () => {
      editor = makeEditor();

      await editor.update(() => {
        const {overflowLeft, overflowRight, paragraph} =
          $setupLeftRightOverflow();

        const text1 = $createTextNode('1');
        const text2 = $createTextNode('2');
        const text3 = $createTextNode('3');
        const text4 = $createTextNode('4');

        overflowLeft.append(text1, text2);
        text2.toggleFormat('bold');
        overflowRight.append(text3, text4);
        text4.toggleFormat('bold');

        text3.select(0, 0);

        $mergeNext(overflowLeft);

        expect(paragraph.getChildrenSize()).toBe(1);
        expect($isOverflowNode(paragraph.getFirstChild())).toBe(true);
        expect(overflowLeft.getChildrenSize()).toBe(4);

        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          throw new Error('Lost selection');
        }

        expect(selection.anchor.key).toBe(text3.getKey());
        expect(selection.anchor.offset).toBe(0);
      });
    });

    test('remaps element-type selection pointing to next overflow', async () => {
      editor = makeEditor();

      await editor.update(() => {
        const {overflowLeft, overflowRight, paragraph} =
          $setupLeftRightOverflow();

        const text1 = $createTextNode('1');
        const text2 = $createTextNode('2');
        const text3 = $createTextNode('3');
        const text4 = $createTextNode('4');

        overflowLeft.append(text1, text2);
        text2.toggleFormat('bold');
        overflowRight.append(text3, text4);
        text4.toggleFormat('bold');

        overflowRight.select(1, 1);

        $mergeNext(overflowLeft);

        expect(paragraph.getChildrenSize()).toBe(1);
        expect(overflowLeft.getChildrenSize()).toBe(4);

        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          throw new Error('Lost selection');
        }

        // offset = overflowLeft children before merge (2) + original offset (1) = 3
        expect(selection.anchor.key).toBe(overflowLeft.getKey());
        expect(selection.anchor.offset).toBe(3);
        expect(selection.focus.key).toBe(overflowLeft.getKey());
        expect(selection.focus.offset).toBe(3);
      });
    });
  });

  describe('$wrapOverflowedNodes', () => {
    test('merges adjacent overflow nodes when wrapping before existing overflow', async () => {
      editor = makeEditor();

      await editor.update(() => {
        const root = $getRoot();
        root.clear();
        const paragraph = $createParagraphNode();
        const text = $createTextNode('abcde');
        const overflow = $createOverflowNode();
        overflow.append($createTextNode('f'));
        paragraph.append(text, overflow);
        root.append(paragraph);
      });

      await editor.update(() => {
        const paragraph = $getRoot().getFirstChildOrThrow();
        const text = paragraph.getFirstChild();
        if ($isTextNode(text)) {
          text.setTextContent('abcdge');
        }
      });

      await editor.update(() => {
        $wrapOverflowedNodes(5);
      });

      editor.read(() => {
        const paragraph = $getRoot().getFirstChildOrThrow();
        const children = paragraph.getChildren();
        expect(children.length).toBe(2);
        expect(children[0].getTextContent()).toBe('abcdg');
        expect($isOverflowNode(children[1])).toBe(true);
        expect(children[1].getTextContent()).toBe('ef');
      });
    });

    test('advances the budget past a slotted decorator so the wrap boundary is exact', async () => {
      editor = makeEditor();

      await editor.update(() => {
        const root = $getRoot();
        root.clear();
        const host = $createParagraphNode();
        host.append($createTextNode('12345'));
        root.append(host);
        $setSlot(host, 'media', $createTestDecoratorNode().setIsInline(false));
      });

      await editor.update(() => {
        $wrapOverflowedNodes(13);
      });

      editor.read(() => {
        const host = $getRoot().getFirstChildOrThrow();
        const children = host.getChildren();
        expect(children[0].getTextContent()).toBe('12');
        expect($isOverflowNode(children[1])).toBe(true);
        expect(children[1].getTextContent()).toBe('345');
      });
    });
  });
});
