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
import {getActiveElementDeep, KEY_DOWN_COMMAND} from 'lexical';
import {afterEach, describe, expect, onTestFinished, test} from 'vitest';

// A toolbar whose buttons live inside an open shadow root. Each button
// wraps an icon <span> so Escape can be dispatched from a descendant,
// exercising containsComposed(item, target). An explicit
// `toolbarItemSelector: 'button'` is used because jsdom does not resolve
// the default `:scope > button` selector inside a shadow root.
function createShadowToolbar(): {
  toolbar: HTMLDivElement;
  buttons: HTMLButtonElement[];
  icons: HTMLSpanElement[];
} {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = host.attachShadow({mode: 'open'});
  const toolbar = document.createElement('div');
  const buttons: HTMLButtonElement[] = [];
  const icons: HTMLSpanElement[] = [];
  for (const label of ['a', 'b']) {
    const btn = document.createElement('button');
    const icon = document.createElement('span');
    icon.textContent = label;
    btn.appendChild(icon);
    toolbar.appendChild(btn);
    buttons.push(btn);
    icons.push(icon);
  }
  root.appendChild(toolbar);
  return {buttons, icons, toolbar};
}

function buildFocusManagerEditor() {
  return buildEditorFromExtensions(
    defineExtension({
      dependencies: [FocusManagerExtension, RichTextExtension],
      name: '[root]',
    }),
  );
}

function getRegistry(editor: LexicalEditorWithDispose) {
  return getExtensionDependencyFromEditor(editor, FocusManagerExtension).output;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('FocusManagerExtension (shadow DOM)', () => {
  test('Alt+F10 focuses the first item of a shadow-hosted toolbar', () => {
    using editor = buildFocusManagerEditor();
    const {toolbar, buttons} = createShadowToolbar();
    onTestFinished(
      getRegistry(editor).register(toolbar, {toolbarItemSelector: 'button'}),
    );

    editor.dispatchCommand(
      KEY_DOWN_COMMAND,
      new KeyboardEvent('keydown', {altKey: true, key: 'F10'}),
    );

    expect(getActiveElementDeep(document)).toBe(buttons[0]);
  });

  test('Escape from a descendant of a shadow-hosted toolbar item returns focus to the editor root', () => {
    using editor = buildFocusManagerEditor();
    const {toolbar, icons} = createShadowToolbar();
    onTestFinished(
      getRegistry(editor).register(toolbar, {toolbarItemSelector: 'button'}),
    );

    const rootElement = document.createElement('div');
    rootElement.contentEditable = 'true';
    document.body.appendChild(rootElement);
    editor.setRootElement(rootElement);

    // Dispatch Escape from the icon <span> inside the toolbar button. The
    // handler must recognise it as a roving item via
    // containsComposed(button, span) — the `item === target` short-circuit
    // does not apply because the target is a descendant, not the item.
    icons[0].dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        composed: true,
        key: 'Escape',
      }),
    );

    expect(document.activeElement).toBe(rootElement);

    editor.setRootElement(null);
    rootElement.remove();
  });
});
