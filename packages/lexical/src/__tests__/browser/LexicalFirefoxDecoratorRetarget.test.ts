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
  $createTextNode,
  $getRoot,
  BEFORE_INPUT_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
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
      $getRoot()
        .append($createParagraphNode().append($createTextNode('hello')))
        .append($createParagraphNode().append($create(InputDecoratorNode)));
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

function setup() {
  const editor = createEditor();
  const root = editor.getRootElement();
  assert(isHTMLElement(root));
  const input = root.querySelector<HTMLInputElement>(
    '[data-lexical-decorator] input',
  );
  assert(isHTMLElement(input));

  // Spy at CRITICAL priority (above the built-in editor handler) so the
  // assertions detect whether the command is dispatched at all, independent of
  // any downstream selection/no-op behavior.
  const onBeforeInput = vi.fn(() => false);
  const onInput = vi.fn(() => false);
  editor.registerCommand(
    BEFORE_INPUT_COMMAND,
    onBeforeInput,
    COMMAND_PRIORITY_CRITICAL,
  );
  editor.registerCommand(INPUT_COMMAND, onInput, COMMAND_PRIORITY_CRITICAL);

  // The caret really lives in the decorator's native control.
  input.focus();
  const before = editor.read(() => $getRoot().getTextContent());
  return {before, editor, input, onBeforeInput, onInput, root};
}

function dispatchInput(target: HTMLElement) {
  target.dispatchEvent(
    new InputEvent('beforeinput', {
      bubbles: true,
      data: 'X',
      inputType: 'insertText',
    }),
  );
  target.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      data: 'X',
      inputType: 'insertText',
    }),
  );
}

describe('Decorator-owned input/beforeinput is not turned into editor commands', () => {
  // The composed target identifies the control: the pre-existing path, but
  // verified here against the dispatched command rather than only the
  // downstream listeners.
  test('events dispatched from the focused control are ignored', () => {
    const {before, editor, input, onBeforeInput, onInput} = setup();
    dispatchInput(input);
    expect(onBeforeInput).not.toHaveBeenCalled();
    expect(onInput).not.toHaveBeenCalled();
    expect(editor.read(() => $getRoot().getTextContent())).toBe(before);
  });

  // Firefox 152 dispatches the events for the focused control to the editor
  // root, so the composed target no longer identifies the control (#8738). The
  // editor must fall back to the deep active element to recognize the
  // keystroke belongs to the decorator.
  test('events retargeted to the editor root are ignored', () => {
    const {before, editor, onBeforeInput, onInput, root} = setup();
    dispatchInput(root);
    expect(onBeforeInput).not.toHaveBeenCalled();
    expect(onInput).not.toHaveBeenCalled();
    expect(editor.read(() => $getRoot().getTextContent())).toBe(before);
  });
});
