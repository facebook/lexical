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
  document.body.replaceChildren();
});

describe('FocusTrapExtension', () => {
  test('empty containers map keeps the trap inert', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [FocusTrapExtension, RichTextExtension],
        name: '[root]',
      }),
    );
    void editor;
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });

  test('activates when a container is added to the map', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [FocusTrapExtension, RichTextExtension],
        name: '[root]',
      }),
    );
    const container = createContainer();
    const {containers} = getExtensionDependencyFromEditor(
      editor,
      FocusTrapExtension,
    ).output;
    containers.value = new Map([[container, {}]]);
    expect(document.activeElement).toBe(container.querySelector('button'));
  });

  test('initialFocus="container" lands focus on the container itself', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [FocusTrapExtension, RichTextExtension],
        name: '[root]',
      }),
    );
    const container = createContainer();
    const {containers} = getExtensionDependencyFromEditor(
      editor,
      FocusTrapExtension,
    ).output;
    containers.value = new Map([[container, {initialFocus: 'container'}]]);
    expect(document.activeElement).toBe(container);
  });

  test('deactivates when the container is removed from the map', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [FocusTrapExtension, RichTextExtension],
        name: '[root]',
      }),
    );
    const container = createContainer();
    const {containers} = getExtensionDependencyFromEditor(
      editor,
      FocusTrapExtension,
    ).output;
    containers.value = new Map([[container, {}]]);
    expect(document.activeElement).toBe(container.querySelector('button'));

    containers.value = new Map();
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
    const {containers} = getExtensionDependencyFromEditor(
      editor,
      FocusTrapExtension,
    ).output;
    containers.value = new Map([[container, {}]]);

    first.focus();
    first.dispatchEvent(
      new KeyboardEvent('keydown', {bubbles: true, key: 'Tab'}),
    );
    expect(document.activeElement).toBe(second);
  });
});
