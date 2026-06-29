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
import {getActiveElementDeep} from 'lexical';
import {afterEach, describe, expect, test} from 'vitest';

// Builds a roving toolbar of three buttons *inside* an open shadow root.
// Arrow-key navigation reads the active item via getActiveElementDeep; under
// a naive `document.activeElement` read the active element would resolve to
// the host (outside the toolbar) and navigation would not advance, so these
// tests fail unless the composed-tree helper is used.
function createShadowToolbar(): {
  host: HTMLDivElement;
  root: ShadowRoot;
  toolbar: HTMLDivElement;
  buttons: HTMLButtonElement[];
} {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = host.attachShadow({mode: 'open'});
  const toolbar = document.createElement('div');
  const buttons = ['a', 'b', 'c'].map(label => {
    const btn = document.createElement('button');
    btn.textContent = label;
    toolbar.appendChild(btn);
    return btn;
  });
  root.appendChild(toolbar);
  return {buttons, host, root, toolbar};
}

function buildRovingEditor() {
  return buildEditorFromExtensions(
    defineExtension({
      dependencies: [RovingTabIndexExtension, RichTextExtension],
      name: '[root]',
    }),
  );
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('RovingTabIndexExtension (shadow DOM)', () => {
  test('applies the roving tabindex pattern to items inside a shadow root', () => {
    using editor = buildRovingEditor();
    const {toolbar, buttons} = createShadowToolbar();
    const {containers} = getExtensionDependencyFromEditor(
      editor,
      RovingTabIndexExtension,
    ).output;

    containers.value = new Map([
      [toolbar, {itemSelector: 'button', orientation: 'horizontal'}],
    ]);

    expect(buttons.map(b => b.tabIndex)).toEqual([0, -1, -1]);
  });

  test('ArrowRight moves focus to the next item across the shadow boundary', () => {
    using editor = buildRovingEditor();
    const {toolbar, buttons} = createShadowToolbar();
    const {containers} = getExtensionDependencyFromEditor(
      editor,
      RovingTabIndexExtension,
    ).output;
    containers.value = new Map([
      [toolbar, {itemSelector: 'button', orientation: 'horizontal'}],
    ]);

    const [a, b] = buttons;
    a.focus();
    a.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        composed: true,
        key: 'ArrowRight',
      }),
    );

    expect(getActiveElementDeep(document)).toBe(b);
    expect(b.tabIndex).toBe(0);
    expect(a.tabIndex).toBe(-1);
  });

  test('ArrowLeft from the first item wraps to the last across the shadow boundary', () => {
    using editor = buildRovingEditor();
    const {toolbar, buttons} = createShadowToolbar();
    const {containers} = getExtensionDependencyFromEditor(
      editor,
      RovingTabIndexExtension,
    ).output;
    containers.value = new Map([
      [toolbar, {itemSelector: 'button', orientation: 'horizontal'}],
    ]);

    const [a, , c] = buttons;
    a.focus();
    a.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        composed: true,
        key: 'ArrowLeft',
      }),
    );

    expect(getActiveElementDeep(document)).toBe(c);
    expect(c.tabIndex).toBe(0);
  });

  test('End jumps to the last item across the shadow boundary', () => {
    using editor = buildRovingEditor();
    const {toolbar, buttons} = createShadowToolbar();
    const {containers} = getExtensionDependencyFromEditor(
      editor,
      RovingTabIndexExtension,
    ).output;
    containers.value = new Map([
      [toolbar, {itemSelector: 'button', orientation: 'horizontal'}],
    ]);

    const [a, , c] = buttons;
    a.focus();
    a.dispatchEvent(
      new KeyboardEvent('keydown', {bubbles: true, composed: true, key: 'End'}),
    );

    expect(getActiveElementDeep(document)).toBe(c);
  });
});
