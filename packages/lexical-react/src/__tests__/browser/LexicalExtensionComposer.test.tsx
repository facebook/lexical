/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {defineExtension} from '@lexical/extension';
import {LexicalExtensionComposer} from '@lexical/react/LexicalExtensionComposer';
import {RichTextExtension} from '@lexical/rich-text';
import {$createParagraphNode, $createTextNode, $getRoot} from 'lexical';
import * as React from 'react';
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, describe, expect, test} from 'vitest';

function $prepopulate(): void {
  $getRoot().append(
    $createParagraphNode().append($createTextNode('Composed in the browser')),
  );
}

// Module-scoped so the extension argument is stable across renders, as the
// LexicalExtensionComposer contract requires.
const extension = defineExtension({
  $initialEditorState: $prepopulate,
  dependencies: [RichTextExtension],
  name: '[root]',
});

let container: HTMLDivElement | null = null;
let root: Root | null = null;

afterEach(() => {
  if (root) {
    const currentRoot = root;
    act(() => currentRoot.unmount());
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
});

function render(ui: React.ReactElement): HTMLElement {
  container = document.createElement('div');
  document.body.appendChild(container);
  const currentContainer = container;
  act(() => {
    root = createRoot(currentContainer);
    root.render(ui);
  });
  return currentContainer;
}

describe('LexicalExtensionComposer (browser)', () => {
  test('renders a real contentEditable with the initial editor state', () => {
    const el = render(<LexicalExtensionComposer extension={extension} />);
    const contentEditable = el.querySelector(
      '[contenteditable="true"]',
    ) as HTMLElement | null;
    expect(contentEditable).not.toBeNull();
    expect(contentEditable!.textContent).toBe('Composed in the browser');
    // Real layout: jsdom would report a zero-height box here.
    expect(contentEditable!.getBoundingClientRect().height).toBeGreaterThan(0);
  });
});
