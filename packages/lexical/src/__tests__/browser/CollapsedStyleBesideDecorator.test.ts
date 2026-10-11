/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * A style set at a caret is kept for the text typed next, across the
 * selectionchange that writing the caret to the DOM causes. The editor
 * matches that selectionchange to the caret by its Lexical offset, which for
 * an element point differs from the DOM offset when the editor renders DOM
 * ahead of the children: the zero-size anchor before an inline decorator
 * that starts a paragraph, on Chromium and WebKit (#7158).
 */

import {buildEditorFromExtensions, defineExtension} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {$patchStyleText} from '@lexical/selection';
import {
  $create,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  DecoratorNode,
} from 'lexical';
import {assert, expect, onTestFinished, test} from 'vitest';
import {userEvent} from 'vitest/browser';

class InlineDecoratorNode extends DecoratorNode<null> {
  $config() {
    return this.config('test_collapsed_style_inline', {
      extends: DecoratorNode,
    });
  }
  createDOM(): HTMLElement {
    const span = document.createElement('span');
    span.style.cssText = 'display:inline-block;width:20px;height:20px';
    return span;
  }
  updateDOM(): false {
    return false;
  }
  decorate(): null {
    return null;
  }
}

test('a style set at the caret after a leading inline decorator is typed with', async () => {
  const root = document.createElement('div');
  root.contentEditable = 'true';
  document.body.appendChild(root);
  const editor = buildEditorFromExtensions(
    defineExtension({
      $initialEditorState: () => {
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append($create(InlineDecoratorNode)),
            $createParagraphNode().append($createTextNode('abc')),
          );
      },
      dependencies: [RichTextExtension],
      name: '[collapsed-style-beside-decorator]',
      nodes: [InlineDecoratorNode],
    }),
  );
  editor.setRootElement(root);
  onTestFinished(() => {
    editor.dispose();
    root.remove();
  });
  root.focus();
  editor.update(
    () => {
      const paragraph = $getRoot().getFirstChild();
      assert($isElementNode(paragraph), 'Expected the paragraph');
      paragraph.select(1, 1);
    },
    {discrete: true},
  );
  editor.update(
    () => {
      const selection = $getSelection();
      assert($isRangeSelection(selection), 'Expected a RangeSelection');
      $patchStyleText(selection, {color: 'red'});
    },
    {discrete: true},
  );
  await userEvent.keyboard('x');
  await expect
    .poll(() =>
      editor.read('latest', () =>
        $getRoot()
          .getAllTextNodes()
          .map(node => [node.getTextContent(), node.getStyle()]),
      ),
    )
    .toEqual([
      ['x', 'color: red;'],
      ['abc', ''],
    ]);
});
