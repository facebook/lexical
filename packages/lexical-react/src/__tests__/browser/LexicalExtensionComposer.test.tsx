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
import {act, type ReactElement} from 'react';
import {createRoot} from 'react-dom/client';
import {describe, expect, onTestFinished, test} from 'vitest';

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

// Renders `ui` into a fresh container and unmounts when the test finishes.
// Cleanup uses onTestFinished rather than a `using`/Disposable helper because
// Explicit Resource Management is not supported in WebKit/Safari yet (see
// AGENTS.md). document.body is reset between tests, so the container itself
// needs no explicit removal.
function renderReact(ui: ReactElement): {container: HTMLElement} {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  onTestFinished(() => {
    act(() => {
      root.unmount();
    });
  });
  return {container};
}

describe('LexicalExtensionComposer (browser)', () => {
  test('renders a real contentEditable with the initial editor state', () => {
    const {container} = renderReact(
      <LexicalExtensionComposer extension={extension} />,
    );
    const contentEditable = container.querySelector(
      '[contenteditable="true"]',
    ) as HTMLElement | null;
    expect(contentEditable).not.toBeNull();
    expect(contentEditable!.textContent).toBe('Composed in the browser');
    // Real layout: jsdom would report a zero-height box here.
    expect(contentEditable!.getBoundingClientRect().height).toBeGreaterThan(0);
  });
});
