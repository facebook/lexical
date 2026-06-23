/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  buildEditorFromExtensions,
  type LexicalEditorWithDispose,
} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $getRoot,
  BEFORE_INPUT_COMMAND,
  COMMAND_PRIORITY_EDITOR,
  INPUT_COMMAND,
} from 'lexical';
import {
  $createTestDecoratorNode,
  TestDecoratorNode,
} from 'lexical/src/__tests__/utils';
import {afterEach, describe, expect, test, vi} from 'vitest';

function createEditor(): LexicalEditorWithDispose {
  const editor = buildEditorFromExtensions({
    $initialEditorState: () => {
      $getRoot()
        .clear()
        .append(
          $createParagraphNode().append(
            $createTestDecoratorNode().setIsInline(false),
          ),
        );
    },
    dependencies: [RichTextExtension],
    name: 'test',
    nodes: [TestDecoratorNode],
  });
  const root = document.createElement('div');
  root.contentEditable = 'true';
  document.body.appendChild(root);
  editor.setRootElement(root);
  return editor;
}

afterEach(() => {
  if (typeof document !== 'undefined') {
    document.body.innerHTML = '';
  }
});

describe('Firefox decorator input events', () => {
  test('ignores input and beforeinput retargeted from focused decorator controls', () => {
    if (typeof document === 'undefined') {
      return;
    }
    using editor = createEditor();
    const root = editor.getRootElement();
    expect(root).not.toBeNull();
    const decorator = root!.querySelector<HTMLElement>(
      '[data-lexical-decorator]',
    );
    expect(decorator).not.toBeNull();
    const input = document.createElement('input');
    decorator!.appendChild(input);
    input.focus();

    const onInput = vi.fn(() => false);
    const onBeforeInput = vi.fn(() => false);
    editor.registerCommand(INPUT_COMMAND, onInput, COMMAND_PRIORITY_EDITOR);
    editor.registerCommand(
      BEFORE_INPUT_COMMAND,
      onBeforeInput,
      COMMAND_PRIORITY_EDITOR,
    );

    root.dispatchEvent(
      new InputEvent('beforeinput', {
        bubbles: true,
        data: 'a',
        inputType: 'insertText',
      }),
    );
    root.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        data: 'a',
        inputType: 'insertText',
      }),
    );

    expect(onBeforeInput).not.toHaveBeenCalled();
    expect(onInput).not.toHaveBeenCalled();
  });
});
