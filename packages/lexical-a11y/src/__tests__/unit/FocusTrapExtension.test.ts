/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {FocusTrapExtension} from '@lexical/a11y';
import {
  buildEditorFromExtensions,
  defineExtension,
  getExtensionDependencyFromEditor,
} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {configExtension} from 'lexical';
import {afterEach, describe, expect, test} from 'vitest';

function createContainer(): HTMLDivElement {
  const container = document.createElement('div');
  container.tabIndex = -1;
  const first = document.createElement('button');
  first.textContent = 'first';
  const second = document.createElement('button');
  second.textContent = 'second';
  container.append(first, second);
  document.body.appendChild(container);
  return container;
}

afterEach(() => {
  for (const div of Array.from(document.body.querySelectorAll('div'))) {
    div.remove();
  }
});

describe('FocusTrapExtension', () => {
  test('container null keeps the trap inert', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [FocusTrapExtension, RichTextExtension],
        name: '[root]',
      }),
    );
    editor.getEditorState();
    // No DOM listeners installed when container is null.
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });

  test('activates when the container signal switches to a real element', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [FocusTrapExtension, RichTextExtension],
        name: '[root]',
      }),
    );
    const container = createContainer();
    const {container: containerSignal} = getExtensionDependencyFromEditor(
      editor,
      FocusTrapExtension,
    ).output;
    containerSignal.value = container;
    // initialFocus default is 'firstFocusable'.
    expect(document.activeElement).toBe(container.querySelector('button'));
  });

  test('initialFocus="container" lands focus on the container itself', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [
          configExtension(FocusTrapExtension, {initialFocus: 'container'}),
          RichTextExtension,
        ],
        name: '[root]',
      }),
    );
    const container = createContainer();
    const {container: containerSignal} = getExtensionDependencyFromEditor(
      editor,
      FocusTrapExtension,
    ).output;
    containerSignal.value = container;
    expect(document.activeElement).toBe(container);
  });

  test('deactivates when the container signal is reset to null', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [FocusTrapExtension, RichTextExtension],
        name: '[root]',
      }),
    );
    const container = createContainer();
    const {container: containerSignal} = getExtensionDependencyFromEditor(
      editor,
      FocusTrapExtension,
    ).output;
    containerSignal.value = container;
    expect(document.activeElement).toBe(container.querySelector('button'));

    containerSignal.value = null;
    // Outside element can take focus without being yanked back.
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });

  test('Tab inside the container cycles to the next focusable', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [FocusTrapExtension, RichTextExtension],
        name: '[root]',
      }),
    );
    const container = createContainer();
    const [first, second] = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button'),
    );
    const {container: containerSignal} = getExtensionDependencyFromEditor(
      editor,
      FocusTrapExtension,
    ).output;
    containerSignal.value = container;

    first.focus();
    first.dispatchEvent(
      new KeyboardEvent('keydown', {bubbles: true, key: 'Tab'}),
    );
    expect(document.activeElement).toBe(second);
  });
});
