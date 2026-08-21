/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {FocusManagerExtension} from '@lexical/a11y';
import {
  buildEditorFromExtensions,
  defineExtension,
  getExtensionDependencyFromEditor,
  type LexicalEditorWithDispose,
} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {KEY_DOWN_COMMAND} from 'lexical';
import {afterEach, describe, expect, onTestFinished, test} from 'vitest';

function createToolbar(): HTMLDivElement {
  const toolbar = document.createElement('div');
  const a = document.createElement('button');
  a.textContent = 'a';
  const b = document.createElement('button');
  b.textContent = 'b';
  toolbar.append(a, b);
  document.body.appendChild(toolbar);
  return toolbar;
}

function getRegistry(editor: LexicalEditorWithDispose) {
  return getExtensionDependencyFromEditor(editor, FocusManagerExtension).output;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('FocusManagerExtension', () => {
  test('no registered toolbar leaves Alt+F10 a no-op (no focus move)', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [FocusManagerExtension, RichTextExtension],
        name: '[root]',
      }),
    );
    const sink = document.createElement('button');
    document.body.appendChild(sink);
    sink.focus();
    editor.dispatchCommand(
      KEY_DOWN_COMMAND,
      new KeyboardEvent('keydown', {altKey: true, key: 'F10'}),
    );
    expect(document.activeElement).toBe(sink);
    sink.remove();
  });

  test('Alt+F10 focuses the toolbar first item when toolbar is registered', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [FocusManagerExtension, RichTextExtension],
        name: '[root]',
      }),
    );
    const toolbar = createToolbar();
    onTestFinished(getRegistry(editor).register(toolbar));

    editor.dispatchCommand(
      KEY_DOWN_COMMAND,
      new KeyboardEvent('keydown', {altKey: true, key: 'F10'}),
    );
    expect(document.activeElement).toBe(toolbar.querySelector('button'));
  });

  test('Escape on the toolbar returns focus to the editor root', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [FocusManagerExtension, RichTextExtension],
        name: '[root]',
      }),
    );
    const toolbar = createToolbar();
    onTestFinished(getRegistry(editor).register(toolbar));

    const rootElement = document.createElement('div');
    rootElement.contentEditable = 'true';
    document.body.appendChild(rootElement);
    editor.setRootElement(rootElement);

    const firstItem = toolbar.querySelector<HTMLButtonElement>('button')!;
    firstItem.focus();
    firstItem.dispatchEvent(
      new KeyboardEvent('keydown', {bubbles: true, key: 'Escape'}),
    );

    expect(document.activeElement).toBe(rootElement);
    editor.setRootElement(null);
    rootElement.remove();
  });

  test('deactivates when the registration is disposed', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [FocusManagerExtension, RichTextExtension],
        name: '[root]',
      }),
    );
    const toolbar = createToolbar();
    const dispose = getRegistry(editor).register(toolbar);
    editor.dispatchCommand(
      KEY_DOWN_COMMAND,
      new KeyboardEvent('keydown', {altKey: true, key: 'F10'}),
    );
    expect(document.activeElement).toBe(toolbar.querySelector('button'));

    dispose();
    const sink = document.createElement('button');
    document.body.appendChild(sink);
    sink.focus();
    editor.dispatchCommand(
      KEY_DOWN_COMMAND,
      new KeyboardEvent('keydown', {altKey: true, key: 'F10'}),
    );
    expect(document.activeElement).toBe(sink);
    sink.remove();
  });
});
