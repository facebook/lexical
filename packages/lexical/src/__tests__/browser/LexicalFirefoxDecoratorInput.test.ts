/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $create,
  $createParagraphNode,
  $getRoot,
  BEFORE_INPUT_COMMAND,
  COMMAND_PRIORITY_EDITOR,
  DecoratorNode,
  EditorConfig,
  INPUT_COMMAND,
  isHTMLElement,
  LexicalEditor,
} from 'lexical';
import {assert, describe, expect, onTestFinished, test, vi} from 'vitest';

class InputDecoratorNode extends DecoratorNode<unknown> {
  $config() {
    return this.config('input-decorator', {extends: DecoratorNode});
  }
  isInline() {
    return false;
  }
  createDOM(_config: EditorConfig, _editor: LexicalEditor): HTMLElement {
    const div = document.createElement('div');
    div.appendChild(document.createElement('input'));
    return div;
  }
}

function createEditor(): LexicalEditor {
  const rval = buildEditorFromExtensions({
    $initialEditorState: () => {
      $getRoot().append(
        $createParagraphNode().append($create(InputDecoratorNode)),
      );
    },
    dependencies: [RichTextExtension],
    name: 'test',
    nodes: [InputDecoratorNode],
  });
  onTestFinished(() => {
    document.body.removeChild(root);
    rval.setRootElement(null);
  });
  const root = document.createElement('div');
  root.contentEditable = 'true';
  document.body.appendChild(root);
  rval.setRootElement(root);
  return rval;
}

describe('Synthetic Firefox-like decorator input events', () => {
  test('ignores input and beforeinput retargeted from focused decorator controls', () => {
    const editor = createEditor();
    const root = editor.getRootElement();
    assert(isHTMLElement(root));
    const input = root.querySelector<HTMLInputElement>(
      '[data-lexical-decorator] input',
    );
    assert(isHTMLElement(input));
    input.focus();

    const onInput = vi.fn(() => false);
    const onBeforeInput = vi.fn(() => false);
    editor.registerCommand(INPUT_COMMAND, onInput, COMMAND_PRIORITY_EDITOR);
    editor.registerCommand(
      BEFORE_INPUT_COMMAND,
      onBeforeInput,
      COMMAND_PRIORITY_EDITOR,
    );

    // Note that the value won't change because these are untrusted events
    input.dispatchEvent(
      new InputEvent('beforeinput', {
        bubbles: true,
        data: 'a',
        inputType: 'insertText',
      }),
    );
    input.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        data: 'a',
        inputType: 'insertText',
      }),
    );

    expect(onBeforeInput).not.toHaveBeenCalled();
    expect(onInput).not.toHaveBeenCalled();
    // Expect that untrustd events don't turn into input
    expect(input.value).toBe('');

    // Test the trusted path (may not call beforeinput)
    document.execCommand('insertText', false, 'a');
    expect(onBeforeInput).not.toHaveBeenCalled();
    expect(onInput).not.toHaveBeenCalled();
    expect(input.value).toBe('a');
  });
});
