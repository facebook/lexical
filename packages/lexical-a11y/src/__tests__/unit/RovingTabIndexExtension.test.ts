/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {RovingTabIndexExtension} from '@lexical/a11y';
import {
  buildEditorFromExtensions,
  defineExtension,
  getExtensionDependencyFromEditor,
} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {configExtension} from 'lexical';
import {afterEach, describe, expect, test} from 'vitest';

function createToolbar(): HTMLDivElement {
  const toolbar = document.createElement('div');
  const a = document.createElement('button');
  a.textContent = 'a';
  const b = document.createElement('button');
  b.textContent = 'b';
  const c = document.createElement('button');
  c.textContent = 'c';
  toolbar.append(a, b, c);
  document.body.appendChild(toolbar);
  return toolbar;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('RovingTabIndexExtension', () => {
  test('container null leaves item tab indices untouched', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [RovingTabIndexExtension, RichTextExtension],
        name: '[root]',
      }),
    );
    void editor;
    const toolbar = createToolbar();
    const buttons = Array.from(toolbar.querySelectorAll('button'));
    // No tabIndex attribute applied while config.container is null.
    for (const btn of buttons) {
      expect(btn.tabIndex).toBe(0);
    }
  });

  test('applies tabindex=0 on the first item and -1 on the rest when container is set', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [RovingTabIndexExtension, RichTextExtension],
        name: '[root]',
      }),
    );
    const toolbar = createToolbar();
    const {container} = getExtensionDependencyFromEditor(
      editor,
      RovingTabIndexExtension,
    ).output;
    container.value = toolbar;

    const buttons = Array.from(toolbar.querySelectorAll('button'));
    expect(buttons[0].tabIndex).toBe(0);
    expect(buttons[1].tabIndex).toBe(-1);
    expect(buttons[2].tabIndex).toBe(-1);
  });

  test('ArrowRight moves focus to the next button (horizontal default)', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [RovingTabIndexExtension, RichTextExtension],
        name: '[root]',
      }),
    );
    const toolbar = createToolbar();
    const {container} = getExtensionDependencyFromEditor(
      editor,
      RovingTabIndexExtension,
    ).output;
    container.value = toolbar;

    const [a, b] = Array.from(
      toolbar.querySelectorAll<HTMLButtonElement>('button'),
    );
    a.focus();
    a.dispatchEvent(
      new KeyboardEvent('keydown', {bubbles: true, key: 'ArrowRight'}),
    );
    expect(document.activeElement).toBe(b);
    expect(b.tabIndex).toBe(0);
    expect(a.tabIndex).toBe(-1);
  });

  test('Home jumps to the first item from the middle', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [RovingTabIndexExtension, RichTextExtension],
        name: '[root]',
      }),
    );
    const toolbar = createToolbar();
    const {container} = getExtensionDependencyFromEditor(
      editor,
      RovingTabIndexExtension,
    ).output;
    container.value = toolbar;

    const [a, b] = Array.from(
      toolbar.querySelectorAll<HTMLButtonElement>('button'),
    );
    b.focus();
    b.dispatchEvent(new KeyboardEvent('keydown', {bubbles: true, key: 'Home'}));
    expect(document.activeElement).toBe(a);
  });

  test('vertical orientation responds to ArrowDown, not ArrowRight', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [
          configExtension(RovingTabIndexExtension, {orientation: 'vertical'}),
          RichTextExtension,
        ],
        name: '[root]',
      }),
    );
    const toolbar = createToolbar();
    const {container} = getExtensionDependencyFromEditor(
      editor,
      RovingTabIndexExtension,
    ).output;
    container.value = toolbar;

    const [a, b] = Array.from(
      toolbar.querySelectorAll<HTMLButtonElement>('button'),
    );
    a.focus();
    a.dispatchEvent(
      new KeyboardEvent('keydown', {bubbles: true, key: 'ArrowRight'}),
    );
    expect(document.activeElement).toBe(a);
    a.dispatchEvent(
      new KeyboardEvent('keydown', {bubbles: true, key: 'ArrowDown'}),
    );
    expect(document.activeElement).toBe(b);
  });
});
