/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions, defineExtension} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isRangeSelection,
  $selectAll,
  ElementNode,
} from 'lexical';
import {assert, describe, expect, onTestFinished, test} from 'vitest';

class TestShadowRootNode extends ElementNode {
  $config() {
    return this.config('test_shadow_root', {extends: ElementNode});
  }
  createDOM() {
    return document.createElement('div');
  }
  updateDOM() {
    return false;
  }
  isShadowRoot() {
    return true;
  }
}

const ext = defineExtension({
  dependencies: [RichTextExtension],
  name: '[8745-browser]',
  nodes: [TestShadowRootNode],
});

function mountEditor() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const contentEditable = document.createElement('div');
  contentEditable.contentEditable = 'true';
  container.appendChild(contentEditable);

  const editor = buildEditorFromExtensions(ext);
  editor.setRootElement(contentEditable);

  onTestFinished(() => {
    editor.setRootElement(null);
    document.body.removeChild(container);
  });

  return editor;
}

describe('select-all + deleteLine with trailing shadow root (#8745)', () => {
  test('leaves at least one child', () => {
    const editor = mountEditor();
    editor.update(
      () => {
        const p = $createParagraphNode();
        p.append($createTextNode('hello'));
        const shadow = new TestShadowRootNode();
        const innerP = $createParagraphNode();
        innerP.append($createTextNode('shadow'));
        shadow.append(innerP);
        $getRoot().clear().append(p, shadow);
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const selection = $selectAll();
        assert($isRangeSelection(selection), 'Expected RangeSelection');
        selection.deleteLine(true);
      },
      {discrete: true},
    );

    editor.read(() => {
      const root = $getRoot();
      expect(root.getChildrenSize()).toBeGreaterThanOrEqual(1);
    });
  });
});
