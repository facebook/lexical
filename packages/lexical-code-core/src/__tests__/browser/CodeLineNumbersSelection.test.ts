/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createCodeHighlightNode,
  $createCodeNode,
  CodeLineNumbersExtension,
} from '@lexical/code-core';
import {buildEditorFromExtensions} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createLineBreakNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
} from 'lexical';
import {assert, expect, onTestFinished, test} from 'vitest';

// The browser can put the caret inside the <span> that wraps a line break's
// <br>, e.g. on a click at the start of a line. Text the browser inserts
// itself (composition) would then land inside the wrapper, so the caret is
// written back outside it, at the position it resolves to.
test.each([
  [0, 1],
  [1, 2],
])(
  'a caret at offset %i of the line break wrapper moves to code offset %i',
  async (domOffset, codeOffset) => {
    const contentEditable = document.createElement('div');
    contentEditable.contentEditable = 'true';
    document.body.appendChild(contentEditable);
    const editor = buildEditorFromExtensions({
      dependencies: [RichTextExtension, CodeLineNumbersExtension],
      name: 'code-line-numbers-selection',
    });
    editor.setRootElement(contentEditable);
    onTestFinished(() => {
      editor.setRootElement(null);
      contentEditable.remove();
      editor.dispose();
    });
    contentEditable.focus();
    editor.update(
      () => {
        $getRoot()
          .clear()
          .append(
            $createCodeNode().append(
              $createCodeHighlightNode('ab'),
              $createLineBreakNode(),
              $createLineBreakNode(),
            ),
          );
      },
      {discrete: true},
    );
    const code = contentEditable.querySelector('code');
    const wrapper = contentEditable.querySelector(
      '[data-lexical-code-line-break]',
    );
    assert(code !== null && wrapper !== null);

    const domSelection = window.getSelection();
    assert(domSelection !== null);
    domSelection.setBaseAndExtent(wrapper, domOffset, wrapper, domOffset);
    await expect.poll(() => domSelection.anchorNode).toBe(code);
    expect(domSelection.anchorOffset).toBe(codeOffset);
    editor.read(() => {
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      expect(selection.anchor.type).toBe('element');
      expect(selection.anchor.offset).toBe(codeOffset);
      expect(selection.isCollapsed()).toBe(true);
    });
  },
);
