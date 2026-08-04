/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  HeadingNode,
  QuoteNode,
} from '@lexical/rich-text';
import {$setBlocksType, $wrapNodes} from '@lexical/selection';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSlot,
  $isParagraphNode,
  $setSlot,
} from 'lexical';
import {
  $createTestShadowRootNode,
  TestShadowRootNode,
} from 'lexical/src/__tests__/utils';
import {describe, expect, test} from 'vitest';

function runInEditor(fn: () => void): void {
  using editor = buildEditorFromExtensions({
    name: '@setBlocksType-slots-test',
    nodes: [TestShadowRootNode, HeadingNode, QuoteNode],
  });
  editor.update(fn, {discrete: true});
}

// A bare (non-shadow-root) block used as a named-slot value has no __parent —
// its up-link is __slotHost — so it is not eligible for generic block
// conversion: the slot assignment is managed by the node or extension that
// owns the slot. See the review discussion on facebook/lexical#8901.
describe('$setBlocksType and named slots', () => {
  test('no-ops on a bare-block slot value', () => {
    runInEditor(() => {
      const host = $createParagraphNode();
      $getRoot().append(host);
      const text = $createTextNode('title text');
      const slotPara = $createParagraphNode().append(text);
      $setSlot(host, 'title', slotPara);
      const selection = text.select(0, 0);

      $setBlocksType(selection, () => $createHeadingNode('h2'));

      const value = $getSlot(host, 'title');
      expect(value).not.toBe(null);
      expect(value!.is(slotPara)).toBe(true);
      expect($isParagraphNode(value)).toBe(true);
      expect(value!.getTextContent()).toBe('title text');
    });
  });

  test('no-ops on an empty bare-block slot value', () => {
    runInEditor(() => {
      const host = $createParagraphNode();
      $getRoot().append(host);
      const slotPara = $createParagraphNode();
      $setSlot(host, 'title', slotPara);
      const selection = slotPara.select();

      $setBlocksType(selection, () => $createHeadingNode('h2'));

      const value = $getSlot(host, 'title');
      expect(value).not.toBe(null);
      expect(value!.is(slotPara)).toBe(true);
      expect($isParagraphNode(value)).toBe(true);
    });
  });

  test('converts blocks inside a shadow-root slot value normally', () => {
    runInEditor(() => {
      const host = $createParagraphNode();
      $getRoot().append(host);
      const container = $createTestShadowRootNode();
      const text = $createTextNode('quoted');
      const innerPara = $createParagraphNode().append(text);
      container.append(innerPara);
      $setSlot(host, 'quote', container);
      const selection = text.select(0, 0);

      $setBlocksType(selection, () => $createHeadingNode('h2'));

      // The container keeps its slot; the block inside it converted.
      const value = $getSlot(host, 'quote');
      expect(value).not.toBe(null);
      expect(value!.is(container)).toBe(true);
      const child = container.getFirstChild();
      expect($isHeadingNode(child)).toBe(true);
      expect(child!.getTextContent()).toBe('quoted');
    });
  });
});

describe('$wrapNodes and named slots', () => {
  test('no-ops on a bare-block slot value', () => {
    runInEditor(() => {
      const host = $createParagraphNode();
      $getRoot().append(host);
      const text = $createTextNode('title text');
      const slotPara = $createParagraphNode().append(text);
      $setSlot(host, 'title', slotPara);
      const selection = text.select(0, 0);

      $wrapNodes(selection, () => $createQuoteNode());

      const value = $getSlot(host, 'title');
      expect(value).not.toBe(null);
      expect(value!.is(slotPara)).toBe(true);
      expect($isParagraphNode(value)).toBe(true);
      expect(value!.getTextContent()).toBe('title text');
    });
  });
});
