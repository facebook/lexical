/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {PlainTextExtension} from '@lexical/plain-text';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $create,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  DecoratorNode,
  DELETE_LINE_COMMAND,
} from 'lexical';
import {describe, expect, onTestFinished, test} from 'vitest';

class InlineDecoratorNode extends DecoratorNode<null> {
  $config() {
    return this.config('test_inline_decorator', {extends: DecoratorNode});
  }
  createDOM(): HTMLElement {
    const span = document.createElement('span');
    span.contentEditable = 'false';
    span.style.cssText =
      'display: inline-block; inline-size: 24px; block-size: 16px';
    return span;
  }
  updateDOM(): boolean {
    return false;
  }
  isInline(): boolean {
    return true;
  }
  decorate(): null {
    return null;
  }
}

describe.each([RichTextExtension, PlainTextExtension])('$name', extension => {
  test.each(
    [false, true].flatMap(isBackward =>
      ['empty', 'text', 'nested'].flatMap(content =>
        [false, true].map(raised => ({content, isBackward, raised})),
      ),
    ),
  )(
    'line deletion (backward: $isBackward, raised: $raised, content: $content)',
    ({content, isBackward, raised}) => {
      const root = document.createElement('div');
      root.contentEditable = 'true';
      root.style.cssText =
        'width: 500px; font: 16px monospace; line-height: 24px; white-space: pre-wrap';
      document.body.appendChild(root);
      const before = isBackward ? 'aaaa ' : 'aaaa bbbb ';
      const after = isBackward ? 'bbbbbbbb cccc' : '';
      const editor = buildEditorFromExtensions({
        $initialEditorState: () => {
          const left = $createTextNode(before);
          const right = $createTextNode(after);
          $getRoot().append(
            $createParagraphNode().append(
              left,
              $create(InlineDecoratorNode),
              right,
            ),
          );
          (isBackward ? right : left).select(2, 2);
        },
        dependencies: [extension],
        name: '[inline-decorator-line-deletion]',
        nodes: [InlineDecoratorNode],
      });
      onTestFinished(() => {
        editor.dispose();
        root.remove();
      });
      editor.setRootElement(root);

      const decorator = root.querySelector<HTMLElement>(
        '[data-lexical-decorator]',
      )!;
      if (content === 'text') {
        decorator.textContent = 'X';
      } else if (content === 'nested') {
        const child = document.createElement('strong');
        child.textContent = 'X';
        decorator.appendChild(child);
      }
      if (raised) {
        decorator.style.verticalAlign = '2em';
      }
      const text = root.querySelectorAll('[data-lexical-text]')[
        isBackward ? 1 : 0
      ].firstChild!;
      const range = document.createRange();
      range.setStart(text, 1);
      range.setEnd(text, 2);
      const caretRect = range.getBoundingClientRect();
      const decoratorRect = decorator.getBoundingClientRect();
      // All content fits on one line; raised content deliberately has no
      // vertical overlap with the text next to it.
      if (raised) {
        expect(caretRect.top).toBeGreaterThanOrEqual(decoratorRect.bottom);
      } else {
        expect(caretRect.top).toBeLessThan(decoratorRect.bottom);
        expect(caretRect.bottom).toBeGreaterThan(decoratorRect.top);
      }

      editor.update(
        () => editor.dispatchCommand(DELETE_LINE_COMMAND, isBackward),
        {discrete: true},
      );
      expect(root.querySelector('[data-lexical-decorator]')).toBeNull();
      expect(editor.read(() => $getRoot().getTextContent())).toBe(
        isBackward ? after.slice(2) : before.slice(0, 2),
      );
    },
  );
});
