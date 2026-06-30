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
  type LexicalEditorWithDispose,
} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {getActiveElementDeep} from 'lexical';
import {afterEach, describe, expect, onTestFinished, test} from 'vitest';

interface ShadowFixture {
  host: HTMLDivElement;
  root: ShadowRoot;
  opener: HTMLButtonElement;
  container: HTMLDivElement;
  first: HTMLButtonElement;
  second: HTMLButtonElement;
}

// Builds a trap container with two focusable buttons *inside* an open
// shadow root, plus an "opener" button (also inside the shadow root) that
// holds focus before the trap activates. Because focus lives inside a
// shadow tree, `document.activeElement` resolves to the host and
// `document.contains()` cannot see these nodes — only the composed-tree
// helpers (getActiveElementDeep / containsComposed / getComposedEventTarget)
// resolve them correctly, so these tests fail if the implementation falls
// back to the naive light-DOM reads.
function createShadowFixture(): ShadowFixture {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = host.attachShadow({mode: 'open'});

  const opener = document.createElement('button');
  opener.textContent = 'opener';

  const container = document.createElement('div');
  container.tabIndex = -1;
  const first = document.createElement('button');
  first.textContent = 'first';
  const second = document.createElement('button');
  second.textContent = 'second';
  container.append(first, second);

  root.append(opener, container);
  return {container, first, host, opener, root, second};
}

function buildTrapEditor() {
  return buildEditorFromExtensions(
    defineExtension({
      dependencies: [FocusTrapExtension, RichTextExtension],
      name: '[root]',
    }),
  );
}

function getRegistry(editor: LexicalEditorWithDispose) {
  return getExtensionDependencyFromEditor(editor, FocusTrapExtension).output;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('FocusTrapExtension (shadow DOM)', () => {
  test('initial focus lands on the first focusable inside the shadow root', () => {
    using editor = buildTrapEditor();
    const {container, first} = createShadowFixture();

    onTestFinished(getRegistry(editor).register(container));

    // document.activeElement is the host; the real focus is the inner button.
    expect(getActiveElementDeep(document)).toBe(first);
  });

  test('Tab cycles to the next focusable across the shadow boundary', () => {
    using editor = buildTrapEditor();
    const {container, first, second} = createShadowFixture();
    onTestFinished(getRegistry(editor).register(container));

    first.focus();
    first.dispatchEvent(
      new KeyboardEvent('keydown', {bubbles: true, composed: true, key: 'Tab'}),
    );
    // Relies on getActiveElementDeep to read `first` (not the host) as the
    // active item and containsComposed to confirm it is inside the container.
    expect(getActiveElementDeep(document)).toBe(second);
  });

  test('Shift+Tab from the first item wraps to the last across the shadow boundary', () => {
    using editor = buildTrapEditor();
    const {container, first, second} = createShadowFixture();
    onTestFinished(getRegistry(editor).register(container));

    first.focus();
    first.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        composed: true,
        key: 'Tab',
        shiftKey: true,
      }),
    );
    expect(getActiveElementDeep(document)).toBe(second);
  });

  test('focus is restored to the previously-focused element inside the shadow root on deactivate', () => {
    using editor = buildTrapEditor();
    const {container, first, opener} = createShadowFixture();

    // Focus the opener *inside the shadow tree* before the trap activates.
    opener.focus();
    expect(getActiveElementDeep(document)).toBe(opener);

    const dispose = getRegistry(editor).register(container);
    expect(getActiveElementDeep(document)).toBe(first);

    // Deactivate — restoration must walk the composed tree to recognise the
    // opener as still connected (document.contains() would say false).
    dispose();
    expect(getActiveElementDeep(document)).toBe(opener);
  });

  test('focusin from outside the shadow host is pulled back inside the container', () => {
    using editor = buildTrapEditor();
    const {container, first} = createShadowFixture();
    onTestFinished(getRegistry(editor).register(container));

    const outside = document.createElement('button');
    outside.textContent = 'outside';
    document.body.appendChild(outside);

    outside.focus();
    outside.dispatchEvent(
      new FocusEvent('focusin', {bubbles: true, composed: true}),
    );

    // The document-level focusin safety net pulls focus back to the first
    // focusable inside the (shadow-hosted) container.
    expect(getActiveElementDeep(document)).toBe(first);
  });

  test('focusin retargeted to a foreign shadow host is resolved via composedPath and pulled back', () => {
    using editor = buildTrapEditor();
    const {container, first} = createShadowFixture();
    onTestFinished(getRegistry(editor).register(container));

    // Focus lands inside a *different* shadow tree, so the document-level
    // focusin sees event.target retargeted to the foreign host. The handler
    // must use getComposedEventTarget (composedPath) to see the real inner
    // element and recognise it is outside the trap container.
    const foreignHost = document.createElement('div');
    document.body.appendChild(foreignHost);
    const foreignRoot = foreignHost.attachShadow({mode: 'open'});
    const foreignButton = document.createElement('button');
    foreignButton.textContent = 'foreign';
    foreignRoot.appendChild(foreignButton);

    foreignButton.focus();
    foreignButton.dispatchEvent(
      new FocusEvent('focusin', {bubbles: true, composed: true}),
    );

    expect(getActiveElementDeep(document)).toBe(first);
  });
});
