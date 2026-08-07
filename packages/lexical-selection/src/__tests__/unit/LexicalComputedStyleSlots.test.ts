/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {$getComputedStyleForParent, $isParentRTL} from '@lexical/selection';
import {
  $createParagraphNode,
  $createTextNode,
  $getNodeByKeyOrThrow,
  $getRoot,
  $isRangeSelection,
  $setSlot,
  type ParagraphNode,
} from 'lexical';
import {
  $createTestShadowRootNode,
  TestShadowRootNode,
} from 'lexical/src/__tests__/utils';
import {afterEach, assert, describe, expect, test} from 'vitest';

const mounted: HTMLElement[] = [];

afterEach(() => {
  for (const element of mounted.splice(0)) {
    element.remove();
  }
});

// `build` runs in its own update so that the nodes are reconciled to the DOM
// before `check` reads their computed styles.
function runInEditor(build: () => void, check: () => void): void {
  using editor = buildEditorFromExtensions({
    name: '@computed-style-slots-test',
    nodes: [TestShadowRootNode],
  });
  const rootElement = document.createElement('div');
  document.body.appendChild(rootElement);
  mounted.push(rootElement);
  editor.setRootElement(rootElement);
  editor.update(build, {discrete: true});
  editor.update(check, {discrete: true});
}

// A named-slot value has no __parent — it links up to its host through
// __slotHost. Reading the parent's computed style must not throw for it: the
// arrow-key handlers in @lexical/rich-text call $isParentRTL on the anchor
// node, and the anchor is the slot value itself whenever the caret sits in an
// empty slot or next to a decorator inside one.
// https://github.com/facebook/lexical/issues/8937
describe('computed styles and named slots', () => {
  test('$getComputedStyleForParent returns null for a bare-block slot value', () => {
    let slotParaKey = '';
    runInEditor(
      () => {
        const host = $createParagraphNode();
        $getRoot().append(host);
        const slotPara = $createParagraphNode();
        slotParaKey = slotPara.getKey();
        $setSlot(host, 'title', slotPara);
      },
      () => {
        expect(
          $getComputedStyleForParent($getNodeByKeyOrThrow(slotParaKey)),
        ).toBe(null);
      },
    );
  });

  test('$isParentRTL is false for the anchor inside an empty bare-block slot value', () => {
    let slotParaKey = '';
    runInEditor(
      () => {
        const host = $createParagraphNode();
        $getRoot().append(host);
        const slotPara = $createParagraphNode();
        slotParaKey = slotPara.getKey();
        $setSlot(host, 'title', slotPara);
      },
      () => {
        const slotPara = $getNodeByKeyOrThrow<ParagraphNode>(slotParaKey);
        const selection = slotPara.select();
        assert($isRangeSelection(selection));
        expect($isParentRTL(selection.anchor.getNode())).toBe(false);
      },
    );
  });

  test('$getComputedStyleForParent still resolves the parent inside a slot', () => {
    let slotParaKey = '';
    let slotRootKey = '';
    runInEditor(
      () => {
        const host = $createParagraphNode();
        $getRoot().append(host);
        const slotRoot = $createTestShadowRootNode();
        const slotPara = $createParagraphNode().append(
          $createTextNode('title'),
        );
        slotRoot.append(slotPara);
        slotParaKey = slotPara.getKey();
        slotRootKey = slotRoot.getKey();
        $setSlot(host, 'title', slotRoot);
      },
      () => {
        const slotPara = $getNodeByKeyOrThrow(slotParaKey);
        // The paragraph is inside the slot but is not the slot value, so it
        // has a parent and resolution is unchanged.
        expect(slotPara.getParent()!.getKey()).toBe(slotRootKey);
        expect($getComputedStyleForParent(slotPara)).not.toBe(null);
      },
    );
  });
});
